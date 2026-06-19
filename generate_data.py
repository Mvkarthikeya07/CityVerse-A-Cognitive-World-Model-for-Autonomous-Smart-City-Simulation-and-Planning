"""Generate all CSV data files for CityMind-AI."""
import csv
import math
import random
import json
import os
from datetime import datetime, timedelta

random.seed(42)

# Dynamic path resolution to work regardless of folder movement
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(BASE_DIR, "data")
os.makedirs(BASE, exist_ok=True)

# ── Zone metadata ──────────────────────────────────────────────────────
zones = ["Zone_A", "Zone_B", "Zone_C"]
zone_coords = {
    "Zone_A": (40.7180, -74.0020),  # residential – north
    "Zone_B": (40.7128, -74.0060),  # commercial – center
    "Zone_C": (40.7050, -74.0110),  # industrial – south-west
}

start = datetime(2026, 1, 1, 0, 0)
hours = 7 * 24  # 168 hours

# ═══════════════════════════════════════════════════════════════════════
#  TRAFFIC.CSV
# ═══════════════════════════════════════════════════════════════════════
road_ids = {
    "Zone_A": ["RA-101", "RA-102", "RA-103"],
    "Zone_B": ["RB-201", "RB-202", "RB-203"],
    "Zone_C": ["RC-301", "RC-302", "RC-303"],
}

def traffic_pattern(hour, zone):
    """Return (vehicle_count, avg_speed, incidents) based on hour & zone."""
    rush_morning = math.exp(-0.5 * ((hour - 8.5) / 1.5) ** 2)
    rush_evening = math.exp(-0.5 * ((hour - 17.5) / 2.0) ** 2)
    night_dip    = max(0, math.cos(math.pi * (hour - 3) / 12)) if hour < 6 else 0

    base = 0.15 + 0.55 * rush_morning + 0.65 * rush_evening - 0.12 * night_dip

    if zone == "Zone_A":  # residential – moderate
        count = int(120 + 380 * base + random.gauss(0, 25))
        speed = max(15, 55 - 30 * base + random.gauss(0, 4))
    elif zone == "Zone_B":  # commercial – high
        count = int(200 + 600 * base + random.gauss(0, 40))
        speed = max(10, 50 - 35 * base + random.gauss(0, 5))
    else:  # industrial – heavy trucks, steadier
        truck_shift = math.exp(-0.5 * ((hour - 11) / 4) ** 2)
        count = int(100 + 350 * (0.4 * base + 0.6 * truck_shift) + random.gauss(0, 20))
        speed = max(12, 45 - 25 * base + random.gauss(0, 3))

    count = max(10, count)
    speed = round(speed, 1)

    norm = (count - 10) / 800
    if norm < 0.3:
        cong = "low"
    elif norm < 0.55:
        cong = "medium"
    elif norm < 0.8:
        cong = "high"
    else:
        cong = "critical"

    inc_prob = 0.02 + 0.08 * base
    incidents = 1 if random.random() < inc_prob else 0
    if random.random() < 0.005:
        incidents = 2  # rare multi-incident

    return count, speed, cong, incidents

rows_t = []
for h in range(hours):
    ts = start + timedelta(hours=h)
    ts_str = ts.strftime("%Y-%m-%d %H:%M")
    hour = ts.hour
    for z in zones:
        count, speed, cong, inc = traffic_pattern(hour, z)
        lat = zone_coords[z][0] + random.uniform(-0.003, 0.003)
        lng = zone_coords[z][1] + random.uniform(-0.003, 0.003)
        rid = random.choice(road_ids[z])
        rows_t.append([ts_str, z, count, speed, cong, inc, rid, round(lat, 6), round(lng, 6)])

