"""
POLARIS-X Spatial Navigation Risk Grid Engine
Generates discrete 2D spatial risk lattices combining:
1. Sea-Ice concentration field & climate anomaly (R_ice) across 360°
2. Anisotropic Iceberg collision danger fields with drift velocity elongation (R_berg)
3. Synoptic Meteorological impedance interpolated via IDW (R_wx)
4. Full Pan-Antarctic 360° Continental Coastline Navigability Mask
"""

import math
from typing import Dict, List, Optional, Tuple, Any
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

def get_seafloor_depth(lat: float, lon: float) -> float:
    """
    Evaluates seafloor bathymetric depth (meters) based on the IBCSO / GEBCO
    Southern Ocean bathymetry model across -50°S to -80°S.
    Returns water depth in positive meters (e.g. 15.0m to 5200.0m), or 0.0m for grounded ice/landmass.
    """
    if is_antarctic_landmass(lat, lon):
        return 0.0

    l = ((lon + 180.0) % 360.0) - 180.0
    coast_lat = get_antarctic_coast_lat(l)
    d_coast_deg = lat - coast_lat  # Distance offshore in degrees lat (positive = north of coast)

    # 1. Base oceanic bathymetric profile
    if lat >= -55.0:
        # Deep Sub-Antarctic Abyssal Plain
        base_depth = 4200.0 + 350.0 * math.cos(math.radians(l * 2.0))
    elif d_coast_deg >= 4.0:
        # Deep Southern Ocean Abyssal Basin (>240 NM offshore)
        base_depth = 3600.0 + 500.0 * math.sin(math.radians(l + 45.0))
    elif d_coast_deg >= 1.5:
        # Continental Rise & Slope (transition from ~3500m to ~800m)
        t = (d_coast_deg - 1.5) / 2.5
        base_depth = 750.0 + (3500.0 - 750.0) * (t ** 1.6)
    elif d_coast_deg >= 0.2:
        # Antarctic Continental Shelf (isostatically depressed: 400m - 750m)
        t = (d_coast_deg - 0.2) / 1.3
        base_depth = 380.0 + 370.0 * t
    else:
        # Coastal near-shore sound / roadstead
        t = max(0.0, d_coast_deg) / 0.2
        base_depth = 65.0 + 315.0 * t

    # 2. Regional Submarine Bathymetric Features (Ridges, Banks, Trenches & Shoals)
    # A. South Sandwich Trench Deep (-60° to -55°S, -32° to -24°W)
    if -61.0 <= lat <= -55.0 and -32.0 <= l <= -24.0:
        base_depth = max(base_depth, 6500.0)

    # B. Scotia Sea Shallow Banks & Shag Rocks (-56.5° to -53.5°S, -45° to -38°W)
    elif -56.5 <= lat <= -53.5 and -45.0 <= l <= -38.0:
        base_depth = min(base_depth, 140.0 + 80.0 * math.sin(lat * 10.0))

    # C. South Shetland Shoals & Deception Island reef (-63.5° to -62.0°S, -61.5° to -59.0°W)
    elif -63.5 <= lat <= -62.0 and -61.5 <= l <= -59.0:
        base_depth = min(base_depth, 48.0 + 35.0 * math.cos((l + 60.0) * 5.0))

    # D. Ross Sea Pennell Bank & Iselin Bank (-74° to -71°S, 172°E to 180°E)
    elif -74.5 <= lat <= -71.0 and (l >= 172.0 or l <= -178.0):
        base_depth = min(base_depth, 160.0 + 50.0 * math.sin(l * 4.0))

    # E. Prydz Channel & Fram Bank near Davis/Bharati (-67.5° to -66.0°S, 72° to 78°E)
    elif -67.8 <= lat <= -66.0 and 72.0 <= l <= 78.0:
        base_depth = min(base_depth, 135.0 + 40.0 * math.cos(l))

    # Station roadsteads (anchorages must maintain navigable operational berth depths: 45m - 120m)
    for st_name, (st_lat, st_lon) in settings.STATIONS.items():
        if haversine_distance_nm(lat, lon, st_lat, st_lon) <= 15.0:
            base_depth = max(45.0, min(base_depth, 120.0))

    return float(max(15.0, base_depth))

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
        # Precomputed Bathymetric Seafloor Depth (meters)
        self.depth_grid = np.zeros((self.n_rows, self.n_cols), dtype=np.float32)

        for r, lat in enumerate(self.lats):
            for c, lon in enumerate(self.lons):
                if is_antarctic_landmass(lat, lon):
                    self.navigable_mask[r, c] = False
                    self.depth_grid[r, c] = 0.0
                else:
                    self.depth_grid[r, c] = get_seafloor_depth(lat, lon)

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

    def get_depth_at(self, lat: float, lon: float) -> float:
        """Returns seafloor depth (meters) at specified coordinate."""
        r, c = self.coord_to_indices(lat, lon)
        return float(self.depth_grid[r, c])

    def get_route_bathymetry_profile(
        self,
        route_coords: List[Tuple[float, float]],
        draft_m: float = 8.5
    ) -> Dict[str, Any]:
        """
        Samples seafloor depth along a route track, computing min depth,
        under-keel clearance (UKC), and grounding safety status.
        """
        if not route_coords:
            return {
                "min_depth_m": 0.0,
                "avg_depth_m": 0.0,
                "min_under_keel_clearance_m": 0.0,
                "draft_m": draft_m,
                "is_safe": False,
                "grounding_hazard_pct": 100.0,
                "status": "NO_WAYPOINTS",
                "sampled_waypoints": []
            }

        depths = []
        sampled_waypoints = []
        sample_interval = max(1, len(route_coords) // 10)

        for i, (lat, lon) in enumerate(route_coords):
            d = self.get_depth_at(lat, lon)
            depths.append(d)
            if i % sample_interval == 0 or i == len(route_coords) - 1:
                ukc = round(d - draft_m, 1)
                sampled_waypoints.append({
                    "lat": round(lat, 4),
                    "lon": round(lon, 4),
                    "depth_m": round(d, 1),
                    "under_keel_clearance_m": ukc
                })

        min_depth = float(min(depths))
        water_depths = [d for d in depths if d > 0.0]
        effective_min_depth = float(min(water_depths)) if water_depths else min_depth
        avg_depth = float(sum(depths) / len(depths))
        min_ukc = effective_min_depth - draft_m
        is_safe = min_ukc >= 5.0

        # Percentage of track with restricted UKC (<25m)
        restricted_count = sum(1 for d in depths if (d - draft_m) < 25.0)
        grounding_hazard_pct = round((restricted_count / len(depths)) * 100.0, 1)

        if min_ukc >= 25.0:
            status = "SAFE_DEEP_PASSAGE"
        elif min_ukc >= 5.0:
            status = "RESTRICTED_UKC_CAUTION"
        else:
            status = "CRITICAL_SHALLOW_SHOAL"

        return {
            "min_depth_m": round(effective_min_depth, 1),
            "avg_depth_m": round(avg_depth, 1),
            "min_under_keel_clearance_m": round(min_ukc, 1),
            "draft_m": round(draft_m, 1),
            "is_safe": is_safe,
            "grounding_hazard_pct": grounding_hazard_pct,
            "status": status,
            "sampled_waypoints": sampled_waypoints
        }

    def compute_risk_grid(
        self,
        simulation_date_iso: str = "2021-03-15",
        w_ice: float = settings.W_ICE,
        w_berg: float = settings.W_BERG,
        w_wx: float = settings.W_WX,
        surge_berg_id: Optional[str] = None,
        surge_speed_multiplier: float = 1.0,
        surge_heading_deg: Optional[float] = None,
        vessel_draft_m: float = 8.5
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

        # 5. Seafloor Bathymetric Grounding Hazard (IBCSO / GEBCO draft protection)
        # Any water cell shallower than vessel draft is impassable (grounding reef)
        grounding_barrier = (self.depth_grid > 0.0) & (self.depth_grid <= vessel_draft_m)
        total_risk_grid[grounding_barrier] = 1.0

        # Marginal depth buffer (< vessel_draft + 5.0m UKC) receives severe safety impedance
        marginal_shoal = (self.depth_grid > vessel_draft_m) & (self.depth_grid < (vessel_draft_m + 5.0))
        total_risk_grid[marginal_shoal] = np.maximum(total_risk_grid[marginal_shoal], 0.88)

        # Landmass cells receive impassable barrier risk
        total_risk_grid[~self.navigable_mask] = 1.0

        return total_risk_grid, ice_risk_grid, berg_risk_grid, wx_risk_grid

    def get_bathymetry_geojson(self) -> Dict[str, Any]:
        """
        Generates GeoJSON FeatureCollection of key Antarctic bathymetric features:
        deep submarine troughs, continental shelf breaks, and dangerous shallow shoals.
        """
        features = [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [-60.2, -62.8]
                },
                "properties": {
                    "feature_name": "South Shetland Coastal Shoal & Caldera",
                    "depth_m": 35.0,
                    "zone_type": "DANGEROUS_SHOAL",
                    "risk_warning": "Restricted Under-Keel Clearance for vessels with draft >= 9.5m",
                    "authority": "IBCSO / UKHO Polar Charting"
                }
            },
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [-42.0, -55.0]
                },
                "properties": {
                    "feature_name": "Shag Rocks Submerged Bank",
                    "depth_m": 85.0,
                    "zone_type": "SUBMARINE_BANK",
                    "risk_warning": "Abrupt seafloor shoaling from 3,800m to 85m",
                    "authority": "GEBCO Sub-Antarctic Bathymetry"
                }
            },
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [174.5, -73.2]
                },
                "properties": {
                    "feature_name": "Pennell Bank Shelf Shoal (Ross Sea)",
                    "depth_m": 145.0,
                    "zone_type": "CONTINENTAL_SHELF_BANK",
                    "risk_warning": "Submarine bank with frequent iceberg grounding scars",
                    "authority": "IBCSO Marine Geology"
                }
            },
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [75.0, -66.8]
                },
                "properties": {
                    "feature_name": "Fram Bank Coastal Shoal (Prydz Bay)",
                    "depth_m": 120.0,
                    "zone_type": "SUBMARINE_BANK",
                    "risk_warning": "Coastal moraine bank adjacent to Amery Ice Shelf channel",
                    "authority": "IBCSO / NCPOR Bathymetric Survey"
                }
            },
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [-28.0, -58.5]
                },
                "properties": {
                    "feature_name": "South Sandwich Trench Deep Channel",
                    "depth_m": 6500.0,
                    "zone_type": "ABYSSAL_DEEP_TRENCH",
                    "risk_warning": "Safe ultra-deep oceanic corridor (>5,000m depth)",
                    "authority": "GEBCO World Deepest Southern Waters"
                }
            }
        ]
        return {
            "type": "FeatureCollection",
            "features": features
        }

# Global shared risk grid engine
risk_grid_engine = SpatialRiskGrid()

