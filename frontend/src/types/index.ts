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
  draft_m?: number;
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
    risk_score?: number;
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

export interface EsgLedger {
  bunker_fuel_type: string;
  fuel_price_usd_per_ton: number;
  co2_factor_mepc: number;
  recommended_fuel_tons: number;
  recommended_fuel_cost_usd: number;
  recommended_co2_tons: number;
  direct_fuel_tons: number;
  direct_fuel_cost_usd: number;
  direct_co2_tons: number;
  fuel_saved_tons: number;
  cost_saved_usd: number;
  co2_abated_tons: number;
  efficiency_gain_pct: number;
  cii_grade: "A" | "B" | "C" | "D" | "E";
  cii_description: string;
}

export interface BathymetryWaypoint {
  lat: number;
  lon: number;
  depth_m: number;
  under_keel_clearance_m: number;
}

export interface BathymetryProfile {
  min_depth_m: number;
  avg_depth_m: number;
  min_under_keel_clearance_m: number;
  draft_m: number;
  is_safe: boolean;
  grounding_hazard_pct: number;
  status: string;
  sampled_waypoints: BathymetryWaypoint[];
}

export interface RIOWaypoint {
  index: number;
  lat: number;
  lon: number;
  rio: number;
  decision_code: "NORMAL_OPERATION" | "ELEVATED_RISK" | "OPERATION_PROHIBITED";
  decision_label: string;
  status_color: string;
  speed_limit_knots: number | null;
  ice_concentration_pct: number;
  regime_summary: {
    my: number;
    sy: number;
    tfy: number;
    mfy: number;
    thin: number;
    ow: number;
  };
}

export interface RIOProfile {
  polar_class: string;
  standard: string;
  overall_status: "FULLY_AUTHORIZED" | "ELEVATED_RISK_AUTHORIZED" | "PROHIBITED_VIOLATION" | "NO_WAYPOINTS";
  compliance_badge: string;
  compliance_text: string;
  is_fully_compliant: boolean;
  min_rio: number;
  avg_rio: number;
  max_rio: number;
  normal_pct: number;
  elevated_pct: number;
  prohibited_pct: number;
  waypoints_evaluated: number;
  waypoints: RIOWaypoint[];
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
  esg_ledger?: EsgLedger;
  bathymetry?: BathymetryProfile;
  direct_bathymetry?: BathymetryProfile;
  rio_profile?: RIOProfile;
  direct_rio_profile?: RIOProfile;
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
  esg_ledger?: EsgLedger;
  bathymetry?: BathymetryProfile;
  baseline_bathymetry?: BathymetryProfile;
  rio_profile?: RIOProfile;
  baseline_rio_profile?: RIOProfile;
  vessel_profile: VesselProfile;
  xai: XAIExplanation;
}

// ============================================================================
// EXPEDITION LOGISTICS PLANNER (MULTI-WAYPOINT SCIENTIFIC MISSION SEQUENCING)
// ============================================================================

export interface MissionWaypoint {
  name: string;
  lat: number;
  lon: number;
  dwell_time_hours: number;
  activity_type: "PORT_DEPARTURE" | "STATION_SUPPLY" | "CTD_MOORING_STATION" | "CREW_DISEMBARKATION" | "PORT_ARRIVAL" | string;
  notes?: string;
}

export interface ExpeditionPlanRequest {
  mission_name: string;
  polar_class: string;
  departure_date_iso: string;
  initial_bunker_fuel_tons: number;
  safety_weight: number;
  fuel_weight: number;
  waypoints: MissionWaypoint[];
}

export interface SafeHavenContingency {
  name: string;
  lat: number;
  lon: number;
  shelter_type: string;
  distance_nm: number;
  estimated_escape_hours: number;
  emergency_fuel_reserve_tons: number;
}

export interface ExpeditionLeg {
  leg_number: number;
  leg_title: string;
  origin: { name: string; lat: number; lon: number };
  destination: { name: string; lat: number; lon: number };
  departure_time_iso: string;
  arrival_time_iso: string;
  dwell_time_hours: number;
  transit_duration_hours: number;
  transit_distance_nm: number;
  transit_fuel_tons: number;
  hotel_fuel_tons: number;
  total_leg_fuel_tons: number;
  route_geojson: GeoJSONLineString;
  rio_profile?: RIOProfile;
  bathymetry?: BathymetryProfile;
  metrics: RouteMetrics;
  contingency_safe_haven: SafeHavenContingency;
}

export interface ExpeditionTimelineEvent {
  event_type: "EXPEDITION_DEPARTURE" | "WAYPOINT_ARRIVAL" | "WAYPOINT_DEPARTURE";
  waypoint_name: string;
  timestamp_iso: string;
  leg_number?: number;
  distance_from_previous_nm?: number;
  dwell_hours?: number;
  hotel_fuel_burned_tons?: number;
  remaining_fuel_tons: number;
  remaining_fuel_pct: number;
  activity: string;
  notes: string;
}

export interface ExpeditionSummary {
  total_distance_nm: number;
  total_transit_days: number;
  total_dwell_days: number;
  total_mission_days: number;
  total_fuel_burned_tons: number;
  initial_bunker_tons: number;
  remaining_bunker_tons: number;
  remaining_bunker_pct: number;
  bunker_status: "SAFE_RESERVE" | "CAUTION_RESERVE" | "CRITICAL_LOW_RESERVE";
  total_fuel_cost_usd: number;
  total_co2_tons: number;
}

export interface ExpeditionPlan {
  status: string;
  mission_name: string;
  vessel_profile: VesselProfile;
  polar_class: string;
  total_legs: number;
  departure_time_iso: string;
  mission_completion_iso: string;
  summary: ExpeditionSummary;
  legs: ExpeditionLeg[];
  timeline: ExpeditionTimelineEvent[];
}

export interface ExpeditionPreset {
  id: string;
  title: string;
  description: string;
  polar_class: string;
  departure_date: string;
  initial_bunker_fuel_tons: number;
  waypoints: MissionWaypoint[];
}


