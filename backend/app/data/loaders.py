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
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np

# Path to datasets directory
BASE_DATASET_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "sih 059 dataset")
)

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
        self._iceberg_tracks_cache: Dict[str, pd.DataFrame] = {}
        self._station_readings_cache: Dict[str, List[WeatherStationReading]] = {}
        self._monthly_sea_ice_cache: Optional[pd.DataFrame] = None
        self._climatology_means: Dict[int, float] = {}

    def load_nic_dimensions(self) -> Dict[str, Tuple[float, float, str]]:
        """Extract latest length (NM), width (NM), and grounded status from archive.zip."""
        if self._dimensions_cache:
            return self._dimensions_cache

        zip_path = os.path.join(self.data_dir, "archive.zip")
        if not os.path.exists(zip_path):
            return {}

        with zipfile.ZipFile(zip_path, 'r') as z:
            csv_files = sorted([f for f in z.namelist() if f.endswith('.csv')])
            # Read all reports in reverse to get most recent dimensions
            for fname in reversed(csv_files[-20:]):
                try:
                    with z.open(fname) as fp:
                        df = pd.read_csv(fp)
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

    def get_active_icebergs_for_date(self, target_date_iso: str = "2021-03-15") -> List[IcebergObservation]:
        """Get snapshot of all tracked icebergs on or closest to a given date."""
        dims_map = self.load_nic_dimensions()
        tracks_map = self.load_iceberg_kinematics()
        target_julian = iso_to_julian(target_date_iso)

        observations: List[IcebergObservation] = []
        for berg_id, df in tracks_map.items():
            if df.empty:
                continue

            # Find exact or nearest temporal observation
            df_diff = (df['date'] - target_julian).abs()
            nearest_idx = df_diff.idxmin()
            row = df.loc[nearest_idx]

            # Get dimensions
            length, width, status = dims_map.get(berg_id, (15.0, 8.0, "drifting"))
            size_sqkm = float(row.get('size', length * width * 3.43))
            disp = float(row.get('disp', 0.8))
            vel_angle = float(row.get('vel_angle', 45.0)) * 57.2958 if float(row.get('vel_angle', 0)) < 7 else float(row.get('vel_angle', 45.0))

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
                source="byu_stats_filtered"
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
