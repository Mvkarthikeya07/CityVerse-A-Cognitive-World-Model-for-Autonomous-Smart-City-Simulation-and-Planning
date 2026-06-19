"""
StateDecoder & RewardPredictor — Latent → Predictions
=====================================================
Decodes the world-model latent state (h, z) into human-readable
city metrics (traffic, pollution, energy) and scalar reward signals
for planning objectives.
"""

from __future__ import annotations

from typing import Dict, List, Tuple

import numpy as np


class StateDecoder:
    """
    Decodes concatenated (h, z) into city metric predictions.

    Architecture::

        [h ‖ z] (hidden_dim + latent_dim)
          → Linear(hidden) + ReLU
          → Linear(hidden) + ReLU
          → Linear(num_outputs)        # one per metric

    Output dict keys:
        traffic_flow, congestion_index, aqi, energy_demand,
        incident_probability, avg_speed

    Parameters
    ----------
    latent_dim : int   — stochastic z dimension (default 64)
    hidden_dim : int   — GRU h dimension (default 128)
    """

    # The metrics this decoder produces
    METRIC_NAMES: List[str] = [
        "traffic_flow", "congestion_index", "avg_speed",
        "aqi", "pm25", "no2", "co2_level_ppm", "noise_level_db", "temperature_c", "humidity_pct", "green_cover_pct",
        "energy_demand", "solar_generation", "grid_load",
        "water_consumption", "water_leakage_rate", "water_quality_index", "reservoir_level_pct",
        "bin_fill_level_pct", "recycle_rate_pct", "waste_collected_tons", "waste_route_efficiency",
        "bed_occupancy_pct", "emergency_response_min", "patient_intake_rate", "health_alert_level",
        "crime_rate_index", "police_patrol_coverage_pct", "emergency_response_time_min", "surveillance_coverage_pct",
        "incident_probability",
    ]

    # Realistic ranges for each metric (used for de-normalisation)
    _METRIC_RANGES: Dict[str, Tuple[float, float]] = {
        "traffic_flow":                 (50.0,   900.0),
        "congestion_index":             (0.0,    1.0),
        "avg_speed":                    (10.0,   65.0),
        "aqi":                          (20.0,   300.0),
        "pm25":                         (5.0,    100.0),
        "no2":                          (5.0,    100.0),
        "co2_level_ppm":                (380.0,  600.0),
        "noise_level_db":               (30.0,   95.0),
        "temperature_c":                (-5.0,   45.0),
        "humidity_pct":                 (10.0,   100.0),
        "green_cover_pct":              (0.0,    100.0),
        "energy_demand":                (50.0,   1500.0),
        "solar_generation":             (0.0,    500.0),
        "grid_load":                    (0.0,    100.0),
        "water_consumption":            (1000.0, 100000.0),
        "water_leakage_rate":           (0.0,    30.0),
        "water_quality_index":          (50.0,   100.0),
        "reservoir_level_pct":          (0.0,    100.0),
        "bin_fill_level_pct":           (0.0,    100.0),
        "recycle_rate_pct":             (0.0,    100.0),
        "waste_collected_tons":         (0.0,    20.0),
        "waste_route_efficiency":       (0.0,    100.0),
        "bed_occupancy_pct":            (0.0,    100.0),
        "emergency_response_min":       (2.0,    45.0),
        "patient_intake_rate":          (0.0,    50.0),
        "health_alert_level":           (0.0,    4.0),
        "crime_rate_index":             (0.0,    100.0),
        "police_patrol_coverage_pct":   (0.0,    100.0),
        "emergency_response_time_min":  (2.0,    30.0),
        "surveillance_coverage_pct":    (0.0,    100.0),
        "incident_probability":         (0.0,    1.0),
    }

    def __init__(self, latent_dim: int = 64, hidden_dim: int = 128) -> None:
        self.latent_dim = latent_dim
        self.hidden_dim = hidden_dim
        self.input_dim = hidden_dim + latent_dim
        self.num_outputs = len(self.METRIC_NAMES)
        self._inner = 128  # internal MLP width

        self._init_weights()

    # ── Forward ───────────────────────────────────────────────────────

    def decode(self, h: np.ndarray, z: np.ndarray) -> Dict[str, float]:
        """
        Decode latent state into metric predictions.

        Parameters
        ----------
        h : np.ndarray, shape (hidden_dim,)
        z : np.ndarray, shape (latent_dim,)

        Returns
        -------
        dict mapping metric name → predicted float value
        """
        h = np.asarray(h, dtype=np.float32).ravel()
        z = np.asarray(z, dtype=np.float32).ravel()

        # Pad / truncate to expected dims
        if h.shape[0] < self.hidden_dim:
            h = np.pad(h, (0, self.hidden_dim - h.shape[0]))
        if z.shape[0] < self.latent_dim:
            z = np.pad(z, (0, self.latent_dim - z.shape[0]))

        x = np.concatenate([h[:self.hidden_dim], z[:self.latent_dim]])

        # Layer 1
        a1 = np.maximum(0, x @ self.W1 + self.b1)
        # Layer 2
        a2 = np.maximum(0, a1 @ self.W2 + self.b2)
        # Output
        raw = a2 @ self.W3 + self.b3       # (num_outputs,)

        # Apply sigmoid then scale to realistic ranges
        sig = 1.0 / (1.0 + np.exp(-np.clip(raw, -10, 10)))

        result: Dict[str, float] = {}
        for i, name in enumerate(self.METRIC_NAMES):
            lo, hi = self._METRIC_RANGES[name]
            result[name] = round(float(lo + (hi - lo) * sig[i]), 2)

        return result

    def decode_trajectory(
        self, trajectory: List[Tuple[np.ndarray, np.ndarray]]
    ) -> List[Dict[str, float]]:
        """Decode a list of (h, z) pairs into a timeline of predictions."""
        return [self.decode(h, z) for h, z in trajectory]

    # ── Weights ───────────────────────────────────────────────────────

    def _init_weights(self) -> None:
        rng = np.random.default_rng(seed=789)

        def _xavier(fi: int, fo: int) -> np.ndarray:
            lim = np.sqrt(6.0 / (fi + fo))
            return rng.uniform(-lim, lim, (fi, fo)).astype(np.float32)

        self.W1 = _xavier(self.input_dim, self._inner)
        self.b1 = np.zeros(self._inner, dtype=np.float32)
        self.W2 = _xavier(self._inner, self._inner)
        self.b2 = np.zeros(self._inner, dtype=np.float32)
        self.W3 = _xavier(self._inner, self.num_outputs)
        self.b3 = np.zeros(self.num_outputs, dtype=np.float32)


