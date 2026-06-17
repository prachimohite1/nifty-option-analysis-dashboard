/**
 * Nifty Option Dashboard - Application Coordinator
 * Manages UI tabs, state updates, live data ticks,
 * strategy builder legs, and Greeks calculations.
 */

// State variables
let currentSpot = BASE_SPOT;
let prevClose = BASE_SPOT - 42.50; // Previous close for calculating net change
let indiaVix = 13.45;
let vixChange = -2.1;
let selectedExpiryIndex = 0;
let selectedStrikeDepth = 15; // default to ATM ± 7 strikes
let isLiveFeedActive = false;
let liveFeedIntervalId = null;

// Strategy Builder Legs
// Structure: { id, action: 'buy'|'sell', type: 'call'|'put', strike: number, premium: number, qty: number, multiplier: 25 }
let strategyLegs = [];
let nextLegId = 1;

// Chart Instances
let charts = {
    oi: null,
    oiChange: null,
    maxPain: null,
    ivSmile: null,
    payoff: null
};

// Current Option Chain dataset
let currentChain = null;

// DOM Elements
const spotPriceEl = document.getElementById('spot-price');
const spotChangeEl = document.getElementById('spot-change');
const expirySelectEl = document.getElementById('expiry-select');
const strikeRangeEl = document.getElementById('strike-range');
const liveFeedToggle = document.getElementById('live-feed-toggle');
const liveStatusEl = document.getElementById('live-status');
const optionChainTbody = document.getElementById('option-chain-tbody');
const strategyTemplateSelect = document.getElementById('strategy-template');
const strategyLegsTbody = document.getElementById('strategy-legs-tbody');
const builderEmptyState = document.getElementById('builder-empty-state');
const addCustomLegBtn = document.getElementById('add-custom-leg');
const clearStrategyBtn = document.getElementById('clear-strategy');

// Phase 2: Dual View Mode DOM
const toggleViewStandardBtn = document.getElementById('toggle-view-standard');
const toggleViewGreeksBtn = document.getElementById('toggle-view-greeks');
const chainTable = document.getElementById('chain-table');
const callsSectionTitle = document.getElementById('calls-section-title');
const putsSectionTitle = document.getElementById('puts-section-title');

// Phase 2: PCR Alert Config DOM
const pcrAlertBanner = document.getElementById('pcr-alert-banner');
const pcrAlertText = document.getElementById('pcr-alert-text');
const pcrAlertLow = document.getElementById('pcr-alert-low');
const pcrAlertHigh = document.getElementById('pcr-alert-high');
const pcrAlertEnable = document.getElementById('pcr-alert-enable');

// Phase 2: OI Shift Signal DOM
const signalValEl = document.getElementById('signal-val');
const signalDescEl = document.getElementById('signal-desc');
const signalIcon = document.getElementById('signal-icon');

// Phase 2: Manual Refresh DOM
const manualRefreshBtn = document.getElementById('manual-refresh-btn');

// KPI elements
const pcrValEl = document.getElementById('pcr-val');
const pcrSentimentEl = document.getElementById('pcr-sentiment');
const supportValEl = document.getElementById('support-val');
const supportDescEl = document.getElementById('support-desc');
const resistanceValEl = document.getElementById('resistance-val');
const resistanceDescEl = document.getElementById('resistance-desc');
const maxPainValEl = document.getElementById('max-pain-val');
const vixValEl = document.getElementById('vix-val');
const vixChangeEl = document.getElementById('vix-change');

// Strategy Payoff DOM Elements
const payoffNetPremiumEl = document.getElementById('payoff-net-premium');
const payoffMaxProfitEl = document.getElementById('payoff-max-profit');
const payoffMaxLossEl = document.getElementById('payoff-max-loss');
const payoffBreakevenEl = document.getElementById('payoff-breakeven');

// Strategy Greeks DOM Elements
const stratDeltaEl = document.getElementById('strat-delta');
const stratGammaEl = document.getElementById('strat-gamma');
const stratThetaEl = document.getElementById('strat-theta');
const stratVegaEl = document.getElementById('strat-vega');

// Greeks Calculator Sliders
const sliderSpot = document.getElementById('slider-spot');
const sliderStrike = document.getElementById('slider-strike');
const sliderDays = document.getElementById('slider-days');
const sliderIv = document.getElementById('slider-iv');
const sliderRate = document.getElementById('slider-rate');

// Slider Values Labels
const sliderSpotVal = document.getElementById('slider-spot-val');
const sliderStrikeVal = document.getElementById('slider-strike-val');
const sliderDaysVal = document.getElementById('slider-days-val');
const sliderIvVal = document.getElementById('slider-iv-val');
const sliderRateVal = document.getElementById('slider-rate-val');

// Greeks Calculator Outputs
const calcCallPriceEl = document.getElementById('calc-call-price');
const calcCallDeltaEl = document.getElementById('calc-call-delta');
const calcCallGammaEl = document.getElementById('calc-call-gamma');
const calcCallThetaEl = document.getElementById('calc-call-theta');
const calcCallVegaEl = document.getElementById('calc-call-vega');
const calcCallRhoEl = document.getElementById('calc-call-rho');

