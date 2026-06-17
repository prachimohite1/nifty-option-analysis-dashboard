/**
 * Nifty Option Dashboard Charts
 * Handles initialization and updating of Chart.js instances for:
 * 1. Open Interest (OI) Bar Chart
 * 2. OI Change Bar Chart
 * 3. Max Pain Chart
 * 4. IV Smile Chart
 * 5. Strategy Payoff Simulator Chart
 */

// Global Chart configurations
const CHART_TEXT_COLOR = '#a0aec0';
const CHART_GRID_COLOR = '#22262f';
const CALL_COLOR = 'rgba(245, 101, 101, 0.85)'; // Neon Red
const CALL_BORDER = '#f56565';
const PUT_COLOR = 'rgba(72, 187, 120, 0.85)';  // Neon Green
const PUT_BORDER = '#48bb78';
const BLUE_COLOR = 'rgba(66, 153, 225, 0.85)';  // Neon Blue
const BLUE_BORDER = '#4299e1';
const YELLOW_COLOR = 'rgba(236, 201, 75, 0.85)'; // Gold Yellow
const YELLOW_BORDER = '#ecc94b';

Chart.defaults.color = CHART_TEXT_COLOR;
Chart.defaults.borderColor = CHART_GRID_COLOR;
Chart.defaults.font.family = "'Outfit', sans-serif";

/**
 * Helper to extract strikes and data arrays
 */
function getChartData(strikes) {
    const labels = strikes.map(s => s.strike);
    const callOI = strikes.map(s => s.call.oi / 100000); // In Lakhs
    const putOI = strikes.map(s => s.put.oi / 100000);
    const callChangeOI = strikes.map(s => s.call.changeOI / 100000);
    const putChangeOI = strikes.map(s => s.put.changeOI / 100000);
    const callIV = strikes.map(s => s.call.iv);
    const putIV = strikes.map(s => s.put.iv);
    
    return { labels, callOI, putOI, callChangeOI, putChangeOI, callIV, putIV };
}

/**
 * Initialize Open Interest (OI) Chart
 */
function initOiChart(canvasId) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Call OI (Lakhs)',
                    data: [],
                    backgroundColor: CALL_COLOR,
                    borderColor: CALL_BORDER,
                    borderWidth: 1.5,
                    borderRadius: 4
                },
                {
                    label: 'Put OI (Lakhs)',
                    data: [],
                    backgroundColor: PUT_COLOR,
                    borderColor: PUT_BORDER,
                    borderWidth: 1.5,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 12 } },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#171923',
                    titleColor: '#fff',
                    bodyColor: '#e2e8f0',
                    borderColor: '#2d3748',
                    borderWidth: 1
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    title: { display: true, text: 'Contracts in Lakhs' },
                    grid: { color: CHART_GRID_COLOR }
                }
            }
        }
    });
}

function updateOiChart(chart, strikes) {
    const { labels, callOI, putOI } = getChartData(strikes);
    chart.data.labels = labels;
    chart.data.datasets[0].data = callOI;
    chart.data.datasets[1].data = putOI;
    chart.update();
}

/**
 * Initialize Open Interest Change Chart
 */
function initOiChangeChart(canvasId) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Call OI Chg (Lakhs)',
                    data: [],
                    backgroundColor: 'rgba(252, 129, 129, 0.8)',
                    borderColor: '#fc8181',
                    borderWidth: 1.5,
                    borderRadius: 4
                },
                {
                    label: 'Put OI Chg (Lakhs)',
                    data: [],
                    backgroundColor: 'rgba(104, 211, 145, 0.8)',
                    borderColor: '#68d391',
                    borderWidth: 1.5,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 12 } },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#171923',
                    titleColor: '#fff',
                    bodyColor: '#e2e8f0',
                    borderColor: '#2d3748',
                    borderWidth: 1
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    title: { display: true, text: 'Change in Lakhs' },
                    grid: { color: CHART_GRID_COLOR }
                }
            }
        }
    });
}

function updateOiChangeChart(chart, strikes) {
    const { labels, callChangeOI, putChangeOI } = getChartData(strikes);
    chart.data.labels = labels;
    chart.data.datasets[0].data = callChangeOI;
    chart.data.datasets[1].data = putChangeOI;
    chart.update();
}

/**
 * Initialize Max Pain Chart
 */
function initMaxPainChart(canvasId) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Total Pain Value (Millions)',
                data: [],
                backgroundColor: [],
                borderColor: [],
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#171923',
                    titleColor: '#fff',
                    bodyColor: '#e2e8f0',
                    borderColor: '#2d3748',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `Pain: ${context.parsed.y.toFixed(2)}M`;
                        }
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    title: { display: true, text: 'Cumulative Pain Value' },
                    grid: { color: CHART_GRID_COLOR }
                }
            }
        }
    });
}

function updateMaxPainChart(chart, strikes, maxPainStrike) {
    const labels = strikes.map(s => s.strike);
    const painValues = [];

    // Recalculate pain details for graph
    strikes.forEach(targetStrikeObj => {
        const targetStrike = targetStrikeObj.strike;
        let totalPain = 0;
        strikes.forEach(s => {
            if (targetStrike > s.strike) {
                totalPain += (targetStrike - s.strike) * s.call.oi;
            }
            if (targetStrike < s.strike) {
                totalPain += (s.strike - targetStrike) * s.put.oi;
            }
        });
        painValues.push(totalPain / 1000000.0); // Show in Millions for cleaner scale
    });

    // Color code the bar: Highlight Max Pain strike in gold, others in blue
    const backgroundColors = labels.map(strike => 
        strike === maxPainStrike ? YELLOW_COLOR : 'rgba(66, 153, 225, 0.4)'
    );
    const borderColors = labels.map(strike => 
        strike === maxPainStrike ? YELLOW_BORDER : 'rgba(66, 153, 225, 0.8)'
    );

    chart.data.labels = labels;
    chart.data.datasets[0].data = painValues;
    chart.data.datasets[0].backgroundColor = backgroundColors;
    chart.data.datasets[0].borderColor = borderColors;
    chart.update();
}

