"""
CityMind-AI Configuration
========================
Central configuration for all application settings, model hyperparameters,
data paths, and runtime constants.
"""

from pathlib import Path
from dataclasses import dataclass, field
from typing import List


@dataclass
class AppConfig:
    """Master configuration for the CityMind-AI application."""

    # ── Project Paths ──────────────────────────────────────────────────
    BASE_DIR: Path = Path(__file__).parent.resolve()
    DATA_DIR: Path = field(default=None)
    MODEL_DIR: Path = field(default=None)
    STATIC_DIR: Path = field(default=None)
    TEMPLATE_DIR: Path = field(default=None)

    def __post_init__(self):
        self.DATA_DIR = self.BASE_DIR / "data"
        self.MODEL_DIR = self.BASE_DIR / "models"
        self.STATIC_DIR = self.BASE_DIR / "static"
        self.TEMPLATE_DIR = self.BASE_DIR / "templates"

        # Ensure critical directories exist
        self.DATA_DIR.mkdir(exist_ok=True)
        self.MODEL_DIR.mkdir(exist_ok=True)

    # ── World Model Hyperparameters ────────────────────────────────────
    INPUT_DIM: int = 128          # Observation feature vector size
    LATENT_DIM: int = 64          # Latent state dimensionality
    HIDDEN_DIM: int = 256         # Hidden layer width for encoder
    ACTION_DIM: int = 32          # Action space dimensionality
    STOCHASTIC_DIM: int = 32      # Stochastic latent component size
    PLANNING_HORIZON: int = 10    # Max lookahead steps for planner

    # ── MCTS Planner Settings ──────────────────────────────────────────
    MCTS_ITERATIONS: int = 100    # Number of MCTS rollouts per plan step
    MCTS_EXPLORATION: float = 1.414  # UCB1 exploration constant (sqrt(2))
    MCTS_MAX_DEPTH: int = 10      # Maximum tree depth for simulation

    # ── City Zones ─────────────────────────────────────────────────────
    ZONES: List[str] = field(default_factory=lambda: [
        "Zone_A",   # Residential
        "Zone_B",   # Commercial
        "Zone_C",   # Industrial
    ])

    ZONE_TYPES: dict = field(default_factory=lambda: {
        "Zone_A": "residential",
        "Zone_B": "commercial",
        "Zone_C": "industrial",
    })

    # ── Metrics tracked by the world model ─────────────────────────────
    METRICS: List[str] = field(default_factory=lambda: [
        "traffic_flow",
        "congestion_index",
        "avg_speed",
        "aqi",
        "pm25",
        "no2",
        "co2_level_ppm",
        "noise_level_db",
        "temperature_c",
        "humidity_pct",
        "green_cover_pct",
        "energy_demand",
        "solar_generation",
        "grid_load",
        "water_consumption",
        "water_leakage_rate",
        "water_quality_index",
        "reservoir_level_pct",
        "bin_fill_level_pct",
        "recycle_rate_pct",
        "waste_collected_tons",
        "waste_route_efficiency",
        "bed_occupancy_pct",
        "emergency_response_min",
        "patient_intake_rate",
        "health_alert_level",
        "crime_rate_index",
        "police_patrol_coverage_pct",
        "emergency_response_time_min",
        "surveillance_coverage_pct",
        "incident_probability",
    ])

    # ── WebSocket / Real-time Settings ─────────────────────────────────
    WS_UPDATE_INTERVAL: int = 5   # Seconds between live-data pushes

    # ── API Defaults ───────────────────────────────────────────────────
    DEFAULT_HOURS: int = 24       # Default lookback window for queries
    MAX_HOURS: int = 168          # Maximum queryable window (7 days)

    # ── Detection / Video Processing ───────────────────────────────────
    DETECTION_CONFIDENCE: float = 0.5
    TRACKER_MAX_AGE: int = 30
    TRACKER_MIN_HITS: int = 3
    TRACKER_IOU_THRESHOLD: float = 0.3
    FEATURE_DIM: int = 128       # Scene feature vector dimension

    # ── City Center Coordinates (NYC-area baseline) ────────────────────
    CITY_CENTER_LAT: float = 40.7128
    CITY_CENTER_LNG: float = -74.0060


# Singleton instance used across the application
config = AppConfig()