const calcPutPriceEl = document.getElementById('calc-put-price');
const calcPutDeltaEl = document.getElementById('calc-put-delta');
const calcPutGammaEl = document.getElementById('calc-put-gamma');
const calcPutThetaEl = document.getElementById('calc-put-theta');
const calcPutVegaEl = document.getElementById('calc-put-vega');
const calcPutRhoEl = document.getElementById('calc-put-rho');

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Populate Expiry Dates Selector
    EXPY_DATES.forEach((exp, idx) => {
        const option = document.createElement('option');
        option.value = idx;
        option.textContent = `${exp.date} - ${exp.label}`;
        expirySelectEl.appendChild(option);
    });

    // 2. Initialize Charts
    charts.oi = initOiChart('oi-chart-canvas');
    charts.oiChange = initOiChangeChart('oi-change-chart-canvas');
    charts.maxPain = initMaxPainChart('max-pain-chart-canvas');
    charts.ivSmile = initIvSmileChart('iv-smile-chart-canvas');
    charts.payoff = initPayoffChart('payoff-chart-canvas');

    // 3. Generate initial dataset
    loadOptionChainData();

    // 4. Set up Event Listeners
    setupEventHandlers();

    // 5. Initialize Greeks Calculator
    updateGreeksCalculator();
});

/**
 * Load Option Chain Data based on current Spot and Expiry Selection
 */
function loadOptionChainData() {
    const selectedExpiry = EXPY_DATES[selectedExpiryIndex];
    currentChain = generateOptionChain(currentSpot, selectedExpiry.days);
    
    // Update dashboard widgets and visuals
    updateDashboardKPIs();
    renderOptionChainTable();
    updateDashboardCharts();
    updateStrategyPayoff();
}

/**
 * Set up application Event Listeners
 */
function setupEventHandlers() {
    // Expiry selector change
    expirySelectEl.addEventListener('change', (e) => {
        selectedExpiryIndex = parseInt(e.target.value);
        loadOptionChainData();
    });

    // Strike depth selector change
    strikeRangeEl.addEventListener('change', (e) => {
        selectedStrikeDepth = parseInt(e.target.value);
        renderOptionChainTable();
    });

    // Tab switching
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active classes
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

            // Add active class to clicked tab and corresponding panel
            tab.classList.add('active');
            const targetPanelId = `panel-${tab.dataset.tab}`;
            const targetPanel = document.getElementById(targetPanelId);
            targetPanel.classList.add('active');

            // Force resize/render of charts when tab becomes visible
            // This is required because hidden canvas elements do not render sizing correctly
            setTimeout(() => {
                if (tab.dataset.tab === 'oi-analysis') {
                    charts.oi.resize();
                    charts.oiChange.resize();
                } else if (tab.dataset.tab === 'max-pain-tab') {
                    charts.maxPain.resize();
                    charts.ivSmile.resize();
                } else if (tab.dataset.tab === 'strategy-builder') {
                    charts.payoff.resize();
                }
            }, 50);
        });
    });

    // Simulated Live Feed Toggle
    liveFeedToggle.addEventListener('change', (e) => {
        isLiveFeedActive = e.target.checked;
        if (isLiveFeedActive) {
            liveStatusEl.classList.add('active');
            startLiveMockTicks();
        } else {
            liveStatusEl.classList.remove('active');
            stopLiveMockTicks();
        }
    });

    // Option Chain Toggle View Mode: Standard vs Option Greeks
    toggleViewStandardBtn.addEventListener('click', () => {
        optionChainViewMode = 'standard';
        toggleViewStandardBtn.classList.add('active');
        toggleViewGreeksBtn.classList.remove('active');
        
        toggleViewStandardBtn.style.background = 'var(--color-blue)';
        toggleViewStandardBtn.style.color = 'white';
        toggleViewGreeksBtn.style.background = 'transparent';
        toggleViewGreeksBtn.style.color = 'var(--text-secondary)';
        
        chainTable.className = 'option-chain-table standard-view';
        callsSectionTitle.colSpan = 7;
        putsSectionTitle.colSpan = 7;
        renderOptionChainTable();
    });

    toggleViewGreeksBtn.addEventListener('click', () => {
        optionChainViewMode = 'greeks';
        toggleViewGreeksBtn.classList.add('active');
        toggleViewStandardBtn.classList.remove('active');
        
        toggleViewGreeksBtn.style.background = 'var(--color-blue)';
        toggleViewGreeksBtn.style.color = 'white';
        toggleViewStandardBtn.style.background = 'transparent';
        toggleViewStandardBtn.style.color = 'var(--text-secondary)';
        
        chainTable.className = 'option-chain-table greeks-view';
        callsSectionTitle.colSpan = 5;
        putsSectionTitle.colSpan = 5;
        renderOptionChainTable();
    });

    // Manual Refresh button click
    manualRefreshBtn.addEventListener('click', () => {
        triggerManualRefresh();
    });

    // PCR Config changes
    pcrAlertLow.addEventListener('input', () => { updateDashboardKPIs(); });
    pcrAlertHigh.addEventListener('input', () => { updateDashboardKPIs(); });
    pcrAlertEnable.addEventListener('change', () => { updateDashboardKPIs(); });

    // Strategy Builder: Add Custom Leg button
    addCustomLegBtn.addEventListener('click', () => {
        // Add a default ATM leg
        const nearestStrike = Math.round(currentSpot / 50) * 50;
        addStrategyLeg('buy', 'call', nearestStrike, 100);
    });

    // Strategy Builder: Clear all legs
    clearStrategyBtn.addEventListener('click', () => {
        strategyLegs = [];
        strategyTemplateSelect.value = 'custom';
        updateStrategyPayoff();
    });

    // Strategy Builder: Template Selector
    strategyTemplateSelect.addEventListener('change', (e) => {
        applyStrategyTemplate(e.target.value);
    });

    // Greeks Calculator Sliders
    const greeksInputs = [sliderSpot, sliderStrike, sliderDays, sliderIv, sliderRate];
    greeksInputs.forEach(input => {
        input.addEventListener('input', () => {
            updateGreeksCalculator();
        });
    });
}

/**
 * Starts real-time simulation ticks
 */
