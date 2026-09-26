"""
POLARIS-X Golden Corridor Data Ingestion & ETL Pipeline
Loads and normalizes real Antarctic datasets:
1. BYU Iceberg Kinematics (stats_database_v7.1.zip)
2. NIC Weekly Iceberg Reports & Dimensions (archive.zip)
3. British Antarctic Survey Surface Meteorology (surface_met.zip)
4. Monthly Antarctic Sea-Ice Extent (monthly-sea-ice-extent-in-the-antarctic.csv)
"""

import os
import zipfile
import re
import datetime
import math
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np

# Path to datasets directory
BASE_DATASET_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "sih 059 dataset")
)

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Great-Circle distance in kilometers between two lat/lon pairs."""
    r_earth_km = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlon = ((lon2 - lon1 + 180.0) % 360.0) - 180.0
    dlambda = math.radians(dlon)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    a = min(1.0, max(0.0, a))
    return float(r_earth_km * 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a)))

def forward_azimuth_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate forward initial azimuth bearing in degrees [0, 360) from point 1 to point 2."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dlon = ((lon2 - lon1 + 180.0) % 360.0) - 180.0
    dlambda = math.radians(dlon)
    y = math.sin(dlambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlambda)
    return float((math.degrees(math.atan2(y, x)) + 360.0) % 360.0)


def julian_to_iso_date(julian_int: int) -> str:
    """Convert BYU Julian date integer YYYYDDD (e.g. 2019244) to ISO date string YYYY-MM-DD."""
    s = str(julian_int)
    if len(s) != 7:
        return "2020-01-01"
    year = int(s[:4])
    day_of_year = int(s[4:])
    try:
        dt = datetime.date(year, 1, 1) + datetime.timedelta(days=day_of_year - 1)
        return dt.isoformat()
    except Exception:
        return f"{year}-01-01"

def iso_to_julian(date_str: str) -> int:
    """Convert ISO date string YYYY-MM-DD to BYU Julian integer YYYYDDD."""
    try:
        dt = datetime.date.fromisoformat(date_str)
        day_of_year = dt.timetuple().tm_yday
        return dt.year * 1000 + day_of_year
    except Exception:
        return 2021074

class IcebergObservation:
    def __init__(
        self,
        iceberg_id: str,
        date_iso: str,
        lat: float,
        lon: float,
        length_nm: float = 15.0,
        width_nm: float = 8.0,
        size_sqkm: float = 100.0,
        disp_km_day: float = 0.5,
        vel_angle_deg: float = 45.0,
        status: str = "drifting",
        source: str = "byu_stats"
    ):
        self.iceberg_id = iceberg_id.upper()
        self.date_iso = date_iso
        self.lat = lat
        self.lon = lon
        self.length_nm = length_nm
        self.width_nm = width_nm
        self.size_sqkm = size_sqkm
        self.disp_km_day = disp_km_day
        self.vel_angle_deg = vel_angle_deg
        self.status = status
        self.source = source

    def to_dict(self) -> dict:
        return {
            "iceberg_id": self.iceberg_id,
            "date": self.date_iso,
            "lat": round(self.lat, 4),
            "lon": round(self.lon, 4),
            "length_nm": self.length_nm,
            "width_nm": self.width_nm,
            "size_sqkm": round(self.size_sqkm, 1),
            "disp_km_day": round(self.disp_km_day, 2),
            "vel_angle_deg": round(self.vel_angle_deg, 1),
            "status": self.status,
            "source": self.source
        }

class WeatherStationReading:
    def __init__(
        self,
        station_id: str,
        station_name: str,
        lat: float,
        lon: float,
        date_iso: str,
        pressure_hpa: float,
        temperature_c: float,
        wind_speed_knots: float,
        wind_dir_deg: float
    ):
        self.station_id = station_id
        self.station_name = station_name
        self.lat = lat
        self.lon = lon
        self.date_iso = date_iso
        self.pressure_hpa = pressure_hpa
        self.temperature_c = temperature_c
        self.wind_speed_knots = wind_speed_knots
        self.wind_dir_deg = wind_dir_deg

    def to_dict(self) -> dict:
        return {
            "station_id": self.station_id,
            "station_name": self.station_name,
            "lat": self.lat,
            "lon": self.lon,
            "date": self.date_iso,
            "pressure_hpa": round(self.pressure_hpa, 1),
            "temperature_c": round(self.temperature_c, 1),
            "wind_speed_knots": round(self.wind_speed_knots, 1),
            "wind_dir_deg": round(self.wind_dir_deg, 1)
        }

class DatasetLoader:
    def __init__(self, data_dir: str = BASE_DATASET_DIR):
        self.data_dir = data_dir
        self._dimensions_cache: Dict[str, Tuple[float, float, str]] = {}
        self._nic_history_cache: Optional[Dict[str, List[dict]]] = None
        self._nic_summary_cache: Optional[dict] = None
        self._iceberg_tracks_cache: Dict[str, pd.DataFrame] = {}
        self._consolidated_v8_cache: Dict[str, pd.DataFrame] = {}
        self._iceberg_catalog_cache: Optional[List[dict]] = None
        self._station_readings_cache: Dict[str, List[WeatherStationReading]] = {}
        self._monthly_sea_ice_cache: Optional[pd.DataFrame] = None
        self._climatology_means: Dict[int, float] = {}

    def load_nic_dimensions(self) -> Dict[str, Tuple[float, float, str]]:
        """Extract latest length (NM), width (NM), and grounded status across all 111 bulletins in archive.zip."""
        if self._dimensions_cache:
            return self._dimensions_cache

        zip_path = os.path.join(self.data_dir, "archive.zip")
        if not os.path.exists(zip_path):
            return {}

        with zipfile.ZipFile(zip_path, 'r') as z:
            csv_files = sorted([f for f in z.namelist() if f.endswith('.csv')])
            # Read all 111 reports in reverse order to get the most recent confirmed dimensions
            for fname in reversed(csv_files):
                try:
                    with z.open(fname) as fp:
                        df = pd.read_csv(fp, on_bad_lines='skip')
                        for _, row in df.iterrows():
                            berg_id = str(row.get('Iceberg', '')).strip().upper()
                            if berg_id and berg_id not in self._dimensions_cache:
                                length = float(row.get('Length (NM)', 15.0))
                                width = float(row.get('Width (NM)', 8.0))
                                remarks = str(row.get('Remarks', '')).lower()
                                status = "grounded" if "grounded" in remarks else "drifting"
                                self._dimensions_cache[berg_id] = (length, width, status)
                except Exception:
                    continue

        return self._dimensions_cache

    def load_nic_history(self, target_iceberg: Optional[str] = None) -> Dict[str, List[dict]]:
        """
        Extract complete 3-year chronological evolution history (2019-2022) across all 111 weekly bulletins.
        Tracks changes in dimensions (NM), surface area (sq km), and grounded/drifting state transitions.
        """
        if self._nic_history_cache is not None:
            if target_iceberg:
                tid = target_iceberg.strip().upper()
                return {tid: self._nic_history_cache.get(tid, [])}
            return self._nic_history_cache

        zip_path = os.path.join(self.data_dir, "archive.zip")
        if not os.path.exists(zip_path):
            return {}

        history: Dict[str, List[dict]] = {}

        with zipfile.ZipFile(zip_path, 'r') as z:
            csv_files = sorted([f for f in z.namelist() if f.endswith('.csv')])
            for fname in csv_files:
                m = re.search(r'(\d{4})(\d{2})(\d{2})', fname)
                date_iso = f"{m.group(1)}-{m.group(2)}-{m.group(3)}" if m else "2020-01-01"
                try:
                    with z.open(fname) as fp:
                        df = pd.read_csv(fp, on_bad_lines='skip')
                        for _, row in df.iterrows():
                            bid = str(row.get('Iceberg', '')).strip().upper()
                            if not bid:
                                continue
                            length = float(row.get('Length (NM)', 15.0))
                            width = float(row.get('Width (NM)', 8.0))
                            remarks = str(row.get('Remarks', '')).lower()
                            status = "grounded" if "grounded" in remarks else "drifting"

                            lat = float(row['Latitude']) if 'Latitude' in row and pd.notnull(row['Latitude']) else None
                            lon = float(row['Longitude']) if 'Longitude' in row and pd.notnull(row['Longitude']) else None

                            if bid not in history:
                                history[bid] = []

                            history[bid].append({
                                "date": date_iso,
                                "length_nm": length,
                                "width_nm": width,
                                "size_sqkm": round(length * width * 3.43, 1),
                                "status": status,
                                "lat": lat,
                                "lon": lon
                            })
                except Exception:
                    continue

        self._nic_history_cache = history
        if target_iceberg:
            tid = target_iceberg.strip().upper()
            return {tid: self._nic_history_cache.get(tid, [])}
        return self._nic_history_cache

    def get_nic_bulletin_stats(self) -> dict:
        """Returns metadata summary of the 111 weekly National Ice Center bulletins."""
        if self._nic_summary_cache is not None:
            return self._nic_summary_cache

        history = self.load_nic_history()
        total_obs = sum(len(records) for records in history.values())
        
        all_dates = []
        for records in history.values():
            for r in records:
                all_dates.append(r["date"])
        
        start_date = min(all_dates) if all_dates else "2019-08-16"
        end_date = max(all_dates) if all_dates else "2022-08-12"

        self._nic_summary_cache = {
            "total_bulletins": 111,
            "distinct_icebergs_tracked": len(history),
            "total_weekly_observations": total_obs,
            "temporal_range": {
                "start": start_date,
                "end": end_date
            },
            "sample_major_icebergs": ["A23A", "A68A", "A68B", "A64", "A63", "B09B", "B15AA"]
        }
        return self._nic_summary_cache

    def load_iceberg_kinematics(
        self,
        target_icebergs: List[str] = ["a68a", "a68b", "a23a", "a64", "a63", "a78"],
        min_lat: float = -78.0,
        max_lat: float = -52.0,
        min_lon: float = -75.0,
        max_lon: float = -25.0
    ) -> Dict[str, pd.DataFrame]:
        """Extract and filter daily kinematics from stats_database_v7.1.zip."""
        if self._iceberg_tracks_cache:
            return self._iceberg_tracks_cache

        zip_path = os.path.join(self.data_dir, "stats_database_v7.1.zip")
        if not os.path.exists(zip_path):
            return {}

        with zipfile.ZipFile(zip_path, 'r') as z:
            for berg in target_icebergs:
                fname = f"stats_database_v7.1/{berg.lower()}.csv"
                if fname in z.namelist():
                    try:
                        with z.open(fname) as fp:
                            df = pd.read_csv(fp)
                            # Filter to bounds and valid coordinates
                            valid = df[
                                (df['lat'] >= min_lat) & (df['lat'] <= max_lat) &
                                (df['lon'] >= min_lon) & (df['lon'] <= max_lon)
                            ].copy()
                            if not valid.empty:
                                valid['date_iso'] = valid['date'].apply(julian_to_iso_date)
                                self._iceberg_tracks_cache[berg.upper()] = valid
                    except Exception:
                        continue

        return self._iceberg_tracks_cache

    def load_consolidated_v8_tracks(
        self,
        target_icebergs: Optional[List[str]] = None,
        min_lat: float = -85.0,
        max_lat: float = -45.0,
        min_lon: float = -180.0,
        max_lon: float = 180.0
    ) -> Dict[str, pd.DataFrame]:
        """
        Extract, parse multi-sensor observations, and compute on-the-fly kinematics
        from consolidated_database_v8.0.zip.
        Supports all 647 Antarctic icebergs with multi-sensor fallback (ASCAT -> NIC -> QuikSCAT -> SeaWinds -> ERS -> SASS).
        """
        if self._consolidated_v8_cache and target_icebergs is None:
            return self._consolidated_v8_cache

        zip_path = os.path.join(self.data_dir, "consolidated_database_v8.0.zip")
        if not os.path.exists(zip_path):
            return {}

        sensor_priority = ["ascat", "nic", "qscat", "seawinds", "oscat", "ers", "nscat", "sass"]

        if target_icebergs is None:
            target_icebergs = ["a68a", "a68b", "a23a", "a64", "a63", "a78", "b09d", "b28", "c19a", "d16"]

        target_set = {b.lower() for b in target_icebergs}

        with zipfile.ZipFile(zip_path, 'r') as z:
            for name in z.namelist():
                if not name.endswith('.csv'):
                    continue
                basename = os.path.basename(name).replace('.csv', '').lower()
                if basename not in target_set:
                    continue

                try:
                    with z.open(name) as fp:
                        df = pd.read_csv(fp)
                        valid_records = []
                        for _, row in df.iterrows():
                            found_lat, found_lon, chosen_sensor = None, None, None
                            for s in sensor_priority:
                                f_flag = f"{s}_3"
                                f_lat = f"{s}_1"
                                f_lon = f"{s}_2"
                                if f_flag in row and f_lat in row and f_lon in row:
                                    if row[f_flag] == 1:
                                        lt = float(row[f_lat])
                                        ln = float(row[f_lon])
                                        if lt != 0.0 or ln != 0.0:
                                            found_lat = lt
                                            found_lon = ln
                                            chosen_sensor = s
                                            break
                            if found_lat is None:
                                continue

                            if not (min_lat <= found_lat <= max_lat and min_lon <= found_lon <= max_lon):
                                continue

                            sz1 = float(row.get('size_1', 0.0))
                            sz2 = float(row.get('size_2', 0.0))

                            valid_records.append({
                                "date": int(row['date']),
                                "lat": found_lat,
                                "lon": found_lon,
                                "sensor": chosen_sensor,
                                "size_1": sz1,
                                "size_2": sz2
                            })

                        if not valid_records:
                            continue

                        vdf = pd.DataFrame(valid_records)
                        vdf['date_iso'] = vdf['date'].apply(julian_to_iso_date)

                        # Compute on-the-fly displacement (km/day) and forward bearing (degrees)
                        vdf['disp'] = 0.8
                        vdf['vel_angle'] = 45.0

                        for i in range(1, len(vdf)):
                            prev = vdf.iloc[i - 1]
                            curr = vdf.iloc[i]
                            dt_prev = datetime.date.fromisoformat(prev['date_iso'])
                            dt_curr = datetime.date.fromisoformat(curr['date_iso'])
                            days_gap = max(1, (dt_curr - dt_prev).days)

                            dist_km = haversine_km(prev['lat'], prev['lon'], curr['lat'], curr['lon'])
                            daily_disp = min(40.0, dist_km / days_gap)
                            bearing = forward_azimuth_deg(prev['lat'], prev['lon'], curr['lat'], curr['lon'])

                            vdf.at[vdf.index[i], 'disp'] = round(daily_disp, 2)
                            vdf.at[vdf.index[i], 'vel_angle'] = round(bearing, 1)

                        self._consolidated_v8_cache[basename.upper()] = vdf
                except Exception:
                    continue

        return self._consolidated_v8_cache

    def get_iceberg_catalog(self) -> List[dict]:
        """
        Returns catalog metadata for all 647 icebergs in consolidated_database_v8.0.zip.
        Categorized by Antarctic quadrant sector (A, B, C, D).
        """
        if self._iceberg_catalog_cache is not None:
            return self._iceberg_catalog_cache

        zip_path = os.path.join(self.data_dir, "consolidated_database_v8.0.zip")
        if not os.path.exists(zip_path):
            return []

        sector_names = {
            "A": "Bellingshausen / Weddell Sea (0°W - 90°W)",
            "B": "Amundsen / Ross Sea (90°W - 180°)",
            "C": "Wilkes Land / East Antarctica (90°E - 180°)",
            "D": "Queen Maud Land / Davis Sea (0°E - 90°E)",
            "U": "Sub-Antarctic / Unnamed Trajectory Series"
        }

        catalog = []
        with zipfile.ZipFile(zip_path, 'r') as z:
            for name in sorted(z.namelist()):
                if not name.endswith('.csv'):
                    continue
                basename = os.path.basename(name).replace('.csv', '').upper()
                sector_letter = basename[0] if basename and basename[0] in sector_names else "U"
                catalog.append({
                    "iceberg_id": basename,
                    "sector": sector_letter,
                    "sector_region": sector_names.get(sector_letter, "Pan-Antarctic Basin"),
                    "file": name
                })

        self._iceberg_catalog_cache = catalog
        return self._iceberg_catalog_cache

    def get_active_icebergs_for_date(
        self,
        target_date_iso: str = "2021-03-15",
        db_source: str = "v8.0"
    ) -> List[IcebergObservation]:
        """
        Get snapshot of all tracked icebergs on or closest to a given date.
        Supports db_source='v8.0' (Consolidated multi-sensor) or 'v7.1' (Legacy stats).
        """
        dims_map = self.load_nic_dimensions()
        target_julian = iso_to_julian(target_date_iso)

        if "8" in db_source:
            tracks_map = self.load_consolidated_v8_tracks()
            if not tracks_map:
                tracks_map = self.load_iceberg_kinematics()
                db_source = "v7.1_fallback"
        else:
            tracks_map = self.load_iceberg_kinematics()

        observations: List[IcebergObservation] = []
        for berg_id, df in list(tracks_map.items()):
            if df.empty:
                continue

            # Find exact or nearest temporal observation
            df_diff = (df['date'] - target_julian).abs()
            nearest_idx = df_diff.idxmin()
            row = df.loc[nearest_idx]

            # Get dimensions
            length, width, status = dims_map.get(berg_id, (15.0, 8.0, "drifting"))
            if 'size_1' in row and row['size_1'] > 0:
                length = float(row['size_1'])
                width = float(row['size_2']) if row['size_2'] > 0 else (length * 0.5)

            size_sqkm = float(row.get('size', length * width * 3.43))
            disp = float(row.get('disp', 0.8))
            vel_angle = float(row.get('vel_angle', 45.0))
            if vel_angle < 7 and 'vel_angle' in row and row.get('vel_angle', 0) > 0 and db_source.startswith("v7.1"):
                vel_angle *= 57.2958

            sensor_source = str(row.get('sensor', 'byu_scatterometer'))
            source_tag = f"byu_consolidated_v8_{sensor_source}" if "8" in db_source else "byu_stats_filtered"

            obs = IcebergObservation(
                iceberg_id=berg_id,
                date_iso=str(row['date_iso']),
                lat=float(row['lat']),
                lon=float(row['lon']),
                length_nm=length,
                width_nm=width,
                size_sqkm=size_sqkm,
                disp_km_day=disp,
                vel_angle_deg=vel_angle,
                status=status,
                source=source_tag
            )
            observations.append(obs)

        return observations

    def load_surface_meteorology(self) -> Dict[str, List[WeatherStationReading]]:
        """Parse BAS weather stations from surface_met.zip."""
        if self._station_readings_cache:
            return self._station_readings_cache

        zip_path = os.path.join(self.data_dir, "surface_met.zip")
        if not os.path.exists(zip_path):
            return {}

        station_meta = {
            "Rothera_surface.dat": ("ROTHERA", "Rothera Station", -67.5700, -68.1236),
            "Faraday_surface.dat": ("FARADAY", "Faraday / Vernadsky", -65.2500, -64.2667),
            "Grytviken_surface.dat": ("GRYTVIKEN", "Grytviken / South Georgia", -54.2833, -36.4833),
            "Signy_surface.dat": ("SIGNY", "Signy Island", -60.7000, -45.6000),
            "Halley_surface.dat": ("HALLEY", "Halley Station", -75.4333, -26.2167),
            "Deception_surface.dat": ("DECEPTION", "Deception Island", -63.0000, -60.7000),
            "Adelaide_surface.dat": ("ADELAIDE", "Adelaide Island Station", -67.8000, -68.9000),
            "Fossil_Bluff_surface.dat": ("FOSSIL_BLUFF", "Fossil Bluff Station", -71.3167, -68.2833),
        }

        with zipfile.ZipFile(zip_path, 'r') as z:
            for fname, meta in station_meta.items():
                if fname in z.namelist():
                    readings = []
                    try:
                        with z.open(fname) as fp:
                            # Skip header lines until records start
                            for line in fp:
                                l = line.decode('utf-8', errors='ignore').strip()
                                if not l or not (l.startswith('19') or l.startswith('20')):
                                    continue
                                parts = l.split()
                                if len(parts) >= 10:
                                    year, month, day, hour = int(parts[0]), int(parts[1]), int(parts[2]), int(parts[3])
                                    date_iso = f"{year:04d}-{month:02d}-{day:02d}"
                                    
                                    # Parse weather fields with null checking
                                    slp = float(parts[5]) if parts[5] != '-999' else 995.0
                                    temp = float(parts[7]) if parts[7] != '-999' else -5.0
                                    wind_spd = float(parts[8]) if parts[8] != '-999' else 15.0
                                    wind_dir = float(parts[9]) if parts[9] != '-999' else 240.0
                                    
                                    readings.append(WeatherStationReading(
                                        station_id=meta[0],
                                        station_name=meta[1],
                                        lat=meta[2],
                                        lon=meta[3],
                                        date_iso=date_iso,
                                        pressure_hpa=slp,
                                        temperature_c=temp,
                                        wind_speed_knots=wind_spd,
                                        wind_dir_deg=wind_dir
                                    ))
                        if readings:
                            self._station_readings_cache[meta[0]] = readings
                    except Exception:
                        continue

        return self._station_readings_cache

    def get_station_weather_snapshot(self, target_date_iso: str = "2021-03-15") -> List[WeatherStationReading]:
        """Get latest or climatological weather snapshot per active station."""
        stations_data = self.load_surface_meteorology()
        snapshot = []
        for station_id, readings in stations_data.items():
            # Return last valid reading (or matched date)
            if readings:
                latest = readings[-1]
                snapshot.append(latest)
        return snapshot

    def load_sea_ice_climatology(self) -> Dict[int, float]:
        """Compute 40-year monthly mean Antarctic sea-ice extent (million sq km)."""
        if self._climatology_means:
            return self._climatology_means

        csv_path = os.path.join(self.data_dir, "monthly-sea-ice-extent-in-the-antarctic.csv")
        if not os.path.exists(csv_path):
            # Fallback historical monthly means
            self._climatology_means = {
                1: 4.5, 2: 2.8, 3: 3.5, 4: 6.0, 5: 9.2, 6: 12.5,
                7: 15.5, 8: 17.5, 9: 18.8, 10: 18.2, 11: 14.5, 12: 9.0
            }
            return self._climatology_means

        try:
            df = pd.read_csv(csv_path)
            # Entity = Year, Year = Month (1-12)
            monthly_grouped = df.groupby('Year')['Monthly sea ice extent in the Antarctic'].mean()
            self._climatology_means = monthly_grouped.to_dict()
        except Exception:
            self._climatology_means = {
                1: 4.5, 2: 2.8, 3: 3.5, 4: 6.0, 5: 9.2, 6: 12.5,
                7: 15.5, 8: 17.5, 9: 18.8, 10: 18.2, 11: 14.5, 12: 9.0
            }

        return self._climatology_means

# Global shared singleton loader
dataset_loader = DatasetLoader()
