/* ============================================================
   CityMind-AI — Chart.js Wrapper
   Dark-mode presets, chart factory functions, gradients
   ============================================================ */

// --- Dark Mode Defaults ---
if (typeof Chart !== 'undefined') {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(51, 65, 85, 0.5)';
    Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.95)';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.08)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.cornerRadius = 10;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.titleFont = { family: "'Inter'", weight: '600', size: 13 };
    Chart.defaults.plugins.tooltip.bodyFont = { family: "'JetBrains Mono'", size: 12 };
    Chart.defaults.plugins.tooltip.displayColors = true;
    Chart.defaults.plugins.tooltip.boxPadding = 4;
    Chart.defaults.animation = {
        duration: 800,
        easing: 'easeOutQuart'
    };
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;
}

// --- Named Colors ---
const CHART_COLORS = {
    primary:    '#0d8eef',
    primaryLight: '#38aaf5',
    accent:     '#10b981',
    accentLight: '#34d399',
    warning:    '#f59e0b',
    warningLight: '#fbbf24',
    danger:     '#ef4444',
    dangerLight: '#f87171',
    purple:     '#8b5cf6',
    purpleLight: '#a78bfa',
    cyan:       '#06b6d4',
    pink:       '#ec4899',
    orange:     '#f97316',
    slate:      '#64748b',
    grid:       'rgba(51, 65, 85, 0.3)',
    gridLight:  'rgba(51, 65, 85, 0.15)',

    // Gradient pairs
    gradients: {
        primary:  ['rgba(13, 142, 239, 0.3)', 'rgba(13, 142, 239, 0.01)'],
        accent:   ['rgba(16, 185, 129, 0.3)', 'rgba(16, 185, 129, 0.01)'],
        warning:  ['rgba(245, 158, 11, 0.3)', 'rgba(245, 158, 11, 0.01)'],
        danger:   ['rgba(239, 68, 68, 0.3)',  'rgba(239, 68, 68, 0.01)'],
        purple:   ['rgba(139, 92, 246, 0.3)', 'rgba(139, 92, 246, 0.01)'],
        cyan:     ['rgba(6, 182, 212, 0.3)',   'rgba(6, 182, 212, 0.01)'],
    },

    // Palette for multi-series
    palette: ['#0d8eef', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'],
    paletteSoft: [
        'rgba(13, 142, 239, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(6, 182, 212, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(249, 115, 22, 0.8)'
    ]
};

// --- Gradient Factory ---
function createGradient(ctx, color1, color2, direction = 'vertical') {
    let gradient;
    if (direction === 'vertical') {
        gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    } else {
        gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
    }
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
}

function createGradientByName(ctx, colorName) {
    const pair = CHART_COLORS.gradients[colorName];
    if (!pair) return CHART_COLORS[colorName] || colorName;
    return createGradient(ctx, pair[0], pair[1]);
}

// --- Chart Registry (track instances for cleanup) ---
const chartRegistry = {};

function destroyChart(chartId) {
    if (chartRegistry[chartId]) {
        chartRegistry[chartId].destroy();
        delete chartRegistry[chartId];
    }
}

function registerChart(chartId, chart) {
    destroyChart(chartId); // Destroy previous instance
    chartRegistry[chartId] = chart;
    return chart;
}

// --- Common Scale Config ---
function getCommonScales(showGrid = true) {
    return {
        x: {
            grid: {
                display: showGrid,
                color: CHART_COLORS.gridLight,
                drawBorder: false,
            },
            ticks: {
                color: '#64748b',
                font: { size: 11 },
                maxTicksLimit: 10,
            },
            border: { display: false }
        },
        y: {
            grid: {
                display: showGrid,
                color: CHART_COLORS.gridLight,
                drawBorder: false,
            },
            ticks: {
                color: '#64748b',
                font: { size: 11 },
                maxTicksLimit: 6,
            },
            border: { display: false },
            beginAtZero: true
        }
    };
}

// ==================== FACTORY FUNCTIONS ====================

/**
 * Line Chart — smooth curves with gradient fill
 */
function createLineChart(canvasId, labels, datasets, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) { console.warn('Canvas not found:', canvasId); return null; }
    const ctx = canvas.getContext('2d');

    const processedDatasets = datasets.map((ds, i) => {
        const color = ds.borderColor || CHART_COLORS.palette[i % CHART_COLORS.palette.length];
        const gradientName = ds.gradient || Object.keys(CHART_COLORS.gradients)[i % Object.keys(CHART_COLORS.gradients).length];

        return {
            label: ds.label || `Series ${i + 1}`,
            data: ds.data,
            borderColor: color,
            backgroundColor: ds.fill !== false ? createGradientByName(ctx, gradientName) : 'transparent',
            fill: ds.fill !== false,
            tension: ds.tension !== undefined ? ds.tension : 0.4,
            borderWidth: ds.borderWidth || 2.5,
            pointRadius: ds.pointRadius !== undefined ? ds.pointRadius : 0,
            pointHoverRadius: ds.pointHoverRadius || 6,
            pointBackgroundColor: color,
            pointBorderColor: '#0f172a',
            pointBorderWidth: 2,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: color,
            pointHoverBorderWidth: 3,
            borderDash: ds.borderDash || [],
            order: ds.order || 0,
            ...ds.extra
        };
    });

    const chart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: processedDatasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: datasets.length > 1,
                    position: 'top',
                    align: 'end',
                },
                ...options.plugins
            },
            scales: options.scales || getCommonScales(),
            ...options
        }
    });

    return registerChart(canvasId, chart);
}

