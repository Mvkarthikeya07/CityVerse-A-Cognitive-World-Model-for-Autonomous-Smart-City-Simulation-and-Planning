/**
 * CityMind-AI — Analytics Module
 * Loads city-specific deep analytics datasets and handles charts.
 */

'use strict';

async function fetchAnalyticsData() {
    const city = (typeof globalState !== 'undefined' && globalState.city) 
        ? globalState.city 
        : (localStorage.getItem('selectedCity') || 'Mumbai, India');

    try {
        const res = await fetch(`/api/analytics?city=${encodeURIComponent(city)}&_=${Date.now()}`);
        const data = await res.json();
        
        if (data.status === 'success') {
            console.log('[Analytics] Data loaded for', city, data);
            updateAnalyticsCharts(data);
        }
    } catch (err) {
        console.error('[Analytics] Fetch error:', err);
    }
}

function updateAnalyticsCharts(data) {
    // 1. Traffic Volume by Zone — Bar Chart
    const trafficCtx = document.getElementById('analytics-traffic-chart');
    if (trafficCtx && data.traffic_by_zone) {
        CityCharts.createBarChart('analytics-traffic-chart',
            data.traffic_by_zone.labels,
            [{
                label: 'Vehicles per hour',
                data: data.traffic_by_zone.data,
                backgroundColor: CityCharts.COLORS.primary,
                borderRadius: 4
            }],
            { scales: CityCharts.getCommonScales() }
        );
    }

    // 2. Congestion Distribution — Doughnut Chart
    const congestionCtx = document.getElementById('analytics-congestion-chart');
    if (congestionCtx && data.congestion_distribution) {
        CityCharts.createDoughnutChart('analytics-congestion-chart',
            data.congestion_distribution.labels,
            data.congestion_distribution.data,
            [
                CityCharts.COLORS.accent,
                CityCharts.COLORS.primary,
                CityCharts.COLORS.warning,
                CityCharts.COLORS.danger
            ],
            { 
                centerText: data.congestion_distribution.centerText, 
                centerSubText: data.congestion_distribution.centerSubText 
            }
        );
    }

    // 3. AQI Trends — 7 Day Line Chart
    const aqiCtx = document.getElementById('analytics-aqi-chart');
    if (aqiCtx && data.aqi_trends) {
        CityCharts.createLineChart('analytics-aqi-chart',
            data.aqi_trends.labels,
            [{
                label: 'Average AQI',
                data: data.aqi_trends.data,
                borderColor: CityCharts.COLORS.accent,
                gradient: 'accent',
                fill: true,
                tension: 0.4
            }],
            { scales: CityCharts.getCommonScales() }
        );
    }

    // 4. Energy Consumption vs Generation — Area Chart
    const energyCtx = document.getElementById('analytics-energy-chart');
    if (energyCtx && data.energy_comparison) {
        CityCharts.createAreaChart('analytics-energy-chart',
            data.energy_comparison.labels,
            [
                {
                    label: 'Grid Demand (MW)',
                    data: data.energy_comparison.demand,
                    borderColor: CityCharts.COLORS.warning,
                    gradient: 'warning',
                    fill: true
                },
                {
                    label: 'Solar Generation (MW)',
                    data: data.energy_comparison.solar,
                    borderColor: CityCharts.COLORS.primary,
                    gradient: 'primary',
                    fill: true
                }
            ],
            { scales: CityCharts.getCommonScales() }
        );
    }

    // 5. Water Consumption — Bar Chart
    const waterCtx = document.getElementById('analytics-water-chart');
    if (waterCtx && data.water_trends) {
        CityCharts.createBarChart('analytics-water-chart',
            data.water_trends.labels,
            [{
                label: 'Consumption (Liters)',
                data: data.water_trends.data,
                backgroundColor: '#06b6d4',
                borderRadius: 4
            }],
            { scales: CityCharts.getCommonScales() }
        );
    }

    // 6. Waste Management Distribution — Doughnut Chart
    const wasteCtx = document.getElementById('analytics-waste-chart');
    if (wasteCtx && data.waste_distribution) {
        CityCharts.createDoughnutChart('analytics-waste-chart',
            data.waste_distribution.labels,
            data.waste_distribution.data,
            ['#10b981', '#f59e0b', '#64748b'] // Recycled, Composted, Landfill
        );
    }

    // 7. Healthcare ER Response — Line Chart
    const hcCtx = document.getElementById('analytics-healthcare-chart');
    if (hcCtx && data.healthcare_trends) {
        CityCharts.createLineChart('analytics-healthcare-chart',
            data.healthcare_trends.labels,
            [{
                label: 'Response Time (Min)',
                data: data.healthcare_trends.data,
                borderColor: '#ec4899',
                gradient: 'primary',
                fill: true,
                tension: 0.4
            }],
            { scales: CityCharts.getCommonScales() }
        );
    }

    // 8. Public Safety — Bar Chart
    const safetyCtx = document.getElementById('analytics-safety-chart');
    if (safetyCtx && data.safety_trends) {
        CityCharts.createBarChart('analytics-safety-chart',
            data.safety_trends.labels,
            [{
                label: 'Incidents',
                data: data.safety_trends.data,
                backgroundColor: '#8b5cf6',
                borderRadius: 4
            }],
            { scales: CityCharts.getCommonScales() }
        );
    }

    // 9. Environment CO2 — Line Chart
    const envCtx = document.getElementById('analytics-environment-chart');
    if (envCtx && data.environment_trends) {
        CityCharts.createLineChart('analytics-environment-chart',
            data.environment_trends.labels,
            [{
                label: 'CO2 (ppm)',
                data: data.environment_trends.data,
                borderColor: '#10b981',
                gradient: 'accent',
                fill: true,
                tension: 0.4
            }],
            { scales: CityCharts.getCommonScales() }
        );
    }
}

// ── Global Event Sync ─────────────────────────────────────────────────────

window.addEventListener('cityChanged', (e) => {
    console.log(`[Analytics] Syncing analytics for ${e.detail.city} via API...`);
    fetchAnalyticsData();
});

// ── Init ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    fetchAnalyticsData();
});
