"""
CityMind-AI — World Model Simulator
Orchestrates full simulation runs using the world model pipeline.
"""

import numpy as np
from world_model.encoder import WorldModelEncoder
from world_model.dynamics import RSSMDynamics
from world_model.predictor import StateDecoder, RewardPredictor
from world_model.planner import MCTSPlanner

from config import config as app_config

class WorldModelSimulator:
    """End-to-end city simulation using the world model."""

    def __init__(self, config: dict | None = None):
        config = config or {}
        latent_dim = config.get('latent_dim', app_config.LATENT_DIM)
        action_dim = config.get('action_dim', app_config.ACTION_DIM)
        hidden_dim = config.get('hidden_dim', app_config.HIDDEN_DIM)

        self.encoder = WorldModelEncoder(latent_dim=latent_dim, hidden_dim=hidden_dim)
        self.dynamics = RSSMDynamics(latent_dim=latent_dim, action_dim=action_dim, hidden_dim=hidden_dim)
        self.decoder = StateDecoder(latent_dim=latent_dim, hidden_dim=hidden_dim)
        self.reward_predictor = RewardPredictor(latent_dim=latent_dim)
        self.planner = MCTSPlanner(self.dynamics, self.decoder, self.reward_predictor)

    def run_scenario(self, scenario_config: dict, steps: int = 24) -> dict:
        """
        Run a simulated scenario.
        Returns a dictionary with simulation results.
        """
        # Create dummy initial observation
        obs = np.zeros((1, self.encoder.input_dim), dtype=np.float32)
        
        # 1. Encode initial state
        initial_z = self.encoder.encode(obs)[0]
        initial_h = np.zeros(self.dynamics.hidden_dim, dtype=np.float32)

        # 2. Run planning for the scenario
        objective = 'balanced'
        scen_id = scenario_config.get('id', 'baseline')
        if scen_id == 'green_initiative':
            objective = 'minimize_environmental_impact'
        elif scen_id == 'peak_hour':
            objective = 'minimize_congestion'
        elif scen_id == 'emergency':
            objective = 'minimize_congestion'
        elif scen_id == 'water_leak':
            objective = 'minimize_water_loss'
        elif scen_id == 'waste_backlog':
            objective = 'maximize_waste_recycling'
        elif scen_id == 'viral_outbreak':
            objective = 'optimize_healthcare'
        elif scen_id == 'safety_threat':
            objective = 'maximize_public_safety'
        elif scen_id == 'heatwave':
            objective = 'minimize_environmental_impact'
            
        planning_results = self.planner.plan(initial_h, initial_z, objective=objective)
        best_actions = planning_results.get('best_actions', [])

        # 3. Simulate timeline rollout
        timeline = []
        h = initial_h.copy()
        z = initial_z.copy()

        from datetime import datetime, timedelta
        base_time = datetime.now()
        
        for step in range(steps):
            t = base_time + timedelta(hours=step)
            # Take next action
            action_idx = step % self.dynamics.action_dim
            action_vec = np.zeros(self.dynamics.action_dim, dtype=np.float32)
            action_vec[action_idx] = 1.0

            # Step dynamics
            h_next, z_next = self.dynamics.step(h, z, action_vec)
            h, z = h_next, z_next

            # Decode metrics
            metrics = self.decoder.decode(h, z)
            
            # Apply scenario-specific multipliers for realism
            if scen_id == 'peak_hour':
                metrics['traffic_flow'] *= 1.4
                metrics['congestion_index'] = min(1.0, metrics['congestion_index'] * 1.5)
            elif scen_id == 'green_initiative':
                metrics['aqi'] = max(10, metrics['aqi'] * 0.6)
                metrics['congestion_index'] *= 0.8
                metrics['green_cover_pct'] = min(100.0, metrics.get('green_cover_pct', 40.0) * 1.25)
            elif scen_id == 'emergency':
                metrics['incident_probability'] = 0.95
                metrics['congestion_index'] = min(1.0, metrics['congestion_index'] * 1.6)
            elif scen_id == 'city_event':
                metrics['traffic_flow'] *= 1.3
                metrics['energy_demand'] *= 1.2
            elif scen_id == 'water_leak':
                metrics['water_leakage_rate'] = min(30.0, metrics.get('water_leakage_rate', 5.0) * 2.5)
                metrics['reservoir_level_pct'] = max(20.0, metrics.get('reservoir_level_pct', 85.0) * 0.8)
                metrics['water_quality_index'] = max(50.0, metrics.get('water_quality_index', 90.0) * 0.9)
            elif scen_id == 'waste_backlog':
                metrics['bin_fill_level_pct'] = min(100.0, metrics.get('bin_fill_level_pct', 30.0) * 2.2)
                metrics['waste_route_efficiency'] = max(20.0, metrics.get('waste_route_efficiency', 80.0) * 0.6)
            elif scen_id == 'viral_outbreak':
                metrics['bed_occupancy_pct'] = min(100.0, metrics.get('bed_occupancy_pct', 70.0) * 1.35)
                metrics['emergency_response_min'] = min(45.0, metrics.get('emergency_response_min', 10.0) * 1.5)
                metrics['health_alert_level'] = 3.0
            elif scen_id == 'safety_threat':
                metrics['crime_rate_index'] = min(100.0, metrics.get('crime_rate_index', 15.0) * 1.8)
                metrics['emergency_response_time_min'] = min(30.0, metrics.get('emergency_response_time_min', 8.0) * 1.4)
            elif scen_id == 'heatwave':
                metrics['temperature_c'] = round(38.0 + random.uniform(0, 4.0), 1)
                metrics['energy_demand'] = min(1500.0, metrics.get('energy_demand', 400.0) * 1.45)
                metrics['water_consumption'] = min(100000.0, metrics.get('water_consumption', 20000.0) * 1.35)
                metrics['aqi'] = min(300.0, metrics.get('aqi', 70.0) * 1.25)
            
            # Predict reward
            reward = self.reward_predictor.predict_reward(h, z, objective=objective)

            # Round metrics for presentation
            timeline.append({
                "timestamp": t.strftime('%H:00'),
                "traffic_flow": int(metrics.get("traffic_flow", 150)),
                "congestion_index": float(metrics.get("congestion_index", 0.4)),
                "aqi": int(metrics.get("aqi", 60)),
                "pm25": float(metrics.get("pm25", 15.0)),
                "no2": float(metrics.get("no2", 20.0)),
                "co2_level_ppm": float(metrics.get("co2_level_ppm", 410.0)),
                "noise_level_db": float(metrics.get("noise_level_db", 55.0)),
                "temperature_c": float(metrics.get("temperature_c", 22.0)),
                "humidity_pct": float(metrics.get("humidity_pct", 60.0)),
                "green_cover_pct": float(metrics.get("green_cover_pct", 30.0)),
                "energy_demand": float(metrics.get("energy_demand", 350.0)),
                "solar_generation": float(metrics.get("solar_generation", 120.0)),
                "grid_load": float(metrics.get("grid_load", 60.0)),
                "water_consumption": float(metrics.get("water_consumption", 25000.0)),
                "water_leakage_rate": float(metrics.get("water_leakage_rate", 5.0)),
                "water_quality_index": float(metrics.get("water_quality_index", 90.0)),
                "reservoir_level_pct": float(metrics.get("reservoir_level_pct", 85.0)),
                "bin_fill_level_pct": float(metrics.get("bin_fill_level_pct", 40.0)),
                "recycle_rate_pct": float(metrics.get("recycle_rate_pct", 35.0)),
                "waste_collected_tons": float(metrics.get("waste_collected_tons", 5.0)),
                "waste_route_efficiency": float(metrics.get("waste_route_efficiency", 80.0)),
                "bed_occupancy_pct": float(metrics.get("bed_occupancy_pct", 70.0)),
                "emergency_response_min": float(metrics.get("emergency_response_min", 10.0)),
                "patient_intake_rate": float(metrics.get("patient_intake_rate", 12.0)),
                "health_alert_level": float(metrics.get("health_alert_level", 0.0)),
                "crime_rate_index": float(metrics.get("crime_rate_index", 15.0)),
                "police_patrol_coverage_pct": float(metrics.get("police_patrol_coverage_pct", 75.0)),
                "emergency_response_time_min": float(metrics.get("emergency_response_time_min", 8.0)),
                "surveillance_coverage_pct": float(metrics.get("surveillance_coverage_pct", 80.0)),
                "incident_probability": float(metrics.get("incident_probability", 0.05)),
                "avg_speed": float(metrics.get("avg_speed", 45.0)),
                "reward": float(reward)
            })

        # Calculate summary KPIs
        summary_kpis = {
            "avg_congestion": float(np.mean([t["congestion_index"] for t in timeline])),
            "peak_traffic": int(np.max([t["traffic_flow"] for t in timeline])),
            "avg_aqi": int(np.mean([t["aqi"] for t in timeline])),
            "total_energy": float(np.sum([t["energy_demand"] for t in timeline])),
            "avg_water_leakage": float(np.mean([t["water_leakage_rate"] for t in timeline])),
            "avg_waste_recycle": float(np.mean([t["recycle_rate_pct"] for t in timeline])),
            "avg_bed_occupancy": float(np.mean([t["bed_occupancy_pct"] for t in timeline])),
            "avg_crime_rate": float(np.mean([t["crime_rate_index"] for t in timeline])),
            "avg_co2_level": float(np.mean([t["co2_level_ppm"] for t in timeline])),
            "avg_reward": float(np.mean([t["reward"] for t in timeline]))
        }

        return {
            "status": "success",
            "scenario": scen_id,
            "objective": objective,
            "timeline": timeline,
            "summary_kpis": summary_kpis,
            "planned_actions": best_actions
        }