function startLiveMockTicks() {
    liveFeedIntervalId = setInterval(() => {
        // Simulating random walk in Nifty index spot price (+/- 10 points)
        const tickMove = (Math.random() - 0.5) * 8;
        const newSpot = parseFloat((currentSpot + tickMove).toFixed(2));
        
        // Show flash animation on ticker
        if (newSpot > currentSpot) {
            spotPriceEl.className = 'ticker-price price-up';
        } else if (newSpot < currentSpot) {
            spotPriceEl.className = 'ticker-price price-down';
        }

        // Reset text color after flash
        setTimeout(() => {
            spotPriceEl.className = 'ticker-price';
        }, 300);

        currentSpot = newSpot;

        // Micro variations in VIX
        const vixMove = (Math.random() - 0.5) * 0.1;
        indiaVix = Math.max(9.0, Math.min(25.0, indiaVix + vixMove));
        vixChange = vixChange + (Math.random() - 0.5) * 0.2;

        // Update Option Chain ticks
        updateOptionChainTicks(currentChain, currentSpot);

        // Update UI
        updateDashboardKPIs();
        renderOptionChainTable();
        updateDashboardCharts();
        updateStrategyPayoff();
    }, 2500);
}

/**
 * Stops live ticks
 */
function stopLiveMockTicks() {
    if (liveFeedIntervalId) {
        clearInterval(liveFeedIntervalId);
        liveFeedIntervalId = null;
    }
}

/**
 * Trigger manual data recalculation and UI update
 */
function triggerManualRefresh() {
    // Simulating index fluctuation on manual refresh
    const tickMove = (Math.random() - 0.5) * 12;
    currentSpot = parseFloat((currentSpot + tickMove).toFixed(2));

    // Flash ticker
    if (tickMove >= 0) {
        spotPriceEl.className = 'ticker-price price-up';
    } else {
        spotPriceEl.className = 'ticker-price price-down';
    }
    setTimeout(() => {
        spotPriceEl.className = 'ticker-price';
    }, 300);

    // Micro variation in VIX
    indiaVix = Math.max(9.0, Math.min(25.0, indiaVix + (Math.random() - 0.5) * 0.15));
    vixChange = vixChange + (Math.random() - 0.5) * 0.3;

    // Recalculate
    updateOptionChainTicks(currentChain, currentSpot);
    updateDashboardKPIs();
    renderOptionChainTable();
    updateDashboardCharts();
    updateStrategyPayoff();
}

/**
 * Compute buy/sell signal based on cumulative call/put OI additions near ATM strike
 */
function calculateOiShiftSignal(chain) {
    const nearestATM = Math.round(chain.spot / 50) * 50;
    const strikes = chain.strikes;
    const atmIdx = strikes.findIndex(s => s.strike === nearestATM);
    
    if (atmIdx === -1) {
        return { signal: 'NEUTRAL', desc: 'Analyzing spot...', class: 'sentiment-neutral' };
    }

    // Slice 5 strikes around ATM (ATM +/- 2 strikes)
    const start = Math.max(0, atmIdx - 2);
    const end = Math.min(strikes.length, atmIdx + 3);
    const nearStrikes = strikes.slice(start, end);

    let callChgSum = 0;
    let putChgSum = 0;

    nearStrikes.forEach(s => {
        callChgSum += s.call.changeOI;
        putChgSum += s.put.changeOI;
    });

    let signal = "NEUTRAL";
    let desc = "Balanced option writing near spot.";
    let cssClass = "sentiment-neutral";

    const callChgLakhs = (callChgSum / 100000).toFixed(1);
    const putChgLakhs = (putChgSum / 100000).toFixed(1);

    // Buy/Sell signal triggers
    if (putChgSum > 0 && callChgSum < -20000 && putChgSum > Math.abs(callChgSum)) {
        signal = "STRONG BUY";
        desc = `Short covering in Calls (${callChgLakhs}L) & Put writing (${putChgLakhs}L)`;
        cssClass = "sentiment-bullish";
    } else if (putChgSum > callChgSum + 60000) {
        signal = "BUY";
        desc = `Put writing dominant (+${putChgLakhs}L vs +${callChgLakhs}L Calls)`;
        cssClass = "sentiment-bullish";
    } else if (callChgSum > 0 && putChgSum < -20000 && callChgSum > Math.abs(putChgSum)) {
        signal = "STRONG SELL";
        desc = `Long unwinding in Puts (${putChgLakhs}L) & Call writing (${callChgLakhs}L)`;
        cssClass = "sentiment-bearish";
    } else if (callChgSum > putChgSum + 60000) {
        signal = "SELL";
        desc = `Call writing dominant (+${callChgLakhs}L vs +${putChgLakhs}L Puts)`;
        cssClass = "sentiment-bearish";
    } else {
        if (putChgSum > callChgSum) {
            desc = `Mild Put writing bias (+${putChgLakhs}L Puts vs +${callChgLakhs}L Calls)`;
        } else {
            desc = `Mild Call writing bias (+${callChgLakhs}L Calls vs +${putChgLakhs}L Puts)`;
        }
    }

    return { signal, desc, class: cssClass };
}

/**
 * Update Header and Dashboard KPI widget values
 */
