/**
 * CityMind-AI — Dashboard Module
 * Handles dashboard KPI updates, real-time data feeds for all 6 smart domains.
 * Domains: Traffic | Energy | Water | Waste | Healthcare | Safety | Environment
 */

'use strict';

// ── State ─────────────────────────────────────────────────────────────────
const savedRefresh = localStorage.getItem('setting-refresh');
const dashboardState = {
    refreshInterval: savedRefresh ? parseInt(savedRefresh) * 1000 : 30_000,
    timer: null,
    trafficChart: null,
    waterChart: null,
    wasteChart: null,
    healthcareChart: null,
    safetyChart: null,
    environmentChart: null,
};

// ── KPI Management ────────────────────────────────────────────────────────

function updateKPI(elementId, value, trend = null) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const valueEl = el.querySelector('.kpi-card__value');
    if (valueEl) valueEl.textContent = value;

    if (trend !== null) {
        const trendEl = el.querySelector('.kpi-card__trend');
        if (trendEl) {
            const isDown = trend.toString().includes('-') || trend.toString().includes('down');
            trendEl.className = `kpi-card__trend kpi-card__trend--${isDown ? 'down' : 'up'}`;
            const prefix = isDown ? '↓' : '↑';
            let cleanTrend = trend.toString().replace(/[+\-]/g, '').trim();
            if (!isNaN(cleanTrend) && cleanTrend !== '') {
                cleanTrend = cleanTrend + '%';
            }
            trendEl.textContent = `${prefix} ${cleanTrend}`;
        }
    }
}

/** Update a stat badge with icon, label & value inside sector-stat elements */
function updateSectorStat(sectorId, key, value, unit = '') {
    const el = document.getElementById(`${sectorId}-${key}`);
    if (!el) return;
    const valEl = el.querySelector('.sector-stat__value');
    if (valEl) valEl.textContent = `${value}${unit}`;
}

// ── Mini-Chart Helper ─────────────────────────────────────────────────────

function renderMiniChart(canvasId, labels, data, color = '#4F46E5', label = '') {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return null;

    const existing = Chart.getChart(canvasId);
    if (existing) {
        existing.data.labels = labels;
        existing.data.datasets[0].data = data;
        existing.update();
        return existing;
    }

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label,
                data,
                borderColor: color,
                backgroundColor: color + '22',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: true } },
            scales: {
                x: { display: false },
                y: { display: false }
            },
            animation: { duration: 500 }
        }
    });
}

// ── Data Fetching & UI Update ─────────────────────────────────────────────