# ══════════════════════════════════════════════════════════════════════

class RewardPredictor:
    """
    Scores a decoded city-state against a planning objective.

    Supported objectives:
        - ``minimize_congestion``  — penalise high congestion
        - ``minimize_pollution``   — penalise high AQI
        - ``minimize_energy``      — penalise high energy demand
        - ``balanced``             — weighted combination of all

    Parameters
    ----------
    latent_dim : int — not directly used for shape, kept for consistency.
    """

    # Weight presets for each objective
    _OBJECTIVE_WEIGHTS: Dict[str, Dict[str, float]] = {
        "minimize_congestion": {
            "traffic_flow": 0.1,
            "congestion_index": -0.5,
            "aqi": -0.05,
            "energy_demand": -0.02,
            "incident_probability": -0.25,
            "avg_speed": 0.15,
        },
        "minimize_pollution": {
            "traffic_flow": 0.0,
            "congestion_index": -0.1,
            "aqi": -0.55,
            "energy_demand": -0.1,
            "incident_probability": -0.1,
            "avg_speed": 0.05,
        },
        "minimize_energy": {
            "traffic_flow": 0.0,
            "congestion_index": -0.05,
            "aqi": -0.1,
            "energy_demand": -0.55,
            "incident_probability": -0.05,
            "avg_speed": 0.0,
        },
        "minimize_water_loss": {
            "water_consumption": -0.1,
            "water_leakage_rate": -0.6,
            "water_quality_index": 0.1,
            "reservoir_level_pct": 0.2,
        },
        "maximize_waste_recycling": {
            "bin_fill_level_pct": -0.3,
            "recycle_rate_pct": 0.5,
            "waste_route_efficiency": 0.2,
        },
        "optimize_healthcare": {
            "bed_occupancy_pct": -0.2,
            "emergency_response_min": -0.4,
            "health_alert_level": -0.4,
        },
        "maximize_public_safety": {
            "crime_rate_index": -0.4,
            "police_patrol_coverage_pct": 0.2,
            "emergency_response_time_min": -0.2,
            "surveillance_coverage_pct": 0.2,
        },
        "minimize_environmental_impact": {
            "co2_level_ppm": -0.4,
            "noise_level_db": -0.2,
            "aqi": -0.2,
            "green_cover_pct": 0.2,
        },
        "balanced": {
            "traffic_flow": 0.05,
            "congestion_index": -0.15,
            "aqi": -0.15,
            "energy_demand": -0.1,
            "incident_probability": -0.1,
            "avg_speed": 0.05,
            "water_leakage_rate": -0.1,
            "bin_fill_level_pct": -0.1,
            "health_alert_level": -0.1,
            "crime_rate_index": -0.1,
        },
    }

    def __init__(self, latent_dim: int = 64) -> None:
        self.latent_dim = latent_dim

    def predict_reward(
        self,
        h: np.ndarray,
        z: np.ndarray,
        objective: str = "balanced",
        predictions: Dict[str, float] | None = None,
        decoder: StateDecoder | None = None,
    ) -> float:
        """
        Compute scalar reward for a latent state.

        If ``predictions`` is supplied they are used directly;
        otherwise a ``decoder`` must be given to decode (h, z) first.
        """
        if predictions is None:
            if decoder is None:
                # Fallback: use raw latent magnitude as proxy
                combined = np.concatenate([
                    np.asarray(h, dtype=np.float32).ravel(),
                    np.asarray(z, dtype=np.float32).ravel(),
                ])
                return float(-np.mean(np.abs(combined)) + 0.5)
            predictions = decoder.decode(h, z)

        weights = self._OBJECTIVE_WEIGHTS.get(objective, self._OBJECTIVE_WEIGHTS["balanced"])

        # Normalise predictions to 0-1 scale for reward computation
        normed = self._normalise(predictions)

        reward = 0.0
        for metric, w in weights.items():
            reward += w * normed.get(metric, 0.0)

        return round(float(reward), 4)

    def compute_kpi_scores(self, predictions: Dict[str, float]) -> Dict[str, float]:
        """
        Break down predictions into individual KPI scores (0-100 scale).

        Higher is better for all returned scores.
        """
        normed = self._normalise(predictions)

        scores: Dict[str, float] = {}
        # Traffic flow: higher is better (more throughput)
        scores["traffic_throughput"] = round(normed.get("traffic_flow", 0.5) * 100, 1)
        # Congestion: lower is better → invert
        scores["congestion_score"] = round((1.0 - normed.get("congestion_index", 0.5)) * 100, 1)
        # AQI: lower is better → invert
        scores["air_quality"] = round((1.0 - normed.get("aqi", 0.5)) * 100, 1)
        # Energy: lower demand is better → invert
        scores["energy_efficiency"] = round((1.0 - normed.get("energy_demand", 0.5)) * 100, 1)
        # Safety: lower incident prob is better → invert
        scores["safety_index"] = round((1.0 - normed.get("incident_probability", 0.1)) * 100, 1)
        # Speed: higher is better
        scores["mobility"] = round(normed.get("avg_speed", 0.5) * 100, 1)

        # New multi-sector metrics
        # Water sustainability: higher quality, lower leakage, higher reservoir
        w_qual = normed.get("water_quality_index", 0.9)
        w_leak = normed.get("water_leakage_rate", 0.1)
        w_res = normed.get("reservoir_level_pct", 0.8)
        scores["water_sustainability"] = round(((w_qual + (1.0 - w_leak) + w_res) / 3.0) * 100, 1)
        
        # Waste management: lower bin fill, higher recycling, higher route efficiency
        ws_fill = normed.get("bin_fill_level_pct", 0.4)
        ws_rec = normed.get("recycle_rate_pct", 0.35)
        ws_eff = normed.get("waste_route_efficiency", 0.75)
        scores["waste_management"] = round((((1.0 - ws_fill) + ws_rec + ws_eff) / 3.0) * 100, 1)
        
        # Healthcare index: lower response time, higher bed availability, lower alert
        h_bed = normed.get("bed_occupancy_pct", 0.7)
        h_resp = normed.get("emergency_response_min", 0.2)
        h_al = normed.get("health_alert_level", 0.0)
        scores["healthcare_index"] = round((((1.0 - h_bed) + (1.0 - h_resp) + (1.0 - h_al)) / 3.0) * 100, 1)
        
        # Public Safety index: lower crime, higher patrols, lower response, higher surveillance
        s_crime = normed.get("crime_rate_index", 0.2)
        s_patrol = normed.get("police_patrol_coverage_pct", 0.75)
        s_resp = normed.get("emergency_response_time_min", 0.2)
        s_surv = normed.get("surveillance_coverage_pct", 0.8)
        scores["public_safety"] = round((((1.0 - s_crime) + s_patrol + (1.0 - s_resp) + s_surv) / 4.0) * 100, 1)
        
        # Environmental index: lower CO2, lower noise, higher green cover
        env_co2 = normed.get("co2_level_ppm", 0.2)
        env_noise = normed.get("noise_level_db", 0.3)
        env_green = normed.get("green_cover_pct", 0.4)
        scores["environmental_index"] = round((((1.0 - env_co2) + (1.0 - env_noise) + env_green) / 3.0) * 100, 1)

        # Overall
        scores["overall"] = round(float(np.mean(list(scores.values()))), 1)

        return scores

    # ── Internal ──────────────────────────────────────────────────────

    @staticmethod
    def _normalise(preds: Dict[str, float]) -> Dict[str, float]:
        """Map raw predictions to 0-1 using the known metric ranges."""
        ranges = StateDecoder._METRIC_RANGES
        normed: Dict[str, float] = {}
        for k, v in preds.items():
            if k in ranges:
                lo, hi = ranges[k]
                normed[k] = float(np.clip((v - lo) / (hi - lo + 1e-8), 0, 1))
            else:
                normed[k] = v
        return normed