function updateDashboardKPIs() {
    // 1. Ticker price
    spotPriceEl.textContent = currentSpot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    // 2. Ticker net change
    const spotDiff = currentSpot - prevClose;
    const spotPct = (spotDiff / prevClose) * 100;
    const sign = spotDiff >= 0 ? '+' : '';
    spotChangeEl.textContent = `${sign}${spotDiff.toFixed(2)} (${sign}${spotPct.toFixed(2)}%)`;
    spotChangeEl.className = spotDiff >= 0 ? 'ticker-change price-up' : 'ticker-change price-down';

    // 3. PCR
    pcrValEl.textContent = currentChain.pcr;
    let sentiment = 'Neutral';
    let pcrClass = 'sentiment-neutral';
    if (currentChain.pcr > 1.25) {
        sentiment = 'Bullish (Put Writing)';
        pcrClass = 'sentiment-bullish';
    } else if (currentChain.pcr < 0.8) {
        sentiment = 'Bearish (Call Writing)';
        pcrClass = 'sentiment-bearish';
    }
    pcrSentimentEl.textContent = sentiment;
    pcrSentimentEl.className = `kpi-footer ${pcrClass}`;

    // PCR Alerting Trigger check
    const lowLimit = parseFloat(pcrAlertLow.value) || 0.75;
    const highLimit = parseFloat(pcrAlertHigh.value) || 1.25;
    const alertsEnabled = pcrAlertEnable.checked;
    
    if (alertsEnabled && (currentChain.pcr <= lowLimit || currentChain.pcr >= highLimit)) {
        pcrAlertBanner.style.display = 'flex';
        pcrAlertText.textContent = `PCR Threshold Crossed! Nifty PCR is at ${currentChain.pcr.toFixed(3)} (Limit: ${lowLimit.toFixed(2)} - ${highLimit.toFixed(2)}). Market is highly ${currentChain.pcr <= lowLimit ? 'Bearish (Call writing)' : 'Bullish (Put writing)'}!`;
    } else {
        pcrAlertBanner.style.display = 'none';
    }

    // 4. Support and Resistance
    supportValEl.textContent = currentChain.support.strike.toLocaleString('en-IN');
    supportDescEl.textContent = `OI: ${(currentChain.support.oi / 100000).toFixed(1)}L | Sec: ${currentChain.support2.strike}`;
    
    resistanceValEl.textContent = currentChain.resistance.strike.toLocaleString('en-IN');
    resistanceDescEl.textContent = `OI: ${(currentChain.resistance.oi / 100000).toFixed(1)}L | Sec: ${currentChain.resistance2.strike}`;

    // 5. Max Pain
    maxPainValEl.textContent = currentChain.maxPainStrike.toLocaleString('en-IN');

    // 6. OI Shift Signal Indicator
    const signalData = calculateOiShiftSignal(currentChain);
    signalValEl.textContent = signalData.signal;
    signalValEl.className = 'kpi-value ' + signalData.class;
    signalDescEl.textContent = signalData.desc;
    signalIcon.style.color = signalData.class === 'sentiment-bullish' ? 'var(--color-put)' : (signalData.class === 'sentiment-bearish' ? 'var(--color-call)' : 'var(--color-blue)');

    // 7. India VIX
    vixValEl.textContent = indiaVix.toFixed(2);
    const vixSign = vixChange >= 0 ? '+' : '';
    vixChangeEl.textContent = `${vixSign}${vixChange.toFixed(2)}% (${indiaVix > 18 ? 'High Panic' : 'Market Calm'})`;
    vixChangeEl.className = vixChange >= 0 ? 'kpi-footer sentiment-bearish' : 'kpi-footer sentiment-bullish'; // VIX down is bullish for stocks
}

/**
 * Render Option Chain Matrix table
 */
