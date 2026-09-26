/**
 * POLARIS-X API Client Layer
 */
import { OperationalLayers, RouteResponse, SurgeRerouteResponse, VesselProfile } from "@/types";

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const API_BASE_URL = RAW_API_URL.endsWith("/api") ? RAW_API_URL : `${RAW_API_URL.replace(/\/$/, "")}/api`;

export async function fetchOperationalLayers(simulationDate: string = "2021-03-15"): Promise<OperationalLayers> {
  const res = await fetch(`${API_BASE_URL}/layers?simulation_date=${encodeURIComponent(simulationDate)}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch layers: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchVessels(): Promise<VesselProfile[]> {
  const res = await fetch(`${API_BASE_URL}/vessels`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch vessels: ${res.statusText}`);
  }
  const data = await res.json();
  return data.vessels;
}

export async function fetchStations(): Promise<{ name: string; lat: number; lon: number }[]> {
  const res = await fetch(`${API_BASE_URL}/stations`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch stations: ${res.statusText}`);
  }
  const data = await res.json();
  return data.stations;
}

export async function calculateRoute(params: {
  start_station?: string;
  dest_station?: string;
  polar_class: string;
  safety_weight: number;
  fuel_weight: number;
  simulation_date: string;
  surge_berg_id?: string;
  surge_speed_multiplier?: number;
  surge_heading_deg?: number;
}): Promise<RouteResponse> {
  const res = await fetch(`${API_BASE_URL}/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(`Failed to compute route: ${res.statusText}`);
  }
  return res.json();
}

export async function triggerSurgeSimulation(params: {
  surge_berg_id: string;
  speed_multiplier: number;
  heading_deg: number;
  start_station: string;
  dest_station: string;
  polar_class: string;
  simulation_date: string;
}): Promise<SurgeRerouteResponse> {
  const res = await fetch(`${API_BASE_URL}/simulate-reroute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(`Failed to simulate surge: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchPolarisRioMatrix(): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/polaris/rio-matrix`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch POLARIS RIO matrix: ${res.statusText}`);
  }
  return res.json();
}

export async function evaluateCustomIceRegime(params: {
  polar_class: string;
  regime: Record<string, number>;
}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/polaris/evaluate-regime`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(`Failed to evaluate custom ice regime: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchExpeditionPresets(): Promise<{ presets: import("@/types").ExpeditionPreset[] }> {
  const res = await fetch(`${API_BASE_URL}/expedition/presets`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch expedition presets: ${res.statusText}`);
  }
  return res.json();
}

export async function planExpedition(
  params: import("@/types").ExpeditionPlanRequest
): Promise<import("@/types").ExpeditionPlan> {
  const res = await fetch(`${API_BASE_URL}/expedition/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Expedition planning failed: ${res.statusText}`);
  }
  return res.json();
}

export async function queryCopilot(
  params: import("@/types").CopilotQueryRequest
): Promise<import("@/types").CopilotResponse> {
  const res = await fetch(`${API_BASE_URL}/copilot/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Polaris Copilot request failed: ${res.statusText}`);
  }
  return res.json();
}