with open(os.path.join(BASE, "traffic.csv"), "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["timestamp","zone","vehicle_count","avg_speed_kmh","congestion_level","incidents","road_id","lat","lng"])
    w.writerows(rows_t)

print(f"traffic.csv generated: {len(rows_t)} rows")

# ═══════════════════════════════════════════════════════════════════════
#  POLLUTION.CSV
# ═══════════════════════════════════════════════════════════════════════
def pollution_pattern(hour, zone, vehicle_count):
    traffic_norm = vehicle_count / 800.0
    temp = 8 + 10 * math.sin(math.pi * (hour - 6) / 16) + random.gauss(0, 1.5)
    temp = round(max(-2, min(35, temp)), 1)
    humidity = 70 - 20 * math.sin(math.pi * (hour - 6) / 16) + random.gauss(0, 5)
    humidity = round(max(25, min(95, humidity)), 1)
    wind = round(max(0.5, 3 + 4 * math.sin(math.pi * hour / 12) + random.gauss(0, 1.5)), 1)

    if zone == "Zone_A":
        pm25_base, pm10_base, no2_base, co_base = 12, 25, 18, 0.4
    elif zone == "Zone_B":
        pm25_base, pm10_base, no2_base, co_base = 18, 35, 28, 0.7
    else:  # industrial
        pm25_base, pm10_base, no2_base, co_base = 30, 55, 42, 1.2

    pm25 = round(pm25_base + 25 * traffic_norm + random.gauss(0, 3), 1)
    pm10 = round(pm10_base + 35 * traffic_norm + random.gauss(0, 5), 1)
    no2  = round(no2_base  + 30 * traffic_norm + random.gauss(0, 4), 1)
    co   = round(co_base   + 1.5 * traffic_norm + random.gauss(0, 0.15), 2)

    aqi = int(pm25 * 2.2 + no2 * 0.5 + random.gauss(0, 5))
    aqi = max(15, min(350, aqi))

    return pm25, pm10, no2, co, aqi, temp, humidity, wind

rows_p = []
for h in range(hours):
    ts = start + timedelta(hours=h)
    ts_str = ts.strftime("%Y-%m-%d %H:%M")
    hour = ts.hour
    for z in zones:
        vc = rows_t[h * 3 + zones.index(z)][2]
        pm25, pm10, no2, co, aqi, temp, hum, ws = pollution_pattern(hour, z, vc)
        rows_p.append([ts_str, z, pm25, pm10, no2, co, aqi, temp, hum, ws])

with open(os.path.join(BASE, "pollution.csv"), "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["timestamp","zone","pm25","pm10","no2","co","aqi","temperature","humidity","wind_speed"])
    w.writerows(rows_p)

print(f"pollution.csv generated: {len(rows_p)} rows")

# ═══════════════════════════════════════════════════════════════════════
#  ENERGY.CSV
# ═══════════════════════════════════════════════════════════════════════
def energy_pattern(hour, zone):
    if 6 <= hour <= 19:
        solar_norm = math.exp(-0.5 * ((hour - 12.5) / 3.0) ** 2)
    else:
        solar_norm = 0.0

    wind_norm = 0.3 + 0.4 * math.sin(math.pi * hour / 12) + random.gauss(0, 0.1)
    wind_norm = max(0, min(1, wind_norm))

    cons_evening = math.exp(-0.5 * ((hour - 19) / 3) ** 2)
    cons_morning = math.exp(-0.5 * ((hour - 10) / 3) ** 2)
    cons_night   = 0.25 if hour < 5 or hour > 23 else 0

    if zone == "Zone_A":  # residential
        base_kwh = 450
        cons = base_kwh * (0.35 + 0.45 * cons_evening + 0.15 * cons_morning + cons_night)
        solar = round(120 * solar_norm + random.gauss(0, 8), 1)
        wind  = round(40 * wind_norm + random.gauss(0, 5), 1)
    elif zone == "Zone_B":  # commercial
        work_hours = math.exp(-0.5 * ((hour - 13) / 4) ** 2)
        base_kwh = 800
        cons = base_kwh * (0.2 + 0.65 * work_hours + 0.1 * cons_evening + cons_night * 0.5)
        solar = round(250 * solar_norm + random.gauss(0, 15), 1)
        wind  = round(80 * wind_norm + random.gauss(0, 8), 1)
    else:  # industrial
        shift_norm = 0.6 if 7 <= hour <= 20 else 0.2
        base_kwh = 650
        cons = base_kwh * (shift_norm + 0.15 * cons_evening + random.gauss(0, 0.05))
        solar = round(180 * solar_norm + random.gauss(0, 10), 1)
        wind  = round(100 * wind_norm + random.gauss(0, 10), 1)

    cons = round(max(50, cons + random.gauss(0, 20)), 1)
    solar = max(0, solar)
    wind  = max(0, wind)

    grid_load = round(max(10, min(100, (cons - solar - wind) / cons * 100 + random.gauss(0, 3))), 1)
    peak_demand = 1 if cons > base_kwh * 0.75 else 0

    return cons, solar, wind, grid_load, peak_demand

rows_e = []
for h in range(hours):
    ts = start + timedelta(hours=h)
    ts_str = ts.strftime("%Y-%m-%d %H:%M")
    hour = ts.hour
    for z in zones:
        cons, solar, wind, gl, pd_ = energy_pattern(hour, z)
        rows_e.append([ts_str, z, cons, solar, wind, gl, pd_])

with open(os.path.join(BASE, "energy.csv"), "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["timestamp","zone","consumption_kwh","solar_kwh","wind_kwh","grid_load_pct","peak_demand"])
    w.writerows(rows_e)

print(f"energy.csv generated: {len(rows_e)} rows")

# ═══════════════════════════════════════════════════════════════════════
#  WATER.CSV (NEW)
# ═══════════════════════════════════════════════════════════════════════
def water_pattern(hour, zone):
    """Water consumption, leakage, and reservoir level cycles."""
    morning_peak = math.exp(-0.5 * ((hour - 7.5) / 1.2) ** 2)
    evening_peak = math.exp(-0.5 * ((hour - 18.5) / 1.5) ** 2)
    base_cons = 0.2 + 0.5 * morning_peak + 0.4 * evening_peak

    if zone == "Zone_A":  # residential
        liters = int(15000 + 35000 * base_cons + random.gauss(0, 1000))
        leak_rate = round(5.0 + random.uniform(1.0, 4.0), 2)
        quality = round(92.0 + random.uniform(-2, 3), 1)
    elif zone == "Zone_B":  # commercial
        work_peak = math.exp(-0.5 * ((hour - 13.0) / 4.0) ** 2)
        liters = int(10000 + 45000 * work_peak + random.gauss(0, 1200))
        leak_rate = round(7.0 + random.uniform(2.0, 5.0), 2)
        quality = round(90.0 + random.uniform(-3, 3), 1)
    else:  # industrial
        steady_cons = 0.6 if 8 <= hour <= 18 else 0.3
        liters = int(25000 + 25000 * steady_cons + random.gauss(0, 1500))
        leak_rate = round(10.0 + random.uniform(3.0, 7.0), 2)
        quality = round(85.0 + random.uniform(-4, 4), 1)

    liters = max(2000, liters)
    refill = max(0, math.cos(math.pi * (hour - 3) / 6)) if (hour < 5 or hour > 22) else 0
    drain = base_cons * 0.15
    res_level = round(85.0 + 10.0 * refill - 12.0 * drain + random.uniform(-1, 1), 1)
    res_level = max(30.0, min(100.0, res_level))

    return liters, leak_rate, quality, res_level

rows_w = []
for h in range(hours):
    ts = start + timedelta(hours=h)
    ts_str = ts.strftime("%Y-%m-%d %H:%M")
    hour = ts.hour
    for z in zones:
        liters, leak_rate, qual, res = water_pattern(hour, z)
        rows_w.append([ts_str, z, liters, leak_rate, qual, res])

with open(os.path.join(BASE, "water.csv"), "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["timestamp","zone","consumption_liters","leakage_rate_pct","water_quality_index","reservoir_level_pct"])
    w.writerows(rows_w)

print(f"water.csv generated: {len(rows_w)} rows")

# ═══════════════════════════════════════════════════════════════════════
#  WASTE.CSV (NEW)
# ═══════════════════════════════════════════════════════════════════════
def waste_pattern(hour, zone, day_idx):
    """Waste bin fill levels, recycling rates, and route efficiency."""
    accum_factor = min(100.0, (hour % 24) * 4.5 + random.uniform(0, 5))
    if 4 <= hour <= 7:
        fill_level = max(5.0, accum_factor * 0.15)
        collected = round(5.0 + random.uniform(1.0, 4.0), 1)
        efficiency = round(85.0 + random.uniform(-5, 8), 1)
    else:
        fill_level = min(98.0, 15.0 + accum_factor)
        collected = 0.0
        efficiency = round(70.0 + random.uniform(-8, 5), 1)

    if zone == "Zone_A":
        recycle = round(45.0 + random.uniform(-5, 10), 1)
    elif zone == "Zone_B":
        recycle = round(35.0 + random.uniform(-4, 8), 1)
    else:
        recycle = round(20.0 + random.uniform(-6, 6), 1)

    fill_level = round(fill_level, 1)
    recycle = max(5.0, min(95.0, recycle))
    efficiency = max(30.0, min(100.0, efficiency))

    return fill_level, recycle, collected, efficiency

rows_ws = []
for h in range(hours):
    ts = start + timedelta(hours=h)
    ts_str = ts.strftime("%Y-%m-%d %H:%M")
    hour = ts.hour
    day_idx = h // 24
    for z in zones:
        fill, rec, col, eff = waste_pattern(hour, z, day_idx)
        rows_ws.append([ts_str, z, fill, rec, col, eff])

with open(os.path.join(BASE, "waste.csv"), "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["timestamp","zone","bin_fill_level_pct","recycle_rate_pct","waste_collected_tons","route_efficiency_pct"])
    w.writerows(rows_ws)

print(f"waste.csv generated: {len(rows_ws)} rows")

# ═══════════════════════════════════════════════════════════════════════
#  HEALTHCARE.CSV (NEW)
# ═══════════════════════════════════════════════════════════════════════
def healthcare_pattern(hour, zone, traffic_count, aqi):
    """Healthcare bed occupancy, response times, patient intake."""
    congestion_ratio = traffic_count / 800.0
    resp_time = round(8.0 + 15.0 * congestion_ratio + random.uniform(-1, 2), 1)
    resp_time = max(3.0, resp_time)

    pollution_load = aqi / 300.0
    bed_occ = round(65.0 + 20.0 * pollution_load + 8.0 * math.sin(math.pi * hour / 12) + random.uniform(-3, 3), 1)
    bed_occ = max(10.0, min(100.0, bed_occ))

    intake = int(5 + 15 * pollution_load + 10 * math.exp(-0.5 * ((hour - 14) / 4) ** 2) + random.gauss(0, 2))
    intake = max(0, intake)

    if bed_occ > 90.0 or resp_time > 20.0:
        alert = 3
    elif bed_occ > 80.0 or resp_time > 15.0 or aqi > 180:
        alert = 2
    elif bed_occ > 65.0 or resp_time > 10.0:
        alert = 1
    else:
        alert = 0

    return bed_occ, resp_time, intake, alert

rows_h = []
for h in range(hours):
    ts = start + timedelta(hours=h)
    ts_str = ts.strftime("%Y-%m-%d %H:%M")
    hour = ts.hour
    for z in zones:
        vc = rows_t[h * 3 + zones.index(z)][2]
        aq = rows_p[h * 3 + zones.index(z)][6]
        bed, resp, intake, alert = healthcare_pattern(hour, z, vc, aq)
        rows_h.append([ts_str, z, bed, resp, intake, alert])

with open(os.path.join(BASE, "healthcare.csv"), "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["timestamp","zone","bed_occupancy_pct","emergency_response_min","patient_intake_rate","health_alert_level"])
    w.writerows(rows_h)

print(f"healthcare.csv generated: {len(rows_h)} rows")

# ═══════════════════════════════════════════════════════════════════════
#  SAFETY.CSV (NEW)
# ═══════════════════════════════════════════════════════════════════════
def safety_pattern(hour, zone):
    """Crime index, patrol coverage, response times, surveillance."""
    night_peak = math.exp(-0.5 * ((hour - 1.0) / 3.0) ** 2) or math.exp(-0.5 * ((hour - 25.0) / 3.0) ** 2)
    
    if zone == "Zone_A":  # residential
        crime_index = round(10.0 + 20.0 * night_peak + random.uniform(-2, 4), 1)
        patrol_cov = round(75.0 - 15.0 * night_peak + random.uniform(-5, 5), 1)
        resp_time = round(6.0 + 4.0 * night_peak + random.uniform(-1, 1.5), 1)
        surveillance = round(80.0 + random.uniform(-3, 3), 1)
    elif zone == "Zone_B":  # commercial
        crime_index = round(20.0 + 40.0 * night_peak + random.uniform(-4, 8), 1)
        patrol_cov = round(85.0 - 20.0 * night_peak + random.uniform(-4, 4), 1)
        resp_time = round(5.0 + 5.0 * night_peak + random.uniform(-1, 2.0), 1)
        surveillance = round(92.0 + random.uniform(-1, 2), 1)
    else:  # industrial
        crime_index = round(15.0 + 35.0 * night_peak + random.uniform(-3, 6), 1)
        patrol_cov = round(60.0 - 25.0 * night_peak + random.uniform(-6, 6), 1)
        resp_time = round(9.0 + 7.0 * night_peak + random.uniform(-2, 3.0), 1)
        surveillance = round(65.0 + random.uniform(-5, 5), 1)

    crime_index = max(1.0, min(100.0, crime_index))
    patrol_cov = max(10.0, min(100.0, patrol_cov))
    resp_time = max(2.0, resp_time)
    surveillance = max(20.0, min(100.0, surveillance))

    return crime_index, patrol_cov, resp_time, surveillance

rows_s = []
for h in range(hours):
    ts = start + timedelta(hours=h)
    ts_str = ts.strftime("%Y-%m-%d %H:%M")
    hour = ts.hour
    for z in zones:
        crime, patrol, resp, surv = safety_pattern(hour, z)
        rows_s.append([ts_str, z, crime, patrol, resp, surv])

with open(os.path.join(BASE, "safety.csv"), "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["timestamp","zone","crime_rate_index","police_patrol_coverage_pct","emergency_response_time_min","surveillance_coverage_pct"])
    w.writerows(rows_s)

print(f"safety.csv generated: {len(rows_s)} rows")

# ═══════════════════════════════════════════════════════════════════════
#  ENVIRONMENT.CSV (NEW)
# ═══════════════════════════════════════════════════════════════════════
def environment_pattern(hour, zone, traffic_count, aqi, temp, hum):
    """CO2 levels, noise level, temperature, humidity, green cover."""
    traffic_ratio = traffic_count / 800.0
    if zone == "Zone_C":  # industrial
        co2 = round(420.0 + 80.0 * traffic_ratio + 50.0 * (1.0 - math.exp(-0.5 * ((hour - 12) / 6) ** 2)) + random.gauss(0, 5), 1)
        noise = round(65.0 + 15.0 * traffic_ratio + random.uniform(-3, 3), 1)
        green = round(12.0 + random.uniform(-1, 1), 1)
    elif zone == "Zone_B":  # commercial
        co2 = round(410.0 + 70.0 * traffic_ratio + random.gauss(0, 4), 1)
        noise = round(60.0 + 18.0 * traffic_ratio + random.uniform(-2, 3), 1)
        green = round(20.0 + random.uniform(-1.5, 1.5), 1)
    else:  # residential
        co2 = round(400.0 + 40.0 * traffic_ratio + random.gauss(0, 3), 1)
        noise = round(45.0 + 10.0 * traffic_ratio + random.uniform(-4, 2), 1)
        green = round(38.0 + random.uniform(-2, 2), 1)

    co2 = max(380.0, co2)
    noise = max(30.0, noise)
    green = max(5.0, min(95.0, green))

    return co2, noise, temp, hum, green

rows_env = []
for h in range(hours):
    ts = start + timedelta(hours=h)
    ts_str = ts.strftime("%Y-%m-%d %H:%M")
    hour = ts.hour
    for z in zones:
        vc = rows_t[h * 3 + zones.index(z)][2]
        aq = rows_p[h * 3 + zones.index(z)][6]
        tp = rows_p[h * 3 + zones.index(z)][7]
        hm = rows_p[h * 3 + zones.index(z)][8]
        co2, noise, temp, hum, green = environment_pattern(hour, z, vc, aq, tp, hm)
        rows_env.append([ts_str, z, co2, noise, temp, hum, green])

with open(os.path.join(BASE, "environment.csv"), "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["timestamp","zone","co2_level_ppm","noise_level_db","temperature_c","humidity_pct","green_cover_pct"])
    w.writerows(rows_env)

print(f"environment.csv generated: {len(rows_env)} rows")

# ═══════════════════════════════════════════════════════════════════════
#  ZONES.JSON
# ═══════════════════════════════════════════════════════════════════════
zones_json = [
    {
        "id": "Zone_A",
        "name": "Greenfield Heights",
        "type": "residential",
        "center": {"lat": 40.7180, "lng": -74.0020},
        "bounds": [
            [40.7210, -74.0060], [40.7210, -73.9980],
            [40.7150, -73.9980], [40.7150, -74.0060]
        ],
        "color": "#4CAF50",
        "population": 45200,
        "area_sqkm": 3.8,
        "sensors": {"traffic": 12, "pollution": 8, "energy": 6, "water": 8, "waste": 6, "healthcare": 4, "safety": 8, "environment": 10}
    },
    {
        "id": "Zone_B",
        "name": "Metro Central",
        "type": "commercial",
        "center": {"lat": 40.7128, "lng": -74.0060},
        "bounds": [
            [40.7158, -74.0100], [40.7158, -74.0020],
            [40.7098, -74.0020], [40.7098, -74.0100]
        ],
        "color": "#2196F3",
        "population": 28500,
        "area_sqkm": 2.4,
        "sensors": {"traffic": 18, "pollution": 10, "energy": 9, "water": 10, "waste": 8, "healthcare": 6, "safety": 12, "environment": 12}
    },
    {
        "id": "Zone_C",
        "name": "Ironworks District",
        "type": "industrial",
        "center": {"lat": 40.7050, "lng": -74.0110},
        "bounds": [
            [40.7085, -74.0160], [40.7085, -74.0060],
            [40.7015, -74.0060], [40.7015, -74.0160]
        ],
        "color": "#FF9800",
        "population": 12800,
        "area_sqkm": 4.2,
        "sensors": {"traffic": 10, "pollution": 12, "energy": 8, "water": 6, "waste": 10, "healthcare": 4, "safety": 10, "environment": 8}
    }
]

with open(os.path.join(BASE, "zones.json"), "w") as f:
    json.dump(zones_json, f, indent=2)

print("zones.json written")

# ═══════════════════════════════════════════════════════════════════════
#  SCENARIOS.JSON
# ═══════════════════════════════════════════════════════════════════════
scenarios_json = [
    {
        "id": "baseline",
        "name": "Normal Day Operations",
        "description": "Standard weekday traffic, energy, and environmental patterns with no extraordinary events.",
        "icon": "fa-city",
        "parameters": {
            "traffic_multiplier": 1.0,
            "pollution_multiplier": 1.0,
            "energy_multiplier": 1.0,
            "water_multiplier": 1.0,
            "waste_multiplier": 1.0,
            "incident_probability": 0.03,
            "duration_hours": 24
        },
        "expected_outcomes": {
            "avg_congestion": "medium",
            "avg_aqi": 85,
            "peak_energy_kwh": 780,
            "estimated_incidents": 2
        }
    },
    {
        "id": "peak_hour",
        "name": "Rush Hour Stress Test",
        "description": "Simulates extreme rush-hour conditions with 40% more vehicles and reduced average speeds across all zones.",
        "icon": "fa-car-burst",
        "parameters": {
            "traffic_multiplier": 1.4,
            "pollution_multiplier": 1.25,
            "energy_multiplier": 1.1,
            "water_multiplier": 1.05,
            "waste_multiplier": 1.05,
            "incident_probability": 0.08,
            "duration_hours": 6
        },
        "expected_outcomes": {
            "avg_congestion": "high",
            "avg_aqi": 120,
            "peak_energy_kwh": 850,
            "estimated_incidents": 5
        }
    },
    {
        "id": "city_event",
        "name": "Major City Event",
        "description": "Large-scale public event (concert/sports game) drawing 50,000+ attendees to Metro Central, causing localized congestion spikes.",
        "icon": "fa-calendar-star",
        "parameters": {
            "traffic_multiplier": 1.6,
            "pollution_multiplier": 1.3,
            "energy_multiplier": 1.35,
            "water_multiplier": 1.3,
            "waste_multiplier": 1.4,
            "incident_probability": 0.06,
            "event_zone": "Zone_B",
            "attendees": 52000,
            "duration_hours": 8
        },
        "expected_outcomes": {
            "avg_congestion": "high",
            "avg_aqi": 110,
            "peak_energy_kwh": 950,
            "estimated_incidents": 4
        }
    },
    {
        "id": "emergency",
        "name": "Emergency Response",
        "description": "Major traffic accident on arterial road in Ironworks District requiring lane closures and emergency vehicle routing.",
        "icon": "fa-triangle-exclamation",
        "parameters": {
            "traffic_multiplier": 1.3,
            "pollution_multiplier": 1.15,
            "energy_multiplier": 1.05,
            "water_multiplier": 1.0,
            "waste_multiplier": 1.0,
            "incident_probability": 0.15,
            "blocked_roads": ["RC-301", "RC-302"],
            "emergency_zone": "Zone_C",
            "duration_hours": 4
        },
        "expected_outcomes": {
            "avg_congestion": "critical",
            "avg_aqi": 135,
            "peak_energy_kwh": 800,
            "estimated_incidents": 8
        }
    },
    {
        "id": "green_initiative",
        "name": "Green Initiative Policy",
        "description": "Test reduced-emission policies: 20% EV adoption increase, speed limit reductions, expanded public transit, and solar incentives.",
        "icon": "fa-leaf",
        "parameters": {
            "traffic_multiplier": 0.85,
            "pollution_multiplier": 0.65,
            "energy_multiplier": 0.9,
            "water_multiplier": 0.95,
            "waste_multiplier": 0.95,
            "incident_probability": 0.02,
            "ev_adoption_pct": 0.35,
            "public_transit_boost": 1.25,
            "solar_capacity_boost": 1.4,
            "duration_hours": 24
        },
        "expected_outcomes": {
            "avg_congestion": "low",
            "avg_aqi": 55,
            "peak_energy_kwh": 680,
            "estimated_incidents": 1
        }
    },
    {
        "id": "water_leak",
        "name": "Water Main Leak",
        "description": "Critical water main burst detected in Residential Greenfield Heights. Grid pressure drops, endangering municipal reserves.",
        "icon": "fa-faucet-drip",
        "parameters": {
            "traffic_multiplier": 1.05,
            "pollution_multiplier": 1.0,
            "energy_multiplier": 1.0,
            "water_multiplier": 1.5,
            "waste_multiplier": 1.0,
            "incident_probability": 0.05,
            "leak_zone": "Zone_A",
            "duration_hours": 12
        },
        "expected_outcomes": {
            "avg_congestion": "medium",
            "avg_aqi": 75,
            "peak_energy_kwh": 700,
            "estimated_incidents": 3
        }
    },
    {
        "id": "waste_backlog",
        "name": "Waste Collection Backlog",
        "description": "Industrial action by sanitation operators creates trash overflows at multiple commercial collection sites in Metro Central.",
        "icon": "fa-trash-can",
        "parameters": {
            "traffic_multiplier": 1.1,
            "pollution_multiplier": 1.15,
            "energy_multiplier": 1.0,
            "water_multiplier": 1.0,
            "waste_multiplier": 1.6,
            "incident_probability": 0.04,
            "backlog_zone": "Zone_B",
            "duration_hours": 48
        },
        "expected_outcomes": {
            "avg_congestion": "medium",
            "avg_aqi": 95,
            "peak_energy_kwh": 710,
            "estimated_incidents": 2
        }
    },
    {
        "id": "viral_outbreak",
        "name": "Viral Outbreak / Pandemic",
        "description": "Sudden seasonal outbreak triggers major spikes in local clinic intakes and forces hospital bed allocations to capacity thresholds.",
        "icon": "fa-virus",
        "parameters": {
            "traffic_multiplier": 0.9,
            "pollution_multiplier": 0.95,
            "energy_multiplier": 1.05,
            "water_multiplier": 1.1,
            "waste_multiplier": 1.15,
            "incident_probability": 0.08,
            "outbreak_zone": "Zone_A",
            "duration_hours": 72
        },
        "expected_outcomes": {
            "avg_congestion": "low",
            "avg_aqi": 80,
            "peak_energy_kwh": 750,
            "estimated_incidents": 5
        }
    },
    {
        "id": "safety_threat",
        "name": "Public Safety Alert",
        "description": "Large-scale public gathering in Downtown Metro Central requires high surveillance routing and dynamic patrol re-allocations.",
        "icon": "fa-shield-halved",
        "parameters": {
            "traffic_multiplier": 1.25,
            "pollution_multiplier": 1.1,
            "energy_multiplier": 1.1,
            "water_multiplier": 1.0,
            "waste_multiplier": 1.2,
            "incident_probability": 0.12,
            "safety_zone": "Zone_B",
            "duration_hours": 6
        },
        "expected_outcomes": {
            "avg_congestion": "high",
            "avg_aqi": 90,
            "peak_energy_kwh": 820,
            "estimated_incidents": 6
        }
    },
    {
        "id": "heatwave",
        "name": "Extreme Climate Heatwave",
        "description": "Extreme high ambient temperatures trigger severe grid load challenges, peak cooling demand, and critical environment warnings.",
        "icon": "fa-temperature-arrow-up",
        "parameters": {
            "traffic_multiplier": 0.95,
            "pollution_multiplier": 1.4,
            "energy_multiplier": 1.45,
            "water_multiplier": 1.35,
            "waste_multiplier": 1.1,
            "incident_probability": 0.07,
            "heatwave_zone": "Zone_C",
            "duration_hours": 24
        },
        "expected_outcomes": {
            "avg_congestion": "medium",
            "avg_aqi": 145,
            "peak_energy_kwh": 1150,
            "estimated_incidents": 3
        }
    }
]

with open(os.path.join(BASE, "scenarios.json"), "w") as f:
    json.dump(scenarios_json, f, indent=2)

print("scenarios.json written")
print("All data files generated successfully.")