function renderOptionChainTable() {
    optionChainTbody.innerHTML = '';
    
    // Find closest ATM strike to spot
    const strikeInterval = 50;
    const nearestATM = Math.round(currentSpot / strikeInterval) * strikeInterval;
    
    // Get strikes centered around ATM
    let strikesToDisplay = [...currentChain.strikes];
    
    // Apply depth filter
    if (selectedStrikeDepth < currentChain.strikes.length) {
        const atmIndex = currentChain.strikes.findIndex(s => s.strike === nearestATM);
        const halfDepth = Math.floor(selectedStrikeDepth / 2);
        const start = Math.max(0, atmIndex - halfDepth);
        const end = Math.min(currentChain.strikes.length, atmIndex + halfDepth + 1);
        strikesToDisplay = currentChain.strikes.slice(start, end);
    }

    strikesToDisplay.forEach(strikeObj => {
        const strike = strikeObj.strike;
        const call = strikeObj.call;
        const put = strikeObj.put;
        
        // ITM Checks
        const isCallITM = strike < currentSpot;
        const isPutITM = strike > currentSpot;
        
        // ATM highlighting
        const isATM = strike === nearestATM;

        const tr = document.createElement('tr');
        if (isATM) {
            tr.classList.add('strike-row-highlight');
        }

        // Call changes classes
        const callChgClass = call.netChange >= 0 ? 'price-up' : 'price-down';
        const putChgClass = put.netChange >= 0 ? 'price-up' : 'price-down';

        // Set row structure
        tr.innerHTML = `
            <!-- CALLS SECTION -->
            <td class="text-center call-col std-col ${isCallITM ? 'itm-call' : ''}">
                <button class="add-leg-btn call-add" data-strike="${strike}" data-type="call" data-premium="${call.ltp}">+</button>
            </td>
            <td class="call-col std-col ${isCallITM ? 'itm-call' : ''}">${(call.oi / 100000).toFixed(2)}</td>
            <td class="call-col std-col ${isCallITM ? 'itm-call' : ''} ${call.changeOI >= 0 ? 'price-up' : 'price-down'}">${call.changeOI > 0 ? '+' : ''}${(call.changeOI / 100000).toFixed(2)}</td>
            <td class="call-col std-col ${isCallITM ? 'itm-call' : ''}">${call.volume.toLocaleString('en-IN')}</td>
            <td class="call-col std-col ${isCallITM ? 'itm-call' : ''}">${call.iv.toFixed(2)}</td>
            
            <td class="call-col greek-col ${isCallITM ? 'itm-call' : ''}">${call.greeks.delta.toFixed(3)}</td>
            <td class="call-col greek-col ${isCallITM ? 'itm-call' : ''}">${call.greeks.gamma.toFixed(5)}</td>
            <td class="call-col greek-col ${isCallITM ? 'itm-call' : ''}">${call.greeks.theta.toFixed(2)}</td>
            <td class="call-col greek-col ${isCallITM ? 'itm-call' : ''}">${call.greeks.vega.toFixed(2)}</td>
            
            <td class="call-col both-col ${isCallITM ? 'itm-call' : ''}" style="font-weight:600;" id="call-ltp-${strike}">${call.ltp.toFixed(2)}</td>
            <td class="call-col std-col ${isCallITM ? 'itm-call' : ''} ${callChgClass}" id="call-chg-${strike}">${call.netChange > 0 ? '+' : ''}${call.netChange.toFixed(2)}</td>
            
            <!-- STRIKE PRICE -->
            <td class="strike-col both-col ${isATM ? 'strike-col-highlight' : ''}">${strike}</td>
            
            <!-- PUTS SECTION -->
            <td class="put-col std-col ${isPutITM ? 'itm-put' : ''} ${putChgClass}" id="put-chg-${strike}">${put.netChange > 0 ? '+' : ''}${put.netChange.toFixed(2)}</td>
            <td class="put-col both-col ${isPutITM ? 'itm-put' : ''}" style="font-weight:600;" id="put-ltp-${strike}">${put.ltp.toFixed(2)}</td>
            
            <td class="put-col greek-col ${isPutITM ? 'itm-put' : ''}">${put.greeks.vega.toFixed(2)}</td>
            <td class="put-col greek-col ${isPutITM ? 'itm-put' : ''}">${put.greeks.theta.toFixed(2)}</td>
            <td class="put-col greek-col ${isPutITM ? 'itm-put' : ''}">${put.greeks.gamma.toFixed(5)}</td>
            <td class="put-col greek-col ${isPutITM ? 'itm-put' : ''}">${put.greeks.delta.toFixed(3)}</td>
            
            <td class="put-col std-col ${isPutITM ? 'itm-put' : ''}">${put.iv.toFixed(2)}</td>
            <td class="put-col std-col ${isPutITM ? 'itm-put' : ''}">${put.volume.toLocaleString('en-IN')}</td>
            <td class="put-col std-col ${isPutITM ? 'itm-put' : ''} ${put.changeOI >= 0 ? 'price-up' : 'price-down'}">${put.changeOI > 0 ? '+' : ''}${(put.changeOI / 100000).toFixed(2)}</td>
            <td class="put-col std-col ${isPutITM ? 'itm-put' : ''}">${(put.oi / 100000).toFixed(2)}</td>
            <td class="text-center put-col std-col ${isPutITM ? 'itm-put' : ''}">
                <button class="add-leg-btn put-add" data-strike="${strike}" data-type="put" data-premium="${put.ltp}">+</button>
            </td>
        `;

        optionChainTbody.appendChild(tr);
    });

    // Re-bind click event handlers for the newly created "+" buttons
    const addLegButtons = optionChainTbody.querySelectorAll('.add-leg-btn');
    addLegButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const strike = parseInt(btn.dataset.strike);
            const type = btn.dataset.type;
            const premium = parseFloat(btn.dataset.premium);
            
            addStrategyLeg('buy', type, strike, premium);
            
            // Switch tab to Strategy Builder to show the added leg
            const tabBtn = document.querySelector('.nav-tab[data-tab="strategy-builder"]');
            if (tabBtn) tabBtn.click();
        });
    });
}



/**
 * Redraw Analytics Charts
 */
function updateDashboardCharts() {
    if (!currentChain) return;

    updateOiChart(charts.oi, currentChain.strikes);
    updateOiChangeChart(charts.oiChange, currentChain.strikes);
    updateMaxPainChart(charts.maxPain, currentChain.strikes, currentChain.maxPainStrike);
    updateIvSmileChart(charts.ivSmile, currentChain.strikes);
}

/**
 * Strategy Builder: Add a new options leg to the builder
 */
function addStrategyLeg(action, type, strike, premium) {
    if (strategyLegs.length >= 4) {
        alert("Maximum of 4 legs allowed in Strategy Builder!");
        return;
    }

    strategyLegs.push({
        id: nextLegId++,
        action: action,  // 'buy' | 'sell'
        type: type,      // 'call' | 'put'
        strike: strike,
        premium: premium,
        qty: 1,          // default 1 lot
        multiplier: LOT_SIZE
    });

    updateStrategyPayoff();
}

/**
 * Strategy Builder: Render the legs configuration list table
 */