/**
 * Bar Chart — rounded bars with hover brightness
 */
function createBarChart(canvasId, labels, datasets, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) { console.warn('Canvas not found:', canvasId); return null; }
    const ctx = canvas.getContext('2d');

    const processedDatasets = datasets.map((ds, i) => {
        const color = ds.backgroundColor || CHART_COLORS.palette[i % CHART_COLORS.palette.length];
        return {
            label: ds.label || `Series ${i + 1}`,
            data: ds.data,
            backgroundColor: Array.isArray(color) ? color : color,
            borderColor: 'transparent',
            borderWidth: 0,
            borderRadius: ds.borderRadius !== undefined ? ds.borderRadius : 6,
            borderSkipped: false,
            hoverBackgroundColor: ds.hoverBackgroundColor || undefined,
            barPercentage: ds.barPercentage || 0.7,
            categoryPercentage: ds.categoryPercentage || 0.8,
            ...ds.extra
        };
    });

    const chart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: processedDatasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: datasets.length > 1,
                    position: 'top',
                    align: 'end',
                },
                ...options.plugins
            },
            scales: options.scales || getCommonScales(),
            ...options
        }
    });

    return registerChart(canvasId, chart);
}

/**
 * Doughnut Chart — with center text plugin
 */
function createDoughnutChart(canvasId, labels, data, colors, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) { console.warn('Canvas not found:', canvasId); return null; }
    const ctx = canvas.getContext('2d');

    const bgColors = colors || CHART_COLORS.palette.slice(0, data.length);
    const centerText = options.centerText || '';
    const centerSubText = options.centerSubText || '';

    // Center text plugin
    const centerTextPlugin = {
        id: 'centerText',
        afterDraw(chart) {
            if (!centerText && !centerSubText) return;
            const { ctx: context, chartArea: { left, right, top, bottom } } = chart;
            const centerX = (left + right) / 2;
            const centerY = (top + bottom) / 2;

            context.save();
            if (centerText) {
                context.font = "700 24px 'JetBrains Mono'";
                context.fillStyle = '#f1f5f9';
                context.textAlign = 'center';
                context.textBaseline = centerSubText ? 'bottom' : 'middle';
                context.fillText(centerText, centerX, centerSubText ? centerY - 2 : centerY);
            }
            if (centerSubText) {
                context.font = "500 11px 'Inter'";
                context.fillStyle = '#64748b';
                context.textAlign = 'center';
                context.textBaseline = 'top';
                context.fillText(centerSubText, centerX, centerY + 4);
            }
            context.restore();
        }
    };

    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: bgColors,
                borderColor: '#111827',
                borderWidth: 3,
                hoverBorderColor: '#1e293b',
                hoverOffset: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: options.cutout || '72%',
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        padding: 14,
                        font: { size: 11 },
                    }
                },
                ...options.plugins
            },
            ...options
        },
        plugins: [centerTextPlugin]
    });

    return registerChart(canvasId, chart);
}

