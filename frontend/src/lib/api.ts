/**
 * POLARIS-X API Client Layer
 */
import { OperationalLayers, RouteResponse, SurgeRerouteResponse, VesselProfile } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

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