function renderStrategyLegs() {
    strategyLegsTbody.innerHTML = '';
    
    if (strategyLegs.length === 0) {
        builderEmptyState.style.display = 'flex';
        return;
    } else {
        builderEmptyState.style.display = 'none';
    }

    strategyLegs.forEach((leg, index) => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>
                <span class="badge ${leg.action === 'buy' ? 'badge-buy' : 'badge-sell'}">${leg.action.toUpperCase()}</span>
            </td>
            <td>
                <span class="badge ${leg.type === 'call' ? 'badge-call' : 'badge-put'}">${leg.type.toUpperCase()}</span>
            </td>
            <td>
                <input type="number" class="leg-input" value="${leg.strike}" step="50" id="leg-strike-${leg.id}">
            </td>
            <td>
                <input type="number" class="leg-input" value="${leg.premium}" step="0.05" id="leg-premium-${leg.id}">
            </td>
            <td>
                <span style="font-family: var(--font-mono); color: var(--text-secondary);">${leg.multiplier}</span>
            </td>
            <td>
                <input type="number" class="leg-input" value="${leg.qty}" min="1" max="100" id="leg-qty-${leg.id}">
            </td>
            <td style="text-align: center;">
                <button class="add-leg-btn" style="border-color: rgba(244,63,94,0.3); color: var(--color-call);" id="leg-del-${leg.id}">×</button>
            </td>
        `;

        strategyLegsTbody.appendChild(tr);

        // Bind leg values change events
        document.getElementById(`leg-strike-${leg.id}`).addEventListener('change', (e) => {
            leg.strike = parseInt(e.target.value);
            updateStrategyPayoff();
        });

        document.getElementById(`leg-premium-${leg.id}`).addEventListener('change', (e) => {
            leg.premium = parseFloat(e.target.value);
            updateStrategyPayoff();
        });

        document.getElementById(`leg-qty-${leg.id}`).addEventListener('change', (e) => {
            leg.qty = parseInt(e.target.value);
            updateStrategyPayoff();
        });

        // Delete button click
        document.getElementById(`leg-del-${leg.id}`).addEventListener('click', () => {
            strategyLegs.splice(index, 1);
            updateStrategyPayoff();
        });
    });
}

/**
 * Strategy Builder: Recalculate Payoff profile (Max profit, max loss, breakevens, greeks) and redraw
 */
function updateStrategyPayoff() {
    renderStrategyLegs();
    updatePayoffChart(charts.payoff, strategyLegs, currentSpot);
    
    if (strategyLegs.length === 0) {
        payoffNetPremiumEl.textContent = '₹0.00';
        payoffNetPremiumEl.className = 'payoff-card-value';
        payoffMaxProfitEl.textContent = '₹0.00';
        payoffMaxLossEl.textContent = '₹0.00';
        payoffBreakevenEl.textContent = 'N/A';
        
        stratDeltaEl.textContent = '0.00';
        stratGammaEl.textContent = '0.00';
        stratThetaEl.textContent = '0.00';
        stratVegaEl.textContent = '0.00';
        return;
    }

    // 1. Calculate Net Premium
    let netPremium = 0;
    strategyLegs.forEach(leg => {
        const size = leg.qty * leg.multiplier;
        if (leg.action === 'buy') {
            netPremium -= (leg.premium * size); // Debit
        } else {
            netPremium += (leg.premium * size); // Credit
        }
    });

    const isCredit = netPremium >= 0;
    payoffNetPremiumEl.textContent = (isCredit ? 'Credit: +' : 'Debit: -') + '₹' + Math.abs(netPremium).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    payoffNetPremiumEl.className = 'payoff-card-value ' + (isCredit ? 'val-positive' : 'val-negative');

    // 2. Numerical search for Max Profit / Max Loss
    const profitLossMetrics = calculateMaxProfitLoss(strategyLegs, currentSpot);
    payoffMaxProfitEl.textContent = profitLossMetrics.maxProfit;
    payoffMaxProfitEl.className = 'payoff-card-value ' + (profitLossMetrics.maxProfit === 'Unlimited' || parseFloat(profitLossMetrics.maxProfit.replace(/[^0-9.-]/g, '')) > 0 ? 'val-positive' : '');
    
    payoffMaxLossEl.textContent = profitLossMetrics.maxLoss;
    payoffMaxLossEl.className = 'payoff-card-value ' + (profitLossMetrics.maxLoss === 'Unlimited' ? 'val-negative' : '');

    // 3. Find Breakevens
    const bes = calculateBreakevens(strategyLegs, currentSpot);
    if (bes.length === 0) {
        payoffBreakevenEl.textContent = 'None';
    } else {
        payoffBreakevenEl.textContent = bes.map(b => `₹${b.toLocaleString('en-IN')}`).join(', ');
    }

    // 4. Combined Strategy Greeks
    let totDelta = 0;
    let totGamma = 0;
    let totTheta = 0;
    let totVega = 0;

    strategyLegs.forEach(leg => {
        // Fetch Greek parameters from greeks calculator based on leg's strike
        const iv = 15; // standard volatility assumption for calculations
        const days = currentChain.daysToExpiry;
        const g = calculateGreeks(currentSpot, leg.strike, days, iv, RISK_FREE_RATE);

        const factor = leg.action === 'buy' ? 1.0 : -1.0;
        const size = leg.qty * leg.multiplier;

        if (leg.type === 'call') {
            totDelta += (g.callDelta * factor * size);
            totTheta += (g.callTheta * factor * size);
        } else {
            totDelta += (g.putDelta * factor * size);
            totTheta += (g.putTheta * factor * size);
        }
        
        totGamma += (g.gamma * factor * size);
        totVega += (g.vega * factor * size);
    });

    stratDeltaEl.textContent = (totDelta >= 0 ? '+' : '') + totDelta.toFixed(2);
    stratDeltaEl.className = 'payoff-card-value ' + (totDelta >= 0 ? 'val-positive' : 'val-negative');
    
    stratGammaEl.textContent = totGamma.toFixed(4);
    
    stratThetaEl.textContent = (totTheta >= 0 ? '+' : '') + totTheta.toFixed(2);
    stratThetaEl.className = 'payoff-card-value ' + (totTheta >= 0 ? 'val-positive' : 'val-negative');
    
    stratVegaEl.textContent = (totVega >= 0 ? '+' : '') + totVega.toFixed(2);
    stratVegaEl.className = 'payoff-card-value ' + (totVega >= 0 ? 'val-positive' : 'val-negative');
}

/**
 * General helper to compute strategy payout at any simulated spot price
 */
function getPnlAtPrice(simSpot, legs) {
    let totalPnl = 0;
    legs.forEach(leg => {
        const K = leg.strike;
        const premium = leg.premium;
        const size = leg.qty * leg.multiplier;

        let legPnlPerShare = 0;
        if (leg.type === 'call') {
            const intrinsicValue = Math.max(simSpot - K, 0);
            if (leg.action === 'buy') {
                legPnlPerShare = intrinsicValue - premium;
            } else {
                legPnlPerShare = premium - intrinsicValue;
            }
        } else {
            const intrinsicValue = Math.max(K - simSpot, 0);
            if (leg.action === 'buy') {
                legPnlPerShare = intrinsicValue - premium;
            } else {
                legPnlPerShare = premium - intrinsicValue;
            }
        }
        totalPnl += (legPnlPerShare * size);
    });
    return totalPnl;
}

/**
 * Calculate Max Profit and Max Loss using grid scan
 */
function calculateMaxProfitLoss(legs, spot) {
    const points = [];
    const minScan = spot * 0.5; // scan down to -50%
    const maxScan = spot * 1.5; // scan up to +50%
    const step = 50;

    for (let p = minScan; p <= maxScan; p += step) {
        points.push(getPnlAtPrice(p, legs));
    }

    // Add zero and extreme bounds
    points.push(getPnlAtPrice(0, legs));
    points.push(getPnlAtPrice(spot * 4, legs));

    const minPnl = Math.min(...points);
    const maxPnl = Math.max(...points);

    // Dynamic upper bound slopes
    const pFar1 = getPnlAtPrice(spot * 5, legs);
    const pFar2 = getPnlAtPrice(spot * 6, legs);
    
    let maxProfit = "";
    let maxLoss = "";

    // If P&L grows towards infinity at upper bounds
    if (pFar2 > pFar1 + 500) {
        maxProfit = "Unlimited";
    } else {
        maxProfit = "₹" + Math.round(maxPnl).toLocaleString('en-IN');
    }

    // If P&L shrinks towards negative infinity
    if (pFar2 < pFar1 - 500) {
        maxLoss = "Unlimited";
    } else {
        // Capped loss (maximum loss occurs at some point on the scan)
        maxLoss = "₹" + Math.round(Math.abs(minPnl)).toLocaleString('en-IN');
    }

    // Special edge case check: if strategy is net debit (like Straddle),
    // and both extremes are positive, verify minimum P&L is indeed negative (Max Loss is premium paid)
    // If maximum profit is actually negative, display properly.
    return { maxProfit, maxLoss };
}

/**
 * Find exact breakevens by scanning price line and finding zero crossings
 */
function calculateBreakevens(legs, spot) {
    const lower = spot * 0.7; // search window +/- 30%
    const upper = spot * 1.3;
    const step = 2; // high precision step
    const breakevens = [];
    
    let prevPnl = getPnlAtPrice(lower, legs);

    for (let p = lower + step; p <= upper; p += step) {
        const pnl = getPnlAtPrice(p, legs);
        if ((prevPnl < 0 && pnl >= 0) || (prevPnl >= 0 && pnl < 0)) {
            // Interpolate exact crossing point
            const ratio = -prevPnl / (pnl - prevPnl);
            const be = p - step + ratio * step;
            breakevens.push(Math.round(be));
        }
        prevPnl = pnl;
    }
    return breakevens;
}

/**
 * Strategy Builder: Apply standard pre-built options templates
 */
function applyStrategyTemplate(templateName) {
    strategyLegs = [];
    const interval = 50;
    const atm = Math.round(currentSpot / interval) * interval;
    
    // Find ATM option premium from chain to make template prices realistic
    const atmStrikeObj = currentChain.strikes.find(s => s.strike === atm) || currentChain.strikes[10];
    const callAtmPremium = atmStrikeObj.call.ltp;
    const putAtmPremium = atmStrikeObj.put.ltp;

    switch (templateName) {
        case 'bull_call_spread':
            // Buy ATM Call, Sell OTM Call (ATM + 100)
            const otmCallStrike = atm + 100;
            const otmCallObj = currentChain.strikes.find(s => s.strike === otmCallStrike) || currentChain.strikes[12];
            
            strategyLegs.push({ id: nextLegId++, action: 'buy', type: 'call', strike: atm, premium: callAtmPremium, qty: 1, multiplier: LOT_SIZE });
            strategyLegs.push({ id: nextLegId++, action: 'sell', type: 'call', strike: otmCallStrike, premium: otmCallObj.call.ltp, qty: 1, multiplier: LOT_SIZE });
            break;

        case 'bear_put_spread':
            // Buy ATM Put, Sell OTM Put (ATM - 100)
            const otmPutStrike = atm - 100;
            const otmPutObj = currentChain.strikes.find(s => s.strike === otmPutStrike) || currentChain.strikes[8];
            
            strategyLegs.push({ id: nextLegId++, action: 'buy', type: 'put', strike: atm, premium: putAtmPremium, qty: 1, multiplier: LOT_SIZE });
            strategyLegs.push({ id: nextLegId++, action: 'sell', type: 'put', strike: otmPutStrike, premium: otmPutObj.put.ltp, qty: 1, multiplier: LOT_SIZE });
            break;

        case 'iron_condor':
            // Sell OTM Put (ATM-100), Buy OTM Put (ATM-200), Sell OTM Call (ATM+100), Buy OTM Call (ATM+200)
            const putSellK = atm - 100;
            const putBuyK = atm - 200;
            const callSellK = atm + 100;
            const callBuyK = atm + 200;

            const pSellObj = currentChain.strikes.find(s => s.strike === putSellK) || currentChain.strikes[8];
            const pBuyObj = currentChain.strikes.find(s => s.strike === putBuyK) || currentChain.strikes[6];
            const cSellObj = currentChain.strikes.find(s => s.strike === callSellK) || currentChain.strikes[12];
            const cBuyObj = currentChain.strikes.find(s => s.strike === callBuyK) || currentChain.strikes[14];

            strategyLegs.push({ id: nextLegId++, action: 'sell', type: 'put', strike: putSellK, premium: pSellObj.put.ltp, qty: 1, multiplier: LOT_SIZE });
            strategyLegs.push({ id: nextLegId++, action: 'buy', type: 'put', strike: putBuyK, premium: pBuyObj.put.ltp, qty: 1, multiplier: LOT_SIZE });
            strategyLegs.push({ id: nextLegId++, action: 'sell', type: 'call', strike: callSellK, premium: cSellObj.call.ltp, qty: 1, multiplier: LOT_SIZE });
            strategyLegs.push({ id: nextLegId++, action: 'buy', type: 'call', strike: callBuyK, premium: cBuyObj.call.ltp, qty: 1, multiplier: LOT_SIZE });
            break;

        case 'straddle':
            // Buy ATM Call and Buy ATM Put
            strategyLegs.push({ id: nextLegId++, action: 'buy', type: 'call', strike: atm, premium: callAtmPremium, qty: 1, multiplier: LOT_SIZE });
            strategyLegs.push({ id: nextLegId++, action: 'buy', type: 'put', strike: atm, premium: putAtmPremium, qty: 1, multiplier: LOT_SIZE });
            break;

        case 'strangle':
            // Buy OTM Call (ATM + 100) and Buy OTM Put (ATM - 100)
            const strangleCallK = atm + 100;
            const stranglePutK = atm - 100;
            const strangleCallObj = currentChain.strikes.find(s => s.strike === strangleCallK) || currentChain.strikes[12];
            const stranglePutObj = currentChain.strikes.find(s => s.strike === stranglePutK) || currentChain.strikes[8];

            strategyLegs.push({ id: nextLegId++, action: 'buy', type: 'call', strike: strangleCallK, premium: strangleCallObj.call.ltp, qty: 1, multiplier: LOT_SIZE });
            strategyLegs.push({ id: nextLegId++, action: 'buy', type: 'put', strike: stranglePutK, premium: stranglePutObj.put.ltp, qty: 1, multiplier: LOT_SIZE });
            break;

        case 'iron_butterfly':
            // Sell ATM Call, Sell ATM Put, Buy OTM Call (ATM+150), Buy OTM Put (ATM-150)
            const outC = atm + 150;
            const outP = atm - 150;
            const outCObj = currentChain.strikes.find(s => s.strike === outC) || currentChain.strikes[13];
            const outPObj = currentChain.strikes.find(s => s.strike === outP) || currentChain.strikes[7];

            strategyLegs.push({ id: nextLegId++, action: 'sell', type: 'call', strike: atm, premium: callAtmPremium, qty: 1, multiplier: LOT_SIZE });
            strategyLegs.push({ id: nextLegId++, action: 'sell', type: 'put', strike: atm, premium: putAtmPremium, qty: 1, multiplier: LOT_SIZE });
            strategyLegs.push({ id: nextLegId++, action: 'buy', type: 'call', strike: outC, premium: outCObj.call.ltp, qty: 1, multiplier: LOT_SIZE });
            strategyLegs.push({ id: nextLegId++, action: 'buy', type: 'put', strike: outP, premium: outPObj.put.ltp, qty: 1, multiplier: LOT_SIZE });
            break;

        default:
            // Custom Leg Builder, clear strategy
            strategyLegs = [];
            break;
    }

    updateStrategyPayoff();
}

/**
 * Greeks Calculator: Reads input sliders, displays values, computes BS outputs
 */
function updateGreeksCalculator() {
    const spot = parseFloat(sliderSpot.value);
    const strike = parseFloat(sliderStrike.value);
    const days = parseInt(sliderDays.value);
    const iv = parseFloat(sliderIv.value);
    const rate = parseFloat(sliderRate.value);

    // Update labels text
    sliderSpotVal.textContent = spot.toLocaleString('en-IN');
    sliderStrikeVal.textContent = strike.toLocaleString('en-IN');
    sliderDaysVal.textContent = `${days} day${days > 1 ? 's' : ''}`;
    sliderIvVal.textContent = `${iv.toFixed(2)}%`;
    sliderRateVal.textContent = `${rate.toFixed(2)}%`;

    // Calculate Greeks
    const results = calculateGreeks(spot, strike, days, iv, rate);

    // Update HTML Call values
    calcCallPriceEl.textContent = '₹' + results.callPrice.toFixed(2);
    calcCallDeltaEl.textContent = results.callDelta.toFixed(4);
    calcCallGammaEl.textContent = results.gamma.toFixed(6);
    calcCallThetaEl.textContent = results.callTheta.toFixed(4);
    calcCallVegaEl.textContent = results.vega.toFixed(4);
    calcCallRhoEl.textContent = results.callRho.toFixed(4);

    // Update HTML Put values
    calcPutPriceEl.textContent = '₹' + results.putPrice.toFixed(2);
    calcPutDeltaEl.textContent = results.putDelta.toFixed(4);
    calcPutGammaEl.textContent = results.gamma.toFixed(6);
    calcPutThetaEl.textContent = results.putTheta.toFixed(4);
    calcPutVegaEl.textContent = results.vega.toFixed(4);
    calcPutRhoEl.textContent = results.putRho.toFixed(4);
}