/**
 * Initialize Implied Volatility (IV) Smile Chart
 */
function initIvSmileChart(canvasId) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Call IV (%)',
                    data: [],
                    borderColor: CALL_BORDER,
                    backgroundColor: 'rgba(245, 101, 101, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false,
                    pointRadius: 3
                },
                {
                    label: 'Put IV (%)',
                    data: [],
                    borderColor: PUT_BORDER,
                    backgroundColor: 'rgba(72, 187, 120, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false,
                    pointRadius: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 12 } },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#171923',
                    titleColor: '#fff',
                    bodyColor: '#e2e8f0',
                    borderColor: '#2d3748',
                    borderWidth: 1
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    title: { display: true, text: 'Implied Volatility (%)' },
                    grid: { color: CHART_GRID_COLOR }
                }
            }
        }
    });
}

function updateIvSmileChart(chart, strikes) {
    const { labels, callIV, putIV } = getChartData(strikes);
    chart.data.labels = labels;
    chart.data.datasets[0].data = callIV;
    chart.data.datasets[1].data = putIV;
    chart.update();
}

/**
 * Initialize Strategy Payoff Simulator Chart
 */
function initPayoffChart(canvasId) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Profit / Loss (₹)',
                data: [],
                borderColor: '#4299e1',
                borderWidth: 2.5,
                tension: 0.1,
                fill: {
                    target: 'origin',
                    above: 'rgba(72, 187, 120, 0.15)', // Light Green for profits
                    below: 'rgba(245, 101, 101, 0.15)'  // Light Red for losses
                },
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#171923',
                    titleColor: '#fff',
                    bodyColor: '#e2e8f0',
                    borderColor: '#2d3748',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const val = context.parsed.y;
                            const sign = val >= 0 ? '+' : '';
                            return `P&L: ${sign}₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Nifty Expiry Price (₹)' },
                    grid: { color: CHART_GRID_COLOR }
                },
                y: {
                    title: { display: true, text: 'Profit / Loss (₹)' },
                    grid: { color: CHART_GRID_COLOR }
                }
            }
        }
    });
}

/**
 * Update the Payoff chart based on active strategy legs
 */
function updatePayoffChart(chart, legs, spotPrice) {
    if (legs.length === 0) {
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
        chart.update();
        return;
    }

    // Calculate simulated price range: +/- 6% around spot price
    const rangePercent = 0.06;
    const lowerBound = Math.round(spotPrice * (1 - rangePercent) / 50) * 50;
    const upperBound = Math.round(spotPrice * (1 + rangePercent) / 50) * 50;
    
    // Step size (around 40 points for smooth plot, Nifty strikes are 50 so 10 points is very fine-grained)
    const step = 10;
    const pricesList = [];
    for (let p = lowerBound; p <= upperBound; p += step) {
        pricesList.push(p);
    }

    const pnlData = pricesList.map(simSpot => {
        let totalPnl = 0;
        
        legs.forEach(leg => {
            const K = leg.strike;
            const premium = leg.premium;
            const qty = leg.qty;
            const multi = leg.multiplier || 25; // Default Lot Size
            const size = qty * multi;

            let legPnlPerShare = 0;
            if (leg.type.toLowerCase() === 'call') {
                const intrinsicValue = Math.max(simSpot - K, 0);
                if (leg.action.toLowerCase() === 'buy') {
                    legPnlPerShare = intrinsicValue - premium;
                } else { // sell
                    legPnlPerShare = premium - intrinsicValue;
                }
            } else { // put
                const intrinsicValue = Math.max(K - simSpot, 0);
                if (leg.action.toLowerCase() === 'buy') {
                    legPnlPerShare = intrinsicValue - premium;
                } else { // sell
                    legPnlPerShare = premium - intrinsicValue;
                }
            }
            
            totalPnl += (legPnlPerShare * size);
        });

        return totalPnl;
    });

    chart.data.labels = pricesList;
    chart.data.datasets[0].data = pnlData;
    chart.update();
}

// Export functions if running in Node, otherwise bind to window
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initOiChart, updateOiChart,
        initOiChangeChart, updateOiChangeChart,
        initMaxPainChart, updateMaxPainChart,
        initIvSmileChart, updateIvSmileChart,
        initPayoffChart, updatePayoffChart
    };
} else {
    window.initOiChart = initOiChart;
    window.updateOiChart = updateOiChart;
    window.initOiChangeChart = initOiChangeChart;
    window.updateOiChangeChart = updateOiChangeChart;
    window.initMaxPainChart = initMaxPainChart;
    window.updateMaxPainChart = updateMaxPainChart;
    window.initIvSmileChart = initIvSmileChart;
    window.updateIvSmileChart = updateIvSmileChart;
    window.initPayoffChart = initPayoffChart;
    window.updatePayoffChart = updatePayoffChart;
}
