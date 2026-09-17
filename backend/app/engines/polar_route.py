"""
POLARIS-X PolarRoute Multi-Objective A* Pathfinding Engine
Solves for lowest-cost maritime passages across dynamic risk lattices,
balancing navigational safety, speed degradation, and cubic fuel consumption.
"""

import math
import heapq
from typing import Dict, List, Optional, Tuple, Any
import numpy as np

from app.core.config import settings
from app.core.vessel_physics import get_vessel_spec, calculate_effective_speed, calculate_segment_fuel_proxy
from app.engines.risk_grid import risk_grid_engine, haversine_distance_nm

class RouteNode:
    def __init__(self, r: int, c: int, g_cost: float, h_cost: float, parent=None):
        self.r = r
        self.c = c
        self.g_cost = g_cost
        self.h_cost = h_cost
        self.f_cost = g_cost + h_cost
        self.parent = parent

    def __lt__(self, other):
        return self.f_cost < other.f_cost

class PolarRouteOptimizer:
    def __init__(self, grid_engine=risk_grid_engine):
        self.grid = grid_engine

    def find_route(
        self,
        start_lat: float,
        start_lon: float,
        dest_lat: float,
        dest_lon: float,
        polar_class: str = "PC-5",
        safety_weight: float = 0.70,
        fuel_weight: float = 0.30,
        simulation_date_iso: str = "2021-03-15",
        surge_berg_id: Optional[str] = None,
        surge_speed_multiplier: float = 1.0,
        surge_heading_deg: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Compute optimal safe corridor and direct shortest baseline.
        Returns comprehensive route payload with GeoJSON linestrings, metrics, and XAI inputs.
        """
        # 1. Retrieve vessel specifications
        vessel = get_vessel_spec(polar_class)

        # 2. Compute dynamic risk grid
        total_risk, ice_risk, berg_risk, wx_risk = self.grid.compute_risk_grid(
            simulation_date_iso=simulation_date_iso,
            surge_berg_id=surge_berg_id,
            surge_speed_multiplier=surge_speed_multiplier,
            surge_heading_deg=surge_heading_deg
        )

        # 3. Discretize start and destination coordinates
        start_r, start_c = self.grid.coord_to_indices(start_lat, start_lon)
        dest_r, dest_c = self.grid.coord_to_indices(dest_lat, dest_lon)

        # Ensure start and destination are marked navigable
        self.grid.navigable_mask[start_r, start_c] = True
        self.grid.navigable_mask[dest_r, dest_c] = True
        total_risk[start_r, start_c] = min(0.30, float(total_risk[start_r, start_c]))
        total_risk[dest_r, dest_c] = min(0.30, float(total_risk[dest_r, dest_c]))

        # 4. Run A* for Recommended Safe Route (Risk-Weighted)
        rec_path_indices = self._run_astar(
            start_r, start_c, dest_r, dest_c,
            total_risk, ice_risk,
            beta_risk=settings.RISK_PENALTY_MULTIPLIER * (safety_weight / 0.70),
            gamma=settings.RISK_AVERSION_EXPONENT,
            beta_ice=settings.ICE_IMPEDANCE_MULTIPLIER,
            max_safe_ice=vessel.max_safe_ice_conc
        )

        # 5. Run A* for Direct Shortest Track (Geometric Distance Only, zero risk penalty)
        direct_path_indices = self._run_astar(
            start_r, start_c, dest_r, dest_c,
            total_risk, ice_risk,
            beta_risk=0.0,
            gamma=1.0,
            beta_ice=0.0,
            max_safe_ice=1.0
        )

        # 6. Evaluate metrics for both paths
        rec_metrics, rec_coords = self._evaluate_path_metrics(
            rec_path_indices, total_risk, ice_risk, berg_risk, wx_risk, vessel
        )
        direct_metrics, direct_coords = self._evaluate_path_metrics(
            direct_path_indices, total_risk, ice_risk, berg_risk, wx_risk, vessel
        )

        # 7. Construct GeoJSON features
        rec_geojson = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [[round(lon, 4), round(lat, 4)] for lat, lon in rec_coords]
            },
            "properties": {
                "name": "POLARIS Recommended Corridor",
                "vessel_class": vessel.polar_class,
                "waypoints_count": len(rec_coords)
            }
        }

        direct_geojson = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [[round(lon, 4), round(lat, 4)] for lat, lon in direct_coords]
            },
            "properties": {
                "name": "Direct Shortest Track (Unadjusted)",
                "vessel_class": vessel.polar_class,
                "waypoints_count": len(direct_coords)
            }
        }

        return {
            "recommended_route": rec_geojson,
            "recommended_metrics": rec_metrics,
            "direct_route": direct_geojson,
            "direct_metrics": direct_metrics,
            "vessel_profile": vessel.model_dump(),
            "simulation_date": simulation_date_iso
        }

    def _run_astar(
        self,
        start_r: int,
        start_c: int,
        dest_r: int,
        dest_c: int,
        total_risk: np.ndarray,
        ice_risk: np.ndarray,
        beta_risk: float,
        gamma: float,
        beta_ice: float,
        max_safe_ice: float
    ) -> List[Tuple[int, int]]:
        """A* pathfinding algorithm over 8-connected discrete spatial grid."""
        dest_lat, dest_lon = self.grid.indices_to_coord(dest_r, dest_c)
        start_lat, start_lon = self.grid.indices_to_coord(start_r, start_c)

        open_set: List[RouteNode] = []
        start_h = haversine_distance_nm(start_lat, start_lon, dest_lat, dest_lon)
        heapq.heappush(open_set, RouteNode(start_r, start_c, 0.0, start_h))

        visited_costs: Dict[Tuple[int, int], float] = {(start_r, start_c): 0.0}
        closed_set = set()

        # 8-connected grid neighborhood offsets: (dr, dc, dist_factor)
        neighbors = [
            (-1, 0, 1.0), (1, 0, 1.0), (0, -1, 1.0), (0, 1, 1.0),
            (-1, -1, 1.4142), (-1, 1, 1.4142), (1, -1, 1.4142), (1, 1, 1.4142)
        ]

        while open_set:
            current = heapq.heappop(open_set)

            if (current.r, current.c) == (dest_r, dest_c):
                # Reconstruct path from destination to start
                path = []
                curr = current
                while curr:
                    path.append((curr.r, curr.c))
                    curr = curr.parent
                return path[::-1]

            if (current.r, current.c) in closed_set:
                continue
            closed_set.add((current.r, current.c))

            c_lat, c_lon = self.grid.indices_to_coord(current.r, current.c)

            for dr, dc, step_mult in neighbors:
                nr, nc = current.r + dr, current.c + dc

                # Bounds checking
                if not (0 <= nr < self.grid.n_rows and 0 <= nc < self.grid.n_cols):
                    continue

                # Landmass pruning
                if not self.grid.navigable_mask[nr, nc]:
                    continue

                cell_risk = float(total_risk[nr, nc])
                cell_ice = float(ice_risk[nr, nc])

                # Prune cells exceeding vessel ice capability or hard iceberg barriers
                if beta_risk > 0.0 and cell_risk >= settings.HARD_RISK_THRESHOLD:
                    continue
                if beta_risk > 0.0 and cell_ice > max_safe_ice + 0.10:
                    continue

                n_lat, n_lon = self.grid.indices_to_coord(nr, nc)
                step_dist_nm = haversine_distance_nm(c_lat, c_lon, n_lat, n_lon)

                # Non-linear risk cost penalty
                risk_penalty = beta_risk * (cell_risk ** gamma)
                ice_penalty = beta_ice * cell_ice
                step_cost = step_dist_nm * (1.0 + risk_penalty + ice_penalty)

                tentative_g = current.g_cost + step_cost

                if (nr, nc) not in visited_costs or tentative_g < visited_costs[(nr, nc)]:
                    visited_costs[(nr, nc)] = tentative_g
                    h_cost = haversine_distance_nm(n_lat, n_lon, dest_lat, dest_lon)
                    neighbor_node = RouteNode(nr, nc, tentative_g, h_cost, parent=current)
                    heapq.heappush(open_set, neighbor_node)

        # Fallback straight path if blocked
        return [(start_r, start_c), (dest_r, dest_c)]

    def _evaluate_path_metrics(
        self,
        path_indices: List[Tuple[int, int]],
        total_risk: np.ndarray,
        ice_risk: np.ndarray,
        berg_risk: np.ndarray,
        wx_risk: np.ndarray,
        vessel
    ) -> Tuple[Dict[str, Any], List[Tuple[float, float]]]:
        """Calculates precise ETA, fuel proxy %, total distance, and risk scores along a path."""
        coords = [self.grid.indices_to_coord(r, c) for r, c in path_indices]

        if len(coords) < 2:
            return {
                "distance_nm": 0.0,
                "eta_hours": 0.0,
                "fuel_proxy_pct": 100.0,
                "risk_score": 0.0,
                "risk_level": "LOW",
                "avg_berg_risk": 0.0,
                "avg_ice_risk": 0.0,
                "avg_wx_risk": 0.0
            }, coords

        total_distance_nm = 0.0
        total_duration_hours = 0.0
        total_fuel_units = 0.0
        baseline_fuel_units = 0.0

        risk_samples = []
        berg_risk_samples = []
        ice_risk_samples = []
        wx_risk_samples = []

        for i in range(len(coords) - 1):
            lat1, lon1 = coords[i]
            lat2, lon2 = coords[i + 1]
            r2, c2 = path_indices[i + 1]

            seg_dist = haversine_distance_nm(lat1, lon1, lat2, lon2)
            total_distance_nm += seg_dist

            c_risk = float(total_risk[r2, c2])
            c_ice = float(ice_risk[r2, c2])
            c_berg = float(berg_risk[r2, c2])
            c_wx = float(wx_risk[r2, c2])

            risk_samples.append(c_risk)
            berg_risk_samples.append(c_berg)
            ice_risk_samples.append(c_ice)
            wx_risk_samples.append(c_wx)

            # Calculate degraded speed and duration
            v_eff = calculate_effective_speed(
                vessel.cruising_speed_knots, c_ice, c_wx, vessel.hull_resistance_coeff
            )
            seg_duration = seg_dist / max(v_eff, 1.0)
            total_duration_hours += seg_duration

            # Calculate segment fuel
            seg_fuel = calculate_segment_fuel_proxy(
                v_eff, vessel.cruising_speed_knots, c_ice, vessel.hull_resistance_coeff, seg_duration
            )
            total_fuel_units += seg_fuel

            # Baseline open water fuel
            base_seg_duration = seg_dist / vessel.cruising_speed_knots
            baseline_fuel_units += base_seg_duration

        fuel_proxy_pct = (total_fuel_units / max(baseline_fuel_units, 0.01)) * 100.0
        composite_risk_score = float(np.mean(risk_samples)) if risk_samples else 0.20

        # Qualitative Risk Level
        if composite_risk_score < 0.35:
            risk_level = "LOW"
        elif composite_risk_score < 0.65:
            risk_level = "MEDIUM"
        else:
            risk_level = "HIGH"

        metrics = {
            "distance_nm": round(total_distance_nm, 1),
            "eta_hours": round(total_duration_hours, 1),
            "fuel_proxy_pct": round(fuel_proxy_pct, 1),
            "risk_score": round(composite_risk_score, 3),
            "risk_level": risk_level,
            "avg_berg_risk": round(float(np.mean(berg_risk_samples)), 3),
            "avg_ice_risk": round(float(np.mean(ice_risk_samples)), 3),
            "avg_wx_risk": round(float(np.mean(wx_risk_samples)), 3),
        }

        return metrics, coords

# Global shared routing engine
polar_route_optimizer = PolarRouteOptimizer()
