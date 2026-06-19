/**
 * CityMind-AI — Prediction Module
 * Handles forecasting requests and result visualisation for all 8 domains.
 */

'use strict';

// ── State ─────────────────────────────────────────────────────────────────
const predictionState = {
    horizon: 24,       // hours ahead
    metric: 'traffic', // traffic | pollution | energy | water | waste | healthcare | safety | environment
    results: null,
};

// ── Prediction Controls ──────────────────────────────────────────────────

function setHorizon(hours) {
    predictionState.horizon = Math.max(1, Math.min(hours, 168));
    console.log('[Prediction] Horizon set to', predictionState.horizon, 'hours');
}

function setMetric(metric) {
    const validMetrics = ['traffic', 'pollution', 'energy', 'water', 'waste', 'healthcare', 'safety', 'environment'];
    if (validMetrics.includes(metric)) {
        predictionState.metric = metric;
        console.log('[Prediction] Metric set to', metric);
    }
}

// ── Metric Display Config ────────────────────────────────────────────────

const METRIC_CONFIG = {
    traffic:     { label: 'Traffic Flow',          color: '#0d8eef', icon: '🚗' },
    pollution:   { label: 'Air Quality (AQI)',     color: '#f59e0b', icon: '💨' },
    energy:      { label: 'Energy Demand (MW)',    color: '#10b981', icon: '⚡' },
    water:       { label: 'Water Consumption (L)', color: '#06b6d4', icon: '💧' },
    waste:       { label: 'Bin Fill Level (%)',     color: '#f59e0b', icon: '🗑️' },
    healthcare:  { label: 'ER Response (Min)',      color: '#ec4899', icon: '🏥' },
    safety:      { label: 'Crime Index',            color: '#8b5cf6', icon: '🛡️' },
    environment: { label: 'CO₂ Level (ppm)',        color: '#10b981', icon: '🌿' },
};

// ── API ───────────────────────────────────────────────────────────────────

async function runPrediction() {
    try {
        const city = (typeof globalState !== 'undefined' && globalState.city) 
            ? globalState.city 
            : (localStorage.getItem('selectedCity') || 'Mumbai, India');

        // Show loading
        const container = document.getElementById('prediction-results');
        if (container) {
            container.innerHTML = `
                <div class="card fade-in" style="min-height: 300px; display:flex; align-items:center; justify-content:center; color: var(--text-secondary);">
                    <p>⏳ Running ${METRIC_CONFIG[predictionState.metric]?.label || predictionState.metric} forecast for <strong>${city}</strong>...</p>
                </div>
            `;
        }

        const res = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                horizon: predictionState.horizon,
                metric: predictionState.metric,
                city: city
            }),
        });

        predictionState.results = await res.json();
        console.log('[Prediction] Results:', predictionState.results);
        displayResults(predictionState.results);
        return predictionState.results;
    } catch (err) {
        console.error('[Prediction] API error:', err);
        return null;
    }
}

// ── Display ───────────────────────────────────────────────────────────────

function displayResults(results) {
    const container = document.getElementById('prediction-results');
    if (!container) return;

    const city = (typeof globalState !== 'undefined' && globalState.city) 
        ? globalState.city 
        : (localStorage.getItem('selectedCity') || 'Mumbai, India');

    const config = METRIC_CONFIG[predictionState.metric] || METRIC_CONFIG.traffic;

    container.innerHTML = `
        <div class="card fade-in">
            <div class="card__header">
                <h3 class="card__title">${config.icon} ${config.label} Forecast for ${city} — ${predictionState.horizon}h</h3>
                <span class="badge badge--success">Complete</span>
            </div>
            <div style="min-height: 250px;">
                <canvas id="prediction-chart-canvas"></canvas>
            </div>
        </div>
    `;

    setTimeout(() => {
        const ctx = document.getElementById('prediction-chart-canvas');
        if (!ctx || !results || !results.historical || !results.forecast) return;

        CityCharts.createLineChart('prediction-chart-canvas',
            results.labels,
            [
                {
                    label: 'Historical',
                    data: results.historical,
                    borderColor: CityCharts.COLORS.slate,
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: false
                },
                {
                    label: 'Forecast',
                    data: results.forecast,
                    borderColor: config.color,
                    gradient: 'primary',
                    fill: true,
                    tension: 0.4
                }
            ],
            { scales: CityCharts.getCommonScales() }
        );
    }, 100);
}

// ── City Change Listener ─────────────────────────────────────────────────

window.addEventListener('cityChanged', (e) => {
    console.log(`[Prediction] City changed to ${e.detail.city} — clearing results`);
    const container = document.getElementById('prediction-results');
    if (container) {
        container.innerHTML = `
            <div class="card fade-in" style="min-height: 300px; display:flex; align-items:center; justify-content:center; color: var(--text-secondary);">
                <p>City changed to <strong>${e.detail.city}</strong>. Select a metric and click "Run Forecast".</p>
            </div>
        `;
    }
});

// ── Init ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Prediction] Module loaded — supports 8 domains');
});