async function fetchDashboardData() {
    const city = (typeof globalState !== 'undefined' && globalState.city)
        ? globalState.city
        : (localStorage.getItem('selectedCity') || 'Mumbai, India');

    try {
        const t = Date.now();
        const [
            traffic, pollution, energy,
            water, waste, healthcare, safety, environment,
            dashboardKpis
        ] = await Promise.all([
            fetch(`/api/traffic?city=${encodeURIComponent(city)}&_=${t}`).then(r => r.json()),
            fetch(`/api/pollution?city=${encodeURIComponent(city)}&_=${t}`).then(r => r.json()),
            fetch(`/api/energy?city=${encodeURIComponent(city)}&_=${t}`).then(r => r.json()),
            fetch(`/api/water?city=${encodeURIComponent(city)}&hours=24&_=${t}`).then(r => r.json()).catch(() => null),
            fetch(`/api/waste?city=${encodeURIComponent(city)}&hours=24&_=${t}`).then(r => r.json()).catch(() => null),
            fetch(`/api/healthcare?city=${encodeURIComponent(city)}&hours=24&_=${t}`).then(r => r.json()).catch(() => null),
            fetch(`/api/safety?city=${encodeURIComponent(city)}&hours=24&_=${t}`).then(r => r.json()).catch(() => null),
            fetch(`/api/environment?city=${encodeURIComponent(city)}&hours=24&_=${t}`).then(r => r.json()).catch(() => null),
            fetch(`/api/dashboard?city=${encodeURIComponent(city)}&_=${t}`).then(r => r.json()),
        ]);

        // ── Core KPIs ────────────────────────────────────────────────
        updateKPI('kpi-traffic',  dashboardKpis.total_vehicles?.value?.toLocaleString(),  dashboardKpis.total_vehicles?.trend);
        updateKPI('kpi-pollution', dashboardKpis.air_quality?.value,                       dashboardKpis.air_quality?.trend);
        updateKPI('kpi-energy',   dashboardKpis.energy_load?.value?.toLocaleString(),     dashboardKpis.energy_load?.trend);
        updateKPI('kpi-alerts',   dashboardKpis.active_incidents?.value,                  dashboardKpis.active_incidents?.trend);

        // ── New Domain KPIs ───────────────────────────────────────────
        if (dashboardKpis.water_flow) {
            updateKPI('kpi-water',       dashboardKpis.water_flow?.value?.toLocaleString(),    dashboardKpis.water_flow?.trend);
        }
        if (dashboardKpis.waste_fill) {
            updateKPI('kpi-waste',       dashboardKpis.waste_fill?.value + '%',                dashboardKpis.waste_fill?.trend);
        }
        if (dashboardKpis.emergency_response) {
            updateKPI('kpi-healthcare',  dashboardKpis.emergency_response?.value + ' min',     dashboardKpis.emergency_response?.trend);
        }
        if (dashboardKpis.safety_crime) {
            updateKPI('kpi-safety',      dashboardKpis.safety_crime?.value,                    dashboardKpis.safety_crime?.trend);
        }

        // ── Traffic Chart ─────────────────────────────────────────────
        const trafficCtx = document.getElementById('traffic-chart');
        if (trafficCtx && traffic && traffic.datasets) {
            if (dashboardState.trafficChart) {
                CityCharts.updateChartData(dashboardState.trafficChart, traffic.labels, traffic.datasets.map(d => d.data));
            } else {
                dashboardState.trafficChart = CityCharts.createAreaChart(
                    'traffic-chart', traffic.labels, traffic.datasets,
                    { scales: CityCharts.getCommonScales() }
                );
            }
        }

        // ── Mini Charts — 6 Smart Domains ─────────────────────────────
        if (water?.datasets?.[0]?.data) {
            dashboardState.waterChart = renderMiniChart(
                'mini-water-chart', water.labels, water.datasets[0].data,
                '#06B6D4', 'Water Consumption'
            );
        }
        if (waste?.datasets?.[0]?.data) {
            dashboardState.wasteChart = renderMiniChart(
                'mini-waste-chart', waste.labels, waste.datasets[0].data,
                '#F59E0B', 'Bin Fill Level'
            );
        }
        if (healthcare?.datasets?.[0]?.data) {
            dashboardState.healthcareChart = renderMiniChart(
                'mini-healthcare-chart', healthcare.labels, healthcare.datasets[0].data,
                '#EC4899', 'Emergency Response'
            );
        }
        if (safety?.datasets?.[0]?.data) {
            dashboardState.safetyChart = renderMiniChart(
                'mini-safety-chart', safety.labels, safety.datasets[0].data,
                '#8B5CF6', 'Crime Index'
            );
        }
        if (environment?.datasets?.[0]?.data) {
            dashboardState.environmentChart = renderMiniChart(
                'mini-environment-chart', environment.labels, environment.datasets[0].data,
                '#10B981', 'CO2 (ppm)'
            );
        }

        return { traffic, pollution, energy, water, waste, healthcare, safety, environment };
    } catch (err) {
        console.error('[Dashboard] Fetch error:', err);
        return null;
    }
}

// ── Auto Refresh ──────────────────────────────────────────────────────────

function startAutoRefresh() {
    stopAutoRefresh();
    dashboardState.timer = setInterval(fetchDashboardData, dashboardState.refreshInterval);
}

function stopAutoRefresh() {
    if (dashboardState.timer) {
        clearInterval(dashboardState.timer);
        dashboardState.timer = null;
    }
}

// ── Global Event Sync ─────────────────────────────────────────────────────

window.addEventListener('cityChanged', (e) => {
    console.log(`[Dashboard] Syncing all sectors for ${e.detail.city}...`);
    fetchDashboardData();
});

// ── Init ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    const initialData = await fetchDashboardData();

    const trafficCtx = document.getElementById('traffic-chart');
    if (trafficCtx && initialData && initialData.traffic) {
        dashboardState.trafficChart = CityCharts.createAreaChart(
            'traffic-chart',
            initialData.traffic.labels,
            initialData.traffic.datasets,
            { scales: CityCharts.getCommonScales() }
        );
    }

    startAutoRefresh();
});
