"""
POLARIS-X Spatial Navigation Risk Grid Engine
Generates discrete 2D spatial risk lattices combining:
1. Sea-Ice concentration field & climate anomaly (R_ice) across 360°
2. Anisotropic Iceberg collision danger fields with drift velocity elongation (R_berg)
3. Synoptic Meteorological impedance interpolated via IDW (R_wx)
4. Full Pan-Antarctic 360° Continental Coastline Navigability Mask
"""

import math
from typing import Dict, List, Optional, Tuple
import numpy as np
from app.core.config import settings
from app.data.loaders import dataset_loader, IcebergObservation, WeatherStationReading

def haversine_distance_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Great-Circle distance in Nautical Miles between coordinate pairs with longitudinal wrap-around."""
    r_earth_nm = 3440.065
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    
    # Longitudinal difference wrapped to [-180, 180]
    dlon = ((lon2 - lon1 + 180.0) % 360.0) - 180.0
    dlambda = math.radians(dlon)
    
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    a = min(1.0, max(0.0, a))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return float(r_earth_nm * c)

def get_antarctic_coast_lat(lon: float) -> float:
    """
    Returns approximate coastal boundary latitude (deg S) for any longitude in [-180, 180].
    Used to build the continuous Pan-Antarctic continental landmask.
    """
    l = ((lon + 180.0) % 360.0) - 180.0
    
    # 1. Antarctic Peninsula (Graham Land & Palmer Land: -75°W to -56°W)
    if -75.0 <= l <= -56.0:
        if l <= -68.0:
            return -70.5 + 2.5 * ((l - (-75.0)) / 7.0)
        elif l <= -62.0:
            return -68.0 + 3.8 * ((l - (-68.0)) / 6.0)
        else:
            return -64.2 + 0.8 * ((l - (-62.0)) / 6.0)
            
    # 2. Weddell Sea / Ronne & Filchner Ice Shelf (-56°W to -20°W)
    if -56.0 < l <= -20.0:
        if l <= -38.0:
            return -74.0 - 3.5 * ((l - (-56.0)) / 18.0)
        else:
            return -77.5 + 3.5 * ((l - (-38.0)) / 18.0)
            
    # 3. Queen Maud Land (-20°W to +45°E) - Maitri & Dakshin Gangotri Sector
    if -20.0 < l <= 45.0:
        return -71.2 + 1.8 * math.sin((l + 20.0) / 65.0 * math.pi)
        
    # 4. Enderby & Kemp Land (+45°E to +70°E) - Mawson Station Sector
    if 45.0 < l <= 70.0:
        return -67.4 - 0.6 * math.sin((l - 45.0) / 25.0 * math.pi)
        
    # 5. Princess Elizabeth Land & Prydz Bay (+70°E to +85°E) - Bharati & Davis Bases
    if 70.0 < l <= 85.0:
        return -67.8 - 1.8 * math.sin((l - 70.0) / 15.0 * math.pi)
        
    # 6. Queen Mary & Wilkes Land (+85°E to +140°E) - Casey Station Sector
    if 85.0 < l <= 140.0:
        return -66.2 - 0.7 * math.sin((l - 85.0) / 55.0 * math.pi)
        
    # 7. George V Land & Victoria Land (+140°E to +170°E)
    if 140.0 < l <= 170.0:
        return -67.0 - 4.2 * ((l - 140.0) / 30.0)
        
    # 8. Ross Ice Shelf & McMurdo Sound (+170°E to -150°W)
    if l > 170.0 or l <= -150.0:
        return -78.4
        
    # 9. Marie Byrd Land (-150°W to -90°W) - Amundsen Sea Coast
    if -150.0 < l <= -90.0:
        return -74.2 + 1.4 * math.sin((l - (-150.0)) / 60.0 * math.pi)
        
    # 10. Ellsworth Land & Bellingshausen Sea (-90°W to -75°W)
    if -90.0 < l <= -75.0:
        return -72.8 - 0.6 * ((l - (-90.0)) / 15.0)
        
    return -70.0

def is_antarctic_landmass(lat: float, lon: float) -> bool:
    """
    Checks if a geographic (lat, lon) lies within the impassable Antarctic continental ice cap.
    Leaves coastal roadsteads, sea-ice channels, and open ocean navigable.
    """
    # Open Southern Ocean north of -60°S is always navigable
    if lat > -60.0:
        return False

    # Check against station roadsteads / berth locations (keep station coordinates accessible)
    for st_name, (st_lat, st_lon) in settings.STATIONS.items():
        if haversine_distance_nm(lat, lon, st_lat, st_lon) <= 22.0:
            return False

    coast_lat = get_antarctic_coast_lat(lon)
    # Inland of continental coastline is impassable land
    if lat < coast_lat - 0.35:
        return True

    # Peninsula spine check
    if -73.0 <= lat <= -63.2:
        if -72.0 <= lon <= -58.0:
            if lat > -63.6 and lon > -58.5:
                return False  # Tip passage
            spine_center_lon = -64.0 + 1.9 * (lat - (-67.0)) if lat > -67.0 else -67.0 + 0.5 * (lat - (-73.0))
            if abs(lon - spine_center_lon) <= 2.2:
                return True

    return False

class SpatialRiskGrid:
    def __init__(
        self,
        min_lat: float = settings.MIN_LAT,
        max_lat: float = settings.MAX_LAT,
        min_lon: float = settings.MIN_LON,
        max_lon: float = settings.MAX_LON,
        step_deg: float = settings.GRID_STEP_DEG
    ):
        self.min_lat = min_lat
        self.max_lat = max_lat
        self.min_lon = min_lon
        self.max_lon = max_lon
        self.step = step_deg

        self.lats = np.arange(min_lat, max_lat + step_deg / 2.0, step_deg)
        # 360° grid spanning [-180, 180)
        self.lons = np.arange(min_lon, max_lon, step_deg)
        self.n_rows = len(self.lats)
        self.n_cols = len(self.lons)

        # Precomputed Land/Navigability Mask (True = Navigable ocean, False = Impassable land)
        self.navigable_mask = np.ones((self.n_rows, self.n_cols), dtype=bool)
        for r, lat in enumerate(self.lats):
            for c, lon in enumerate(self.lons):
                if is_antarctic_landmass(lat, lon):
                    self.navigable_mask[r, c] = False

    def coord_to_indices(self, lat: float, lon: float) -> Tuple[int, int]:
        """Convert continuous (lat, lon) to nearest discrete grid indices (r, c) with 360° normalization."""
        norm_lon = ((lon + 180.0) % 360.0) - 180.0
        r = int(np.clip(round((lat - self.min_lat) / self.step), 0, self.n_rows - 1))
        c = int(np.clip(round((norm_lon - self.min_lon) / self.step), 0, self.n_cols - 1))
        return r, c

    def indices_to_coord(self, r: int, c: int) -> Tuple[float, float]:
        """Convert discrete grid indices (r, c) to geographic centroid (lat, lon) with wrap-around."""
        lat = float(self.lats[int(np.clip(r, 0, self.n_rows - 1))])
        lon = float(self.lons[c % self.n_cols])
        return lat, lon

    def compute_risk_grid(
        self,
        simulation_date_iso: str = "2021-03-15",
        w_ice: float = settings.W_ICE,
        w_berg: float = settings.W_BERG,
        w_wx: float = settings.W_WX,
        surge_berg_id: Optional[str] = None,
        surge_speed_multiplier: float = 1.0,
        surge_heading_deg: Optional[float] = None
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Compute continuous composite risk fields across the 360° 2D lattice.
        Returns: (total_risk_grid, ice_risk_grid, berg_risk_grid, wx_risk_grid)
        """
        # Normalize weights
        total_w = w_ice + w_berg + w_wx
        w_ice /= total_w
        w_berg /= total_w
        w_wx /= total_w

        # 1. Base Sea-Ice Concentration Field (R_ice) across 360°
        ice_risk_grid = np.zeros((self.n_rows, self.n_cols), dtype=np.float32)
        month = int(simulation_date_iso.split("-")[1]) if "-" in simulation_date_iso else 3
        climatology = dataset_loader.load_sea_ice_climatology()
        month_mean_extent = climatology.get(month, 5.0)
        season_scale = float(month_mean_extent / 10.0)

        for r, lat in enumerate(self.lats):
            # Southward gradient: ice concentration increases approaching Antarctica
            southness = ((-55.0 - lat) / 25.0)  # 0.0 at -55°S, 1.0 at -80°S
            base_ice = float(np.clip(southness * season_scale * 0.85, 0.05, 0.95))
            for c, lon in enumerate(self.lons):
                # Regional boosts (Weddell Gyre & Ross Sea Pack Ice)
                regional_boost = 0.0
                if -60.0 <= lon <= -20.0 and lat <= -65.0:
                    regional_boost = 0.15 * ((-65.0 - lat) / 15.0)  # Weddell
                elif (lon >= 160.0 or lon <= -160.0) and lat <= -70.0:
                    regional_boost = 0.12 * ((-70.0 - lat) / 12.0)  # Ross Sea
                
                ice_risk_grid[r, c] = min(0.95, base_ice + regional_boost)

        # 2. Iceberg Hazard Collision Field (R_berg)
        berg_risk_grid = np.zeros((self.n_rows, self.n_cols), dtype=np.float32)
        active_icebergs = dataset_loader.get_active_icebergs_for_date(simulation_date_iso)

        for berg in active_icebergs:
            b_lat = berg.lat
            b_lon = berg.lon
            b_speed = berg.disp_km_day
            b_heading = berg.vel_angle_deg
            b_len_nm = max(berg.length_nm, 10.0)
            b_wid_nm = max(berg.width_nm, 5.0)

            # Apply dynamic surge simulation if triggered
            if surge_berg_id and berg.iceberg_id == surge_berg_id.upper():
                b_speed *= surge_speed_multiplier
                if surge_heading_deg is not None:
                    b_heading = surge_heading_deg

            # Heading vector components (degrees to nautical displacement)
            heading_rad = math.radians(b_heading)
            drift_dx = math.sin(heading_rad)  # East
            drift_dy = math.cos(heading_rad)  # North

            # Bounding box of influence (~35 NM radius)
            search_radius_deg = max(1.5, (b_len_nm / 60.0) * 2.0)
            r_min, c_min = self.coord_to_indices(b_lat - search_radius_deg, b_lon - search_radius_deg * 2.5)
            r_max, c_max = self.coord_to_indices(b_lat + search_radius_deg, b_lon + search_radius_deg * 2.5)

            sigma_perp = (b_wid_nm / 2.0) + 4.0
            sigma_parallel = (b_len_nm / 2.0) + (b_speed * 1.5) + 6.0

            r_start = min(r_min, r_max)
            r_end = max(r_min, r_max)

            for r in range(r_start, r_end + 1):
                # Search span across columns with wrap-around
                col_span = int(round(search_radius_deg * 3.0 / self.step))
                for dc in range(-col_span, col_span + 1):
                    c = (c_min + dc) % self.n_cols
                    c_lat, c_lon = self.indices_to_coord(r, c)
                    dist_nm = haversine_distance_nm(c_lat, c_lon, b_lat, b_lon)
                    
                    if dist_nm <= (b_len_nm / 2.0):
                        berg_risk_grid[r, c] = max(berg_risk_grid[r, c], 0.98)
                    elif dist_nm <= 45.0:
                        dy_nm = (c_lat - b_lat) * 60.0
                        dlon_wrapped = ((c_lon - b_lon + 180.0) % 360.0) - 180.0
                        dx_nm = dlon_wrapped * 60.0 * math.cos(math.radians(b_lat))
                        
                        d_parallel = dx_nm * drift_dx + dy_nm * drift_dy
                        d_perp = -dx_nm * drift_dy + dy_nm * drift_dx

                        eff_sigma_par = sigma_parallel * 0.6 if d_parallel < 0 else sigma_parallel * 1.4
                        exponent = - ((d_perp ** 2) / (2.0 * sigma_perp ** 2) + (d_parallel ** 2) / (2.0 * eff_sigma_par ** 2))
                        hazard_val = math.exp(np.clip(exponent, -20.0, 0.0))
                        berg_risk_grid[r, c] = max(berg_risk_grid[r, c], float(hazard_val))

        # 3. Meteorological Weather Field (R_wx) via IDW across stations
        wx_risk_grid = np.zeros((self.n_rows, self.n_cols), dtype=np.float32)
        station_readings = dataset_loader.get_station_weather_snapshot(simulation_date_iso)

        if station_readings:
            st_lats = np.array([st.lat for st in station_readings])
            st_lons = np.array([st.lon for st in station_readings])
            st_winds = np.array([st.wind_speed_knots for st in station_readings])
            st_press = np.array([st.pressure_hpa for st in station_readings])

            st_risks = []
            for w, p in zip(st_winds, st_press):
                wind_risk = 0.1 * (w / 25.0) if w <= 25.0 else min(1.0, 0.1 + 0.9 * ((w - 25.0) / 35.0) ** 1.5)
                press_risk = min(1.0, max(0.0, (1013.0 - p) / 45.0))
                st_risks.append(0.6 * wind_risk + 0.4 * press_risk)
            st_risks = np.array(st_risks)

            for r, lat in enumerate(self.lats):
                cos_lat = math.cos(math.radians(lat))
                for c, lon in enumerate(self.lons):
                    dlon_arr = ((st_lons - lon + 180.0) % 360.0) - 180.0
                    dists_deg = np.sqrt((st_lats - lat) ** 2 + (dlon_arr * cos_lat) ** 2)
                    dists_deg = np.maximum(dists_deg, 0.20)
                    weights = 1.0 / (dists_deg ** 2.0)
                    idw_risk = np.sum(weights * st_risks) / np.sum(weights)
                    wx_risk_grid[r, c] = float(np.clip(idw_risk, 0.05, 0.90))
        else:
            wx_risk_grid.fill(0.20)

        # 4. Composite Risk Field
        total_risk_grid = (
            w_ice * ice_risk_grid +
            w_berg * berg_risk_grid +
            w_wx * wx_risk_grid
        )
        total_risk_grid = np.clip(total_risk_grid, 0.0, 1.0)

        # Landmass cells receive impassable barrier risk
        total_risk_grid[~self.navigable_mask] = 1.0

        return total_risk_grid, ice_risk_grid, berg_risk_grid, wx_risk_grid

# Global shared risk grid engine
risk_grid_engine = SpatialRiskGrid()