/**
 * Radar Chart — for zone comparison
 */
function createRadarChart(canvasId, labels, datasets, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) { console.warn('Canvas not found:', canvasId); return null; }
    const ctx = canvas.getContext('2d');

    const processedDatasets = datasets.map((ds, i) => {
        const color = ds.borderColor || CHART_COLORS.palette[i % CHART_COLORS.palette.length];
        return {
            label: ds.label || `Zone ${i + 1}`,
            data: ds.data,
            borderColor: color,
            backgroundColor: (color + '20'), // Add low alpha
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: color,
            pointBorderColor: '#111827',
            pointBorderWidth: 2,
            ...ds.extra
        };
    });

    const chart = new Chart(ctx, {
        type: 'radar',
        data: { labels, datasets: processedDatasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    grid: { color: CHART_COLORS.gridLight },
                    angleLines: { color: CHART_COLORS.gridLight },
                    pointLabels: {
                        color: '#94a3b8',
                        font: { size: 11, weight: '500' }
                    },
                    ticks: {
                        display: false,
                        backdropColor: 'transparent'
                    },
                    suggestedMin: 0,
                    suggestedMax: 100,
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 14 },
                },
                ...options.plugins
            },
            ...options
        }
    });

    return registerChart(canvasId, chart);
}

/**
 * Area Chart — filled with gradient
 */
function createAreaChart(canvasId, labels, datasets, options = {}) {
    return createLineChart(canvasId, labels, datasets.map(ds => ({
        ...ds,
        fill: true,
        tension: ds.tension || 0.4,
    })), options);
}

// ==================== UTILITIES ====================

/**
 * Smoothly update chart data
 */
function updateChartData(chart, newLabels, newDatasets) {
    if (!chart) return;

    if (newLabels) {
        chart.data.labels = newLabels;
    }

    if (newDatasets) {
        newDatasets.forEach((newData, i) => {
            if (chart.data.datasets[i]) {
                chart.data.datasets[i].data = newData;
            }
        });
    }

    chart.update('active'); // smooth transition
}

/**
 * Generate tiny sparkline in a container
 */
function generateSparkline(containerId, data, color = CHART_COLORS.primary) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    // Create canvas if not exists
    let canvas = container.querySelector('canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        container.appendChild(canvas);
    }

    const sparkId = `sparkline-${containerId}`;
    canvas.id = sparkId;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 30);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, color + '05');

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map((_, i) => i),
            datasets: [{
                data,
                borderColor: color,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                borderWidth: 1.5,
                pointRadius: 0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { display: false },
                y: { display: false }
            },
            animation: { duration: 600 },
            elements: { line: { capBezierPoints: true } }
        }
    });

    return registerChart(sparkId, chart);
}

/**
 * Format large numbers
 */
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
}

// ==================== EXPORT ====================

window.CityCharts = {
    COLORS: CHART_COLORS,
    createLineChart,
    createBarChart,
    createDoughnutChart,
    createRadarChart,
    createAreaChart,
    createGradient,
    createGradientByName,
    updateChartData,
    generateSparkline,
    destroyChart,
    formatNumber,
    getCommonScales,
    registry: chartRegistry
};
