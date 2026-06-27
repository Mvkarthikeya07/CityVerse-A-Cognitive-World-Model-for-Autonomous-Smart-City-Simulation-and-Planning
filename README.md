<div align="center">

# CityVerse — A Cognitive World Model for Autonomous Smart City Simulation & Plannin

**The first open-source cognitive digital twin that doesn't just monitor cities — it thinks about them.**

[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![PyTorch 2.0+](https://img.shields.io/badge/PyTorch-2.0+-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org)
[![Flask 3.0+](https://img.shields.io/badge/Flask-3.0+-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-FFB703?style=for-the-badge)](https://github.com/ultralytics/ultralytics)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](LICENSE)

[![Smart Water](https://img.shields.io/badge/💧_Smart_Water-06B6D4?style=flat-square)](/)
[![Smart Waste](https://img.shields.io/badge/🗑️_Smart_Waste-F59E0B?style=flat-square)](/)
[![Smart Healthcare](https://img.shields.io/badge/🏥_Healthcare-EC4899?style=flat-square)](/)
[![Smart Safety](https://img.shields.io/badge/🛡️_Public_Safety-8B5CF6?style=flat-square)](/)
[![Smart Environment](https://img.shields.io/badge/🌿_Environment-10B981?style=flat-square)](/)
[![Smart Energy](https://img.shields.io/badge/⚡_Smart_Energy-F59E0B?style=flat-square)](/)

[Architecture](#architecture) · [Features](#features) · [Smart City Domains](#-smart-city-intelligence-domains) · [Installation](#installation) · [Usage](#usage) · [API Reference](#api-reference) · [Project Structure](#project-structure) · [Live Demo](#-live-demo--system-output-video) · [Roadmap](#roadmap)

</div>

---

## What Is CityVerse?

CityVerse is a **cognitive urban simulation engine** — a full-stack platform that fuses computer vision, deep generative world models, and autonomous planning to simulate, predict, and optimize the behaviour of real megacities.

Where conventional smart-city dashboards are rearview mirrors, CityVerse is a windshield. It ingests live traffic video, multi-pollutant sensor feeds, and energy telemetry, then compresses all of it into a latent world state and rolls that state forward in time — letting planners see the consequences of a policy decision *before* enacting it in the physical world.

The core insight: **a city is a partially observable dynamical system**. CityVerse treats it that way.

CityVerse now operates across **8 interconnected urban intelligence domains** — Traffic, Energy, Pollution, Water, Waste, Healthcare, Public Safety, and Environment — each generating city-specific metrics, forecasts, and AI-driven recommendations that cascade in real time.

---

## Architecture

CityVerse is organized around four tightly-coupled subsystems:

```
┌──────────────────────────────────────────────────────────────────────┐
│                       CITYVERSE PIPELINE                              │
│                                                                       │
│  ┌─────────────┐    ┌──────────────────┐    ┌────────────────────┐   │
│  │  Video /    │───▶│  RSSM World      │───▶│  MCTS Policy       │   │
│  │  Sensor     │    │  Model Core      │    │  Planner           │   │
│  │  Ingestion  │    │                  │    │                    │   │
│  │             │    │  Encoder (MLP)   │    │  100 rollout       │   │
│  │  YOLOv8s    │    │  GRU Dynamics    │    │  UCB1 search       │   │
│  │  Detection  │    │  State Decoder   │    │  24-action         │   │
│  │  Tracking   │    │  Reward Pred.    │    │  catalogue         │   │
│  │             │    │  (31 metrics)    │    │  (7 domains)       │   │
│  └─────────────┘    └──────────────────┘    └────────────────────┘   │
│         │                    │                        │                │
│         ▼                    ▼                        ▼                │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │             Flask REST API + WebSocket Layer                  │     │
│  │  /api/dashboard  /api/predict  /api/plan  /api/simulate      │     │
│  │  /api/water  /api/waste  /api/healthcare  /api/safety        │     │
│  │  /api/environment  /api/analytics  /api/recommendations      │     │
│  └──────────────────────────────────────────────────────────────┘     │
│         │                                                              │
│         ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │         Multi-View Web Dashboard (Jinja2 + JS)               │     │
│  │  Dashboard · Digital Twin · Simulation · Predictions         │     │
│  │  Analytics · Recommendations · Camera Analytics              │     │
│  │  ──────────────────────────────────────────────              │     │
│  │  8-KPI Strip · 6-Domain Mini-Charts · 9-Chart Analytics     │     │
│  │  City-Specific Data · Real-Time Sector Monitoring           │     │
│  └──────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
```

### Cognitive World Model (RSSM)

At the heart of CityVerse is a **Recurrent State-Space Model** inspired by DreamerV2 and PlaNet. The city's observable state — traffic volumes, AQI readings, energy demand, incident rates — is compressed by a 3-layer MLP encoder into a 64-dimensional latent vector `z`. A GRU-based dynamics model then maintains a separate deterministic hidden state `h`, and together `(h, z)` form the city's full cognitive representation.

```
Observation  →  Encoder (128→256→256→64)  →  z  ─┐
                                                   ├──▶  GRU  ──▶  h'
Action       ───────────────────────────────────────┘
                                                         │
                                                         ▼
                                              StateDecoder → ŷ (31 metrics)
                                              RewardPredictor → r̂ (8 objectives)
```

This model can be "imagined" forward in time without any additional sensor input, enabling simulation of counterfactual futures. The StateDecoder now outputs **31 urban metrics** spanning all 8 domains, and the RewardPredictor supports **8 planning objectives** including `minimize_water_loss`, `maximize_waste_recycling`, `optimize_healthcare`, `maximize_public_safety`, and `minimize_environmental_impact`.

### Monte Carlo Tree Search Planner

CityVerse does not guess at policy. The `MCTSPlanner` performs **100 UCB1-guided rollouts** per planning call, exploring a tree of depth up to 10 steps over a catalogue of **24 concrete city actions** across 7 domains — from adjusting traffic signals and boosting transit frequency to dispatching leak repair crews, reallocating hospital beds, activating carbon scrubbers, and deploying drone surveillance patrols. The planner is objective-aware: operators can target `minimize_congestion`, `minimize_pollution`, `minimize_water_loss`, `optimize_healthcare`, `maximize_public_safety`, `minimize_environmental_impact`, or `balanced` outcomes, and the search adapts accordingly.

### YOLOv8 Computer Vision Pipeline

The `video_processing/` module wraps YOLOv8s in a multi-threaded streaming pipeline. Each frame yields per-class vehicle counts (cars, trucks, buses, motorcycles), congestion density, and estimated flow speed. Features are extracted into 6D telemetry vectors that feed directly into the PyTorch LSTM time-series predictor.

---

## Features

**Cognitive World Model**
- RSSM with deterministic GRU dynamics + stochastic Gaussian latent transitions
- 3-layer Xavier-initialized MLP encoder (input→256→256→64-dim latent)
- State decoder outputting **31 city metrics** across traffic, pollution, energy, water, waste, healthcare, safety, and environment domains
- Reward predictor with **8 planning objectives** including domain-specific optimization targets
- PyTorch 2-layer LSTM predictor for 24–168 hour time-series forecasting across all 8 metrics

**Autonomous Policy Engine**
- MCTS planner with UCB1 exploration (C = √2) over 100 iterations per call
- **24-action city intervention catalogue** across traffic, energy, water, waste, healthcare, safety, and environment domains
- Scenario-constrained action selection for Close Road, Emergency Event, Heavy Rain, metro expansion, water leak, viral outbreak, safety threat, heatwave, and green initiative scenarios
- Quantified impact reasoning: per-action multi-domain reduction percentages with confidence bounds

**Computer Vision Analytics**
- YOLOv8s real-time object detection (COCO classes: car, motorcycle, bus, truck)
- Multi-threaded frame processing with thread-safe telemetry state
- Congestion density scoring and estimated flow speed
- Live video streaming endpoint via MJPEG feed

**City Simulation Engine**
- Scenario runner with 24-step forward rollouts across **9 scenario types**
- City-specific hourly traffic profiles (Mumbai, New York, Tokyo + deterministic hash fallback for any city)
- Recommendation impact modelling: **24 intervention types** with compounding multiplier logic
- Zone-aware simulation across Residential, Commercial, and Industrial districts

**Live Web Dashboard**
- 7-view dashboard: Overview, Digital Twin, Simulation, Predictions, Analytics, Recommendations, Camera Analytics
- **8-KPI strip**: Traffic Flow, AQI, Energy (MW), Active Alerts, Water Consumption, Bin Fill Level, ER Response Time, Crime Index
- **6-domain mini-chart monitoring grid**: Water, Waste, Healthcare, Safety, Environment + Activity Feed
- Interactive Leaflet/Google Maps integration with **8-metric zone popups**
- WebSocket-based live data push every 5 seconds
- Chart.js powered 24-hour historical and 168-hour forecast visualizations
- **9-chart Deep Analytics portal**: Traffic bars, Congestion doughnut, AQI line, Energy area, Water bars, Waste doughnut, Healthcare line, Safety bars, CO₂ trend
- **City-specific data generation**: every graph, pie chart, prediction, and KPI changes dynamically when you switch cities

**Data Infrastructure**
- 168 hours × 3 zones × 3 roads of synthetic traffic telemetry (traffic.csv)
- Multi-pollutant AQI time-series: PM2.5, PM10, NO2, CO, AQI (pollution.csv)
- Grid-level energy demand with solar generation tracking (energy.csv)
- 💧 Water consumption, leakage rates, reservoir levels, quality index (water.csv)
- 🗑️ Bin fill levels, recycling rates, collection routes (waste.csv)
- 🏥 Emergency response times, bed occupancy, health alert levels (healthcare.csv)
- 🛡️ Crime rates, patrol coverage, surveillance metrics, emergency response (safety.csv)
- 🌿 CO₂ concentrations, noise levels, temperature, green coverage (environment.csv)
- Scenario presets and zone geometry (JSON)

---

## 🌐 Smart City Intelligence Domains

CityVerse monitors, predicts, and optimizes across **8 interconnected urban systems**. Each domain has its own dataset, API endpoint, KPI card, analytics chart, and forecasting capability — all reactive to city selection.

| Domain | KPI Metric | API Endpoint | AI Actions | Planning Objective |
|--------|-----------|--------------|------------|-------------------|
| 🚗 **Smart Traffic** | Traffic Flow (vehicles/hr) | `/api/traffic` | `adjust_signals`, `reroute_traffic`, `increase_green_time`, `reduce_speed_limit`, `emergency_corridor` | `minimize_congestion` |
| 💨 **Air Quality** | AQI Index | `/api/pollution` | (shared with traffic & environment) | `minimize_pollution` |
| ⚡ **Smart Energy** | Grid Demand (MW) | `/api/energy` | `activate_ev_charging`, `curtail_grid_load`, `boost_solar`, `discharge_battery` | `minimize_energy` |
| 💧 **Smart Water** | Consumption (Liters) | `/api/water` | `optimize_pressure`, `leak_dispatch`, `recycle_wastewater` | `minimize_water_loss` |
| 🗑️ **Smart Waste** | Bin Fill Level (%) | `/api/waste` | `smart_waste_routing`, `bin_fill_alerts`, `sorting_efficiency` | `maximize_waste_recycling` |
| 🏥 **Smart Healthcare** | ER Response (Min) | `/api/healthcare` | `reallocate_beds`, `mobile_health_units`, `air_quality_warning` | `optimize_healthcare` |
| 🛡️ **Public Safety** | Crime Index | `/api/safety` | `dispatch_patrols`, `adjust_lighting`, `activate_surveillance` | `maximize_public_safety` |
| 🌿 **Environment** | CO₂ Level (ppm) | `/api/environment` | `activate_carbon_scrubbers`, `green_roof_incentives`, `enforce_noise_zones` | `minimize_environmental_impact` |

### Cross-Domain Intelligence

Every city switch triggers a cascade across **all 8 domains simultaneously**:
- Dashboard KPIs update with city-specific baselines
- Analytics charts regenerate with deterministic city-hashed profiles
- Prediction forecasts recalculate using city-specific hourly dynamics
- Recommendations re-rank based on the city's current metric severity
- Digital Twin map popups reflect multi-domain zone-level readings

---

## Installation

### Prerequisites

- Python 3.10+
- pip
- (Optional) CUDA-capable GPU for faster LSTM inference

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Mvkarthikeya07/CityVerse-A-Cognitive-World-Model-for-Autonomous-Smart-City-Simulation-and-Planning.git
cd CityVerse-A-Cognitive-World-Model-for-Autonomous-Smart-City-Simulation-and-Planning

# 2. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. (Optional) Regenerate synthetic datasets (all 8 domains)
python generate_data.py

# 5. Launch the application
python app.py
```

The dashboard will be available at `http://localhost:5000`.

### Dependencies

```
flask>=3.0.0
flask-cors>=4.0.0
numpy>=1.24.0
pandas>=2.0.0
scikit-learn>=1.3.0
torch>=2.0.0
matplotlib>=3.7.0
plotly>=5.15.0
gunicorn>=21.2.0
ultralytics          # YOLOv8 (auto-installs opencv-python)
```

The YOLOv8s model weights (`yolov8s.pt`, ~22 MB) are included in the repository and loaded automatically on startup.

---

## Usage

### Dashboard Views

| Route | View | Description |
|---|---|---|
| `/` | Dashboard Overview | Live 8-KPI strip, 6-domain mini-charts, map, traffic & energy charts, AI status panel |
| `/digital-twin` | Digital Twin | Interactive city map with 8-metric zone popups and AQI heatmaps |
| `/simulation` | Scenario Simulation | Run counterfactual scenarios through the world model (9 scenario types) |
| `/prediction` | Predictions | 24–168h multi-metric forecasts across all 8 domains |
| `/analytics` | Deep Analytics | 9-chart intelligence grid: traffic, congestion, AQI, energy, water, waste, healthcare, safety, CO₂ |
| `/recommendations` | AI Recommendations | Ranked intervention recommendations with multi-domain impact scores |
| `/camera` | Camera Analytics | Upload traffic video for YOLOv8 live analysis |

### Running a Simulation

Navigate to `/simulation`, select a city, choose a scenario (e.g., **Emergency Event**), set your planning objective, and click **Run Simulation**. The MCTS planner will evaluate all relevant actions against the world model and return the highest-value intervention with full causal reasoning and quantified impact.

### Uploading Traffic Video

Navigate to `/camera`, upload an MP4 file. The YOLOv8 pipeline starts immediately, streaming per-class vehicle counts and congestion scores back to the browser in real time via the `/api/video_stream` MJPEG endpoint.

### Applying Recommendations

The `/recommendations` view surfaces AI-generated interventions per city. Each recommendation includes expected traffic, AQI, and energy reductions. Clicking **Apply** posts to `/api/apply_recommendation`, which adjusts all downstream metric endpoints for that city via compounding reduction factors — making the impact visible instantly across the entire dashboard.

---

## API Reference

All endpoints accept and return JSON.

### Dashboard

```
GET /api/dashboard?city=Mumbai
```
Returns current KPIs: traffic flow, AQI, energy demand, active alerts, water flow, waste fill level, ER response time, crime index — plus zone breakdown.

### Prediction

```
POST /api/predict
{
  "city": "Mumbai, India",
  "metric": "traffic",   // "traffic" | "pollution" | "energy" | "water" | "waste" | "healthcare" | "safety" | "environment"
  "horizon": 48
}
```
Returns historical + forecast arrays with model metadata (`PyTorch LSTM` or `City Profile Dynamics`).

### Planning

```
POST /api/plan
{
  "city": "Mumbai, India",
  "scenario": "Emergency Event",
  "objective": "minimize_congestion"  // or "minimize_water_loss" | "optimize_healthcare" | "maximize_public_safety" | "minimize_environmental_impact" | "balanced"
}
```
Returns `best_actions` array with `action_name`, `expected_reward`, `confidence`, and per-domain `impacts`.

### Simulation

```
POST /api/simulate
{
  "scenario": "peak_hour",
  "steps": 24
}
```
Runs a 24-step world model rollout and returns a timeline of projected city states.

### Smart Domain Endpoints

```
GET /api/water?city=Mumbai&hours=24        # Water consumption time-series
GET /api/waste?city=Mumbai&hours=24        # Bin fill level time-series
GET /api/healthcare?city=Mumbai&hours=24   # ER response time time-series
GET /api/safety?city=Mumbai&hours=24       # Crime index time-series
GET /api/environment?city=Mumbai&hours=24  # CO₂ concentration time-series
```

Each returns `{ "labels": [...], "datasets": [{ "label": "...", "data": [...] }] }` — city-specific and recommendation-adjusted.

### Deep Analytics

```
GET /api/analytics?city=Mumbai
```
Returns 9 chart datasets: `traffic_by_zone`, `congestion_distribution`, `aqi_trends`, `energy_comparison`, `water_trends`, `waste_distribution`, `healthcare_trends`, `safety_trends`, `environment_trends` — all computed per-city.

### Recommendations

```
GET /api/recommendations?city=Tokyo
```
Returns a prioritized list of interventions with impact scores across traffic, AQI, energy, water, waste, healthcare, safety, and environment.

```
POST /api/apply_recommendation
{ "city": "Tokyo", "recommendation": "Optimize Water Pressure" }
```
Applies the recommendation's impact factors globally for that city session.

### Camera / Video

```
POST /api/upload_video          # Upload MP4, start YOLOv8 processing
POST /api/start_camera          # Start processing a previously uploaded video
POST /api/stop_camera           # Stop processing
GET  /api/video_stream          # MJPEG stream of annotated frames
GET  /api/live_telemetry        # Current vehicle counts, density, speed score
GET  /api/camera_feed           # Snapshot frame + per-class vehicle counts
```

---

## Project Structure

```
CityVerse/
│
├── app.py                        # Flask application, all REST routes (1600+ lines)
├── config.py                     # Typed dataclass config (AppConfig)
├── generate_data.py              # Synthetic dataset generator (8 domains)
├── patch.py                      # Runtime patch utilities
├── requirements.txt
├── yolov8s.pt                    # YOLOv8 small model weights
│
├── world_model/                  # Cognitive AI core
│   ├── __init__.py               # Package exports
│   ├── encoder.py                # 3-layer MLP: observation → latent z
│   ├── dynamics.py               # RSSM: GRU + stochastic latent transitions
│   ├── predictor.py              # StateDecoder (31 metrics) + RewardPredictor (8 objectives)
│   ├── lstm_predictor.py         # PyTorch 2-layer LSTM time-series model
│   ├── planner.py                # MCTS planner, 24-action catalogue, 7-domain MCTSNode
│   └── simulator.py              # End-to-end WorldModelSimulator (9 scenario types)
│
├── video_processing/             # Computer vision pipeline
│   ├── yolo_processor.py         # YOLOv8 detection + streaming
│   ├── detector.py               # Detection wrapper
│   ├── tracker.py                # Multi-object tracker
│   ├── feature_extractor.py      # Scene feature vectors
│   ├── congestion_estimator.py   # Density & congestion scoring
│   ├── speed_estimator.py        # Optical flow speed estimation
│   ├── camera_manager.py         # Thread-safe camera session manager
│   └── video_loader.py           # File-based video loader
│
├── data/                         # Simulation datasets (8 domains)
│   ├── traffic.csv               # 168h × 3 zones × 3 roads traffic telemetry
│   ├── pollution.csv             # 168h multi-pollutant AQI time-series
│   ├── energy.csv                # 168h grid demand & solar generation
│   ├── water.csv                 # 💧 Consumption, leakage, reservoir, quality
│   ├── waste.csv                 # 🗑️ Bin fill, recycling, route efficiency
│   ├── healthcare.csv            # 🏥 ER response, bed occupancy, health alerts
│   ├── safety.csv                # 🛡️ Crime rate, patrol coverage, surveillance
│   ├── environment.csv           # 🌿 CO₂, noise, temperature, green cover
│   ├── zones.json                # Zone geometry and metadata
│   └── scenarios.json            # Scenario presets (9 types)
│
├── templates/                    # Jinja2 HTML views
│   ├── base.html                 # Layout shell, nav, WebSocket init
│   ├── index.html                # Dashboard overview (8-KPI + 6-domain grid)
│   ├── digital_twin.html         # Interactive digital twin (8-metric popups)
│   ├── simulation.html           # Scenario runner (9 scenarios)
│   ├── prediction.html           # Forecast charts (8 metrics)
│   ├── analytics.html            # Deep analytics (9-chart grid)
│   ├── recommendations.html      # AI recommendations panel
│   ├── camera_analytics.html     # Camera / YOLOv8 view
│   └── settings.html             # App settings
│
├── static/
│   ├── css/                      # Per-view stylesheets + animations
│   ├── js/                       # Charts, map, WebSocket, simulation, digital-twin JS
│   │   ├── charts.js             # Chart.js factory (line, bar, doughnut, radar, area)
│   │   ├── dashboard.js          # 8-domain KPI fetching + mini-chart rendering
│   │   ├── analytics.js          # 9-chart deep analytics rendering
│   │   ├── prediction.js         # 8-metric forecast module
│   │   ├── simulation.js         # Scenario simulation + MCTS visualization
│   │   ├── global-state.js       # City selection state + cross-portal sync
│   │   ├── google-map.js         # Leaflet map + 8-metric zone popups
│   │   └── websocket.js          # Real-time data push
│   └── data/
│       └── cities.json           # City dataset with base metrics
│
├── models/                       # Saved model checkpoints (gitkeep)
└── uploads/                      # Runtime video upload staging (gitkeep)
```

---

## Configuration

All runtime constants live in `config.py` as a typed `AppConfig` dataclass. Key parameters:

| Parameter | Default | Description |
|---|---|---|
| `INPUT_DIM` | 128 | Observation feature vector size |
| `LATENT_DIM` | 64 | RSSM latent state dimensionality |
| `HIDDEN_DIM` | 256 | Encoder hidden layer width |
| `ACTION_DIM` | 32 | Action vector size (expanded for 24 actions) |
| `PLANNING_HORIZON` | 10 | Max MCTS lookahead depth |
| `MCTS_ITERATIONS` | 100 | Rollouts per planning call |
| `MCTS_EXPLORATION` | 1.414 | UCB1 exploration constant (√2) |
| `WS_UPDATE_INTERVAL` | 5 | Live dashboard push interval (seconds) |
| `DETECTION_CONFIDENCE` | 0.5 | YOLOv8 detection threshold |
| `METRICS` | 31 | Total city metrics decoded by StateDecoder |

---

## Recommendation Intervention Catalogue

### Core Infrastructure Interventions

| Key | Intervention | Traffic Reduction | AQI Reduction | Energy Reduction |
|---|---|---|---|---|
| `rec_bus_freq` | Increase Bus Frequency | 16% | 20% | — |
| `rec_signal_opt` | Signal Timing Optimization | 20% | — | — |
| `rec_eco_routing` | Eco-Route Guidance | 10% | 15% | — |
| `rec_low_emission_zone` | Low Emission Zone | 14% | 22% | — |
| `rec_load_shifting` | Load Shifting | — | — | 15% |
| `rec_smart_grid` | Smart Grid Activation | — | — | 12% |
| `rec_preventive_maintenance` | Predictive Maintenance | 5% | — | — |
| `rec_green_spaces` | Urban Green Corridors | — | 5% | — |
| `rec_energy_efficiency` | Building Efficiency | — | — | 10% |

### Smart Domain Interventions

| Key | Intervention | Domain | Reduction |
|---|---|---|---|
| `rec_pressure_optimization` | Optimize Water Pressure | 💧 Water | 15% |
| `rec_leak_repair` | Smart Leak Dispatch | 💧 Water | 25% |
| `rec_wastewater_recycling` | Wastewater Recycling | 💧 Water | 20% |
| `rec_smart_routing` | Smart Waste Routing | 🗑️ Waste | 20% |
| `rec_fill_alerts` | Bin Fill Alerts | 🗑️ Waste | 15% |
| `rec_sort_efficiency` | Sorting Efficiency | 🗑️ Waste | 20% |
| `rec_bed_reallocation` | Hospital Bed Reallocation | 🏥 Healthcare | 20% |
| `rec_mobile_clinics` | Mobile Health Units | 🏥 Healthcare | 25% |
| `rec_health_warnings` | Air Quality Health Warnings | 🏥 Healthcare | 15% |
| `rec_police_patrols` | Smart Police Patrols | 🛡️ Safety | 25% |
| `rec_smart_streetlights` | Smart Streetlights | 🛡️ Safety | 15% |
| `rec_drone_patrols` | Drone Surveillance | 🛡️ Safety | 20% |
| `rec_carbon_scrubbing` | Carbon Scrubber Activation | 🌿 Environment | 20% |
| `rec_urban_greening` | Urban Greening Program | 🌿 Environment | 15% |
| `rec_noise_enforcement` | Noise Zone Enforcement | 🌿 Environment | 20% |

Reductions compound multiplicatively when multiple recommendations are applied simultaneously.

---

## 🎬 Live Demo — System Output Video

<p align="center">
  <a href="https://drive.google.com/file/d/1ZdoZbQ07JtcZzzky4s8Fi-Ud0v-VfwGC/view?usp=drive_link">
    <img src="https://img.shields.io/badge/▶%20WATCH%20FULL%20DEMO-Google%20Drive-4285F4?style=for-the-badge&logo=googledrive&logoColor=white"/>
  </a>
</p>

This output recording is a **complete end-to-end walkthrough** of CityVerse operating live — from raw sensor ingestion to autonomous AI-driven policy decisions. Every frame is real system output, zero scripted mockups.

| Timestamp | Feature Demonstrated |
|-----------|----------------------|
| `00:00 – 00:30` | 🚀 **System Boot** — Flask server startup, model weight loading, RSSM initialization |
| `00:30 – 01:30` | 📊 **Live Dashboard Overview** — Real-time 8-KPI strip (Traffic, AQI, Energy, Alerts, Water, Waste, Healthcare, Safety) across Mumbai, New York, Tokyo |
| `01:30 – 02:30` | 🧠 **Cognitive World Model in Action** — RSSM latent state compression, GRU dynamics rollout, 64-dim city state → 31 metric decoding |
| `02:30 – 03:30` | 🗺️ **Digital Twin View** — Interactive zone overlay with 8-metric popups (Traffic, AQI, Energy, Water, Waste, ER Load, Crime, CO₂) |
| `03:30 – 05:00` | 🔮 **LSTM Forecasting** — 24h → 168h predictions across all 8 domains: traffic, AQI, energy, water, waste, healthcare, safety, environment |
| `05:00 – 06:30` | 🎯 **MCTS Autonomous Planner** — 100-rollout UCB1 tree search over 24-action catalogue spanning 7 domains |
| `06:30 – 07:30` | 🚗 **YOLOv8 Camera Analytics** — Real-time vehicle detection on traffic video: per-class counts, congestion density, flow speed |
| `07:30 – 08:30` | 💡 **AI Recommendations Engine** — 24 intervention types with quantified multi-domain impact scores |
| `08:30 – 09:00` | ✅ **Apply Recommendation** — Single-click policy application with immediate cascade across all 8 domain KPIs |

```
✦  RSSM world model compresses 128-dim city observations → 64-dim latent state in real time
✦  StateDecoder outputs 31 urban metrics across 8 interconnected domains
✦  MCTS planner explores 24-action catalogue over 100 iterations and returns top intervention in <2s
✦  RewardPredictor evaluates 8 domain-specific planning objectives per rollout
✦  YOLOv8s detects cars, trucks, buses, motorcycles at 30fps with live MJPEG stream
✦  WebSocket push refreshes all 7 dashboard views every 5 seconds — zero page reload
✦  Applying a recommendation visibly shifts KPIs across all 8 domains instantly
✦  Switching cities regenerates all graphs, pie charts, and predictions with city-specific data
```

## Roadmap

- [x] Multi-domain smart city intelligence (Water, Waste, Healthcare, Safety, Environment)
- [x] City-specific dynamic data generation across all portals
- [x] 24-action cross-domain MCTS planning with 8 optimization objectives
- [x] 9-chart deep analytics portal with per-city data
- [x] 8-metric digital twin zone popups
- [ ] Live integration with real traffic sensor APIs (TomTom, HERE, Google Maps Platform)
- [ ] Persistent world model training loop on rolling sensor data
- [ ] Multi-city federated planning with cross-city policy transfer
- [ ] Digital twin 3D rendering upgrade (Three.js / Deck.gl)
- [ ] REST → WebSocket migration for low-latency planning responses
- [ ] Docker + Gunicorn production deployment configuration
- [ ] Exported ONNX world model for edge deployment

---
---

## License

MIT License — see [LICENSE](LICENSE) for full terms.

---

<div align="center">

**Built to model the cities of tomorrow.**

*CityVerse — where urban intelligence meets machine imagination.*

</div>
