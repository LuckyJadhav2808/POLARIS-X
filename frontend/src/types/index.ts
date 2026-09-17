/**
 * POLARIS-X TypeScript Data Contracts & Interfaces
 */

export interface Station {
  name: string;
  lat: number;
  lon: number;
}

export interface VesselProfile {
  name: string;
  polar_class: string;
  description: string;
  cruising_speed_knots: number;
  max_safe_ice_conc: number;
  hull_resistance_coeff: number;
  engine_power_kw: number;
  base_fuel_rate_tons_day: number;
  risk_multiplier: number;
}

export interface RouteMetrics {
  distance_nm: number;
  eta_hours: number;
  fuel_proxy_pct: number;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  avg_berg_risk: number;
  avg_ice_risk: number;
  avg_wx_risk: number;
}

export interface WaterfallFactor {
  factor: string;
  delta_pct: number;
  impact: string;
  category: "safety" | "cost";
}

export interface XAIExplanation {
  narrative: string;
  confidence_pct: number;
  metrics_comparison: {
    delta_berg_risk_pct: number;
    delta_ice_risk_pct: number;
    delta_dist_nm: number;
    delta_dist_pct: number;
    delta_fuel_pct: number;
    delta_eta_hours: number;
  };
  waterfall_factors: WaterfallFactor[];
  data_lineage: {
    scatterometer: string;
    iceberg_reports: string;
    meteorology: string;
    data_freshness: string;
  };
}

export interface GeoJSONLineString {
  type: "Feature";
  geometry: {
    type: "LineString";
    coordinates: [number, number][]; // [lon, lat]
  };
  properties: {
    name: string;
    vessel_class: string;
    waypoints_count: number;
  };
}

export interface IcebergFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    iceberg_id: string;
    date: string;
    lat: number;
    lon: number;
    length_nm: number;
    width_nm: number;
    size_sqkm: number;
    disp_km_day: number;
    vel_angle_deg: number;
    status: string;
    source: string;
  };
}

export interface WeatherStationFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    station_id: string;
    station_name: string;
    lat: number;
    lon: number;
    date: string;
    pressure_hpa: number;
    temperature_c: number;
    wind_speed_knots: number;
    wind_dir_deg: number;
  };
}

export interface OperationalLayers {
  simulation_date: string;
  icebergs: {
    type: "FeatureCollection";
    features: IcebergFeature[];
  };
  weather_stations: {
    type: "FeatureCollection";
    features: WeatherStationFeature[];
  };
  stations: {
    type: "FeatureCollection";
    features: {
      type: "Feature";
      geometry: { type: "Point"; coordinates: [number, number] };
      properties: { name: string; lat: number; lon: number };
    }[];
  };
}

export interface RouteResponse {
  status: string;
  request: {
    start: { name: string; lat: number; lon: number };
    destination: { name: string; lat: number; lon: number };
    polar_class: string;
    safety_weight: number;
    fuel_weight: number;
    simulation_date: string;
  };
  recommended_route: GeoJSONLineString;
  recommended_metrics: RouteMetrics;
  direct_route: GeoJSONLineString;
  direct_metrics: RouteMetrics;
  vessel_profile: VesselProfile;
  xai: XAIExplanation;
}

export interface SurgeRerouteResponse {
  status: string;
  alert: {
    severity: string;
    title: string;
    message: string;
    timestamp: string;
  };
  baseline_route: GeoJSONLineString;
  baseline_metrics: RouteMetrics;
  rerouted_route: GeoJSONLineString;
  rerouted_metrics: RouteMetrics;
  vessel_profile: VesselProfile;
  xai: XAIExplanation;
}
