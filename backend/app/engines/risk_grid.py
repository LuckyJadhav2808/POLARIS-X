"""
POLARIS-X Spatial Navigation Risk Grid Engine
Generates discrete 2D spatial risk lattices combining:
1. Sea-Ice concentration field & climate anomaly (R_ice)
2. Anisotropic Iceberg collision danger fields with drift velocity elongation (R_berg)
3. Synoptic Meteorological impedance interpolated via IDW (R_wx)
"""

import math
from typing import Dict, List, Optional, Tuple
import numpy as np
from app.core.config import settings
from app.data.loaders import dataset_loader, IcebergObservation, WeatherStationReading

def haversine_distance_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Great-Circle distance in Nautical Miles between coordinate pairs."""
    r_earth_nm = 3440.065
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return float(r_earth_nm * c)

def is_antarctic_landmass(lat: float, lon: float) -> bool:
    """
    Approximates the Antarctic Peninsula spine and continental land boundaries.
    Ensures navigable passages through Bransfield Strait, Drake Passage, and Scotia Sea.
    """
    # Continental Antarctic Ice Sheet (South of -75°S inland)
    if lat <= -74.5 and -65.0 <= lon <= -30.0:
        # Ronne / Filchner Ice Shelf interior (impassable land/ice shelf)
        if lat <= -76.0 and lon >= -60.0 and lon <= -35.0:
            return True

    # Antarctic Peninsula Spine (Graham Land / Palmer Land) - Curved Crescent
    if -73.0 <= lat <= -63.2:
        if lat <= -67.0:
            # Palmer Land section
            spine_center_lon = -67.0 + 0.5 * (lat - (-73.0))
        else:
            # Graham Land / Trinity Peninsula section
            spine_center_lon = -64.0 + 1.9 * (lat - (-67.0))
        
        # Peninsula width ~3.0 degrees longitude
        if abs(lon - spine_center_lon) <= 3.0:
            # Keep Bransfield Strait and coastal tip sounds navigable
            if lat > -63.8 and lon > -58.5:
                return False  # Joinville / D'Urville passages open
            return True

    # Alexander Island (Lat -71S to -73S, Lon -72W to -68W)
    if -73.0 <= lat <= -70.8 and -71.5 <= lon <= -68.5:
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
        self.lons = np.arange(min_lon, max_lon + step_deg / 2.0, step_deg)
        self.n_rows = len(self.lats)
        self.n_cols = len(self.lons)

        # Precomputed Land/Navigability Mask (True = Navigable ocean, False = Impassable land)
        self.navigable_mask = np.ones((self.n_rows, self.n_cols), dtype=bool)
        for r, lat in enumerate(self.lats):
            for c, lon in enumerate(self.lons):
                if is_antarctic_landmass(lat, lon):
                    self.navigable_mask[r, c] = False

    def coord_to_indices(self, lat: float, lon: float) -> Tuple[int, int]:
        """Convert continuous (lat, lon) to nearest discrete grid indices (r, c)."""
        r = int(np.clip(round((lat - self.min_lat) / self.step), 0, self.n_rows - 1))
        c = int(np.clip(round((lon - self.min_lon) / self.step), 0, self.n_cols - 1))
        return r, c

    def indices_to_coord(self, r: int, c: int) -> Tuple[float, float]:
        """Convert discrete grid indices (r, c) to geographic centroid (lat, lon)."""
        lat = float(self.lats[r])
        lon = float(self.lons[c])
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
        Compute continuous composite risk fields across the 2D lattice.
        Returns: (total_risk_grid, ice_risk_grid, berg_risk_grid, wx_risk_grid)
        """
        # Normalize weights
        total_w = w_ice + w_berg + w_wx
        w_ice /= total_w
        w_berg /= total_w
        w_wx /= total_w

        # 1. Base Sea-Ice Concentration Field (R_ice)
        ice_risk_grid = np.zeros((self.n_rows, self.n_cols), dtype=np.float32)
        month = int(simulation_date_iso.split("-")[1]) if "-" in simulation_date_iso else 3
        climatology = dataset_loader.load_sea_ice_climatology()
        month_mean_extent = climatology.get(month, 5.0)
        # Seasonal multiplier scaled against annual mean (~10M sq km)
        season_scale = float(month_mean_extent / 10.0)

        for r, lat in enumerate(self.lats):
            # Southward gradient: ice concentration increases further south
            southness = ((-55.0 - lat) / 23.0)  # 0.0 at -55°S, 1.0 at -78°S
            base_ice = np.clip(southness * season_scale * 0.85, 0.05, 0.95)
            # Weddell Sea gyre pack ice boost (east of peninsula)
            for c, lon in enumerate(self.lons):
                if lon >= -60.0 and lat <= -65.0:
                    weddell_boost = 0.18 * (( -65.0 - lat ) / 13.0)
                    ice_risk_grid[r, c] = min(0.95, base_ice + weddell_boost)
                else:
                    ice_risk_grid[r, c] = base_ice

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

            # Bounding box of influence (~30 NM radius)
            search_radius_deg = max(1.2, (b_len_nm / 60.0) * 1.8)
            r_min, c_min = self.coord_to_indices(b_lat - search_radius_deg, b_lon - search_radius_deg * 2.0)
            r_max, c_max = self.coord_to_indices(b_lat + search_radius_deg, b_lon + search_radius_deg * 2.0)

            sigma_perp = (b_wid_nm / 2.0) + 4.0  # Cross-track buffer (NM)
            sigma_parallel = (b_len_nm / 2.0) + (b_speed * 1.5) + 6.0  # Along-track buffer (NM)

            for r in range(r_min, r_max + 1):
                for c in range(c_min, c_max + 1):
                    c_lat, c_lon = self.indices_to_coord(r, c)
                    dist_nm = haversine_distance_nm(c_lat, c_lon, b_lat, b_lon)
                    
                    # Direct collision footprint
                    if dist_nm <= (b_len_nm / 2.0):
                        berg_risk_grid[r, c] = max(berg_risk_grid[r, c], 0.98)
                    elif dist_nm <= 45.0:
                        # Anisotropic Gaussian elongation along drift vector
                        # Local Cartesian projection in NM
                        dy_nm = (c_lat - b_lat) * 60.0
                        dx_nm = (c_lon - b_lon) * 60.0 * math.cos(math.radians(b_lat))
                        
                        # Project onto parallel and perpendicular axes
                        d_parallel = dx_nm * drift_dx + dy_nm * drift_dy
                        d_perp = -dx_nm * drift_dy + dy_nm * drift_dx

                        # Forward bias: risk is higher along forward drift trajectory
                        if d_parallel < 0:
                            eff_sigma_par = sigma_parallel * 0.6  # Behind iceberg
                        else:
                            eff_sigma_par = sigma_parallel * 1.4  # Ahead in drift corridor

                        exponent = - ( (d_perp ** 2) / (2.0 * sigma_perp ** 2) + (d_parallel ** 2) / (2.0 * eff_sigma_par ** 2) )
                        hazard_val = math.exp(np.clip(exponent, -20.0, 0.0))
                        berg_risk_grid[r, c] = max(berg_risk_grid[r, c], float(hazard_val))

        # 3. Meteorological Weather Field (R_wx) via IDW
        wx_risk_grid = np.zeros((self.n_rows, self.n_cols), dtype=np.float32)
        station_readings = dataset_loader.get_station_weather_snapshot(simulation_date_iso)

        if station_readings:
            st_lats = np.array([st.lat for st in station_readings])
            st_lons = np.array([st.lon for st in station_readings])
            st_winds = np.array([st.wind_speed_knots for st in station_readings])
            st_press = np.array([st.pressure_hpa for st in station_readings])

            # Precalculate station risk values
            st_risks = []
            for w, p in zip(st_winds, st_press):
                wind_risk = 0.1 * (w / 25.0) if w <= 25.0 else min(1.0, 0.1 + 0.9 * ((w - 25.0) / 35.0) ** 1.5)
                press_risk = min(1.0, max(0.0, (1013.0 - p) / 45.0))
                st_risks.append(0.6 * wind_risk + 0.4 * press_risk)
            st_risks = np.array(st_risks)

            for r, lat in enumerate(self.lats):
                for c, lon in enumerate(self.lons):
                    dists_deg = np.sqrt((st_lats - lat) ** 2 + ((st_lons - lon) * math.cos(math.radians(lat))) ** 2)
                    dists_deg = np.maximum(dists_deg, 0.15)  # Avoid div by zero
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

        # Landmass cells receive infinite impassable barrier risk
        total_risk_grid[~self.navigable_mask] = 1.0

        return total_risk_grid, ice_risk_grid, berg_risk_grid, wx_risk_grid

# Global shared risk grid engine
risk_grid_engine = SpatialRiskGrid()
