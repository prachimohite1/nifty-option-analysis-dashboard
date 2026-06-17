/**
 * Nifty Option Chain Data Engine
 * Generates realistic options chain data, calculates support/resistance,
 * computes Max Pain, and simulates real-time price updates.
 */

// We assume calculateGreeks is available globally (from greeks.js)
// If running in Node, we require it
if (typeof require !== 'undefined' && typeof calculateGreeks === 'undefined') {
    const { calculateGreeks } = require('./greeks');
}

const LOT_SIZE = 25; // Nifty Standard Lot Size (25 shares)
const RISK_FREE_RATE = 7.0; // 7% annual risk-free rate in India
const BASE_SPOT = 23500; // Starting Nifty spot price

// Sample expiry dates and days-to-expiry
const EXPY_DATES = [
    { date: "25-Jun-2026", days: 8, label: "Weekly (Near)" },
    { date: "02-Jul-2026", days: 15, label: "Weekly (Next)" },
    { date: "30-Jul-2026", days: 43, label: "Monthly (July)" }
];

/**
 * Generate a static option chain for a given spot price and expiry
 */
function generateOptionChain(spot, daysToExpiry) {
    const strikesCount = 21; // 10 ITM, 10 OTM, 1 ATM
    const strikeInterval = 50; // Nifty standard interval
    
    // Find the nearest strike to spot
    const nearestATM = Math.round(spot / strikeInterval) * strikeInterval;
    const startStrike = nearestATM - (Math.floor(strikesCount / 2) * strikeInterval);
    
    const chain = {
        spot: spot,
        daysToExpiry: daysToExpiry,
        strikes: [],
        totalCallOI: 0,
        totalPutOI: 0,
        pcr: 0,
        maxPainStrike: 0,
        support: { strike: 0, oi: 0, level: 'Primary' },
        resistance: { strike: 0, oi: 0, level: 'Primary' },
        support2: { strike: 0, oi: 0, level: 'Secondary' },
        resistance2: { strike: 0, oi: 0, level: 'Secondary' }
    };

    const strikesList = [];
    for (let i = 0; i < strikesCount; i++) {
        strikesList.push(startStrike + i * strikeInterval);
    }

    // High OI concentrations at round strikes
    // We generate base OI values that look like a natural bell curve centered near ATM, 
    // but with spikes at round levels (e.g. 23000, 23500, 24000)
    strikesList.forEach(strike => {
        // Base IV (Smile effect: higher IV at far OTM calls/puts)
        const distFromAtm = Math.abs(strike - nearestATM);
        const ivCall = 12.0 + (strike < nearestATM ? (distFromAtm / 100.0) * 1.5 : (distFromAtm / 100.0) * 0.8);
        const ivPut = 12.0 + (strike > nearestATM ? (distFromAtm / 100.0) * 1.5 : (distFromAtm / 100.0) * 0.8);

        // Calculate Greeks
        const callGreeks = calculateGreeks(spot, strike, daysToExpiry, ivCall, RISK_FREE_RATE);
        const putGreeks = calculateGreeks(spot, strike, daysToExpiry, ivPut, RISK_FREE_RATE);

        // Mock Open Interest (OI) in lakhs (1 lakh = 100,000 contracts)
        // Put OI is higher below spot (support). Call OI is higher above spot (resistance).
        let callOIBase = 500000 / (1 + Math.max(0, nearestATM - strike) / 100);
        let putOIBase = 500000 / (1 + Math.max(0, strike - nearestATM) / 100);

        if (strike > nearestATM) {
            callOIBase *= 1.8; // Calls are active above spot
            putOIBase *= 0.4;  // Puts are inactive far above spot
        } else if (strike < nearestATM) {
            callOIBase *= 0.4; // Calls are inactive far below spot
            putOIBase *= 1.8;  // Puts are active below spot
        }

        // Add round number spikes
        if (strike % 500 === 0) {
            callOIBase *= 2.2;
            putOIBase *= 2.2;
        } else if (strike % 100 === 0) {
            callOIBase *= 1.5;
            putOIBase *= 1.5;
        }

        // Add some random noise to OI
        const callOI = Math.round(callOIBase * (0.8 + Math.random() * 0.4));
        const putOI = Math.round(putOIBase * (0.8 + Math.random() * 0.4));

        // Change in OI (intraday changes)
        // Usually positive, but can be negative (short covering / unwinding)
        // Puts unwind if market falls; Calls unwind if market rises.
        const prevCallOI = Math.round(callOI * (0.9 + Math.random() * 0.15));
        const prevPutOI = Math.round(putOI * (0.9 + Math.random() * 0.15));
        const callChangeOI = callOI - prevCallOI;
        const putChangeOI = putOI - prevPutOI;

        // Traded Volumes
        const callVolume = Math.round(callOI * (2 + Math.random() * 4));
        const putVolume = Math.round(putOI * (2 + Math.random() * 4));

        // Bid-Ask Spread
        const callSpread = Math.max(0.1, callGreeks.callPrice * 0.005);
        const putSpread = Math.max(0.1, putGreeks.putPrice * 0.005);

        chain.strikes.push({
            strike: strike,
            call: {
                oi: callOI,
                changeOI: callChangeOI,
                volume: callVolume,
                iv: parseFloat(ivCall.toFixed(2)),
                ltp: parseFloat(callGreeks.callPrice.toFixed(2)),
                netChange: parseFloat((callGreeks.callPrice * (Math.random() * 0.1 - 0.05)).toFixed(2)),
                bid: parseFloat(Math.max(0.05, callGreeks.callPrice - callSpread).toFixed(2)),
                ask: parseFloat((callGreeks.callPrice + callSpread).toFixed(2)),
                greeks: {
                    delta: callGreeks.callDelta,
                    gamma: callGreeks.gamma,
                    theta: callGreeks.callTheta,
                    vega: callGreeks.vega,
                    rho: callGreeks.callRho
                }
            },
            put: {
                oi: putOI,
                changeOI: putChangeOI,
                volume: putVolume,
                iv: parseFloat(ivPut.toFixed(2)),
                ltp: parseFloat(putGreeks.putPrice.toFixed(2)),
                netChange: parseFloat((putGreeks.putPrice * (Math.random() * 0.1 - 0.05)).toFixed(2)),
                bid: parseFloat(Math.max(0.05, putGreeks.putPrice - putSpread).toFixed(2)),
                ask: parseFloat((putGreeks.putPrice + putSpread).toFixed(2)),
                greeks: {
                    delta: putGreeks.putDelta,
                    gamma: putGreeks.gamma,
                    theta: putGreeks.putTheta,
                    vega: putGreeks.vega,
                    rho: putGreeks.putRho
                }
            }
        });

        chain.totalCallOI += callOI;
        chain.totalPutOI += putOI;
    });

    chain.pcr = parseFloat((chain.totalPutOI / chain.totalCallOI).toFixed(3));

    // Calculate Max Pain
    chain.maxPainStrike = calculateMaxPain(chain.strikes);

    // Calculate Support and Resistance
    calculateSupportResistance(chain);

    return chain;
}

/**
 * Calculate the Max Pain strike
 * Max Pain is the strike where option buyers lose the most (i.e. sellers/writers have minimum payout)
 */
function calculateMaxPain(strikes) {
    let minPain = Infinity;
    let maxPainStrike = strikes[0].strike;

    // Evaluate total pain at each strike as an expiry settlement price
    strikes.forEach(targetStrikeObj => {
        const targetStrike = targetStrikeObj.strike;
        let totalPain = 0;

        strikes.forEach(strikeObj => {
            const strike = strikeObj.strike;
            
            // Call Pain: If expiry is above strike, call buyers make money (sellers lose)
            if (targetStrike > strike) {
                totalPain += (targetStrike - strike) * strikeObj.call.oi;
            }
            
            // Put Pain: If expiry is below strike, put buyers make money (sellers lose)
            if (targetStrike < strike) {
                totalPain += (strike - targetStrike) * strikeObj.put.oi;
            }
        });

        if (totalPain < minPain) {
            minPain = totalPain;
            maxPainStrike = targetStrike;
        }
    });

    return maxPainStrike;
}

/**
 * Calculate Support and Resistance levels
 * Resistance = Strike with highest Call OI
 * Support = Strike with highest Put OI
 */
function calculateSupportResistance(chain) {
    let sortedCalls = [...chain.strikes].sort((a, b) => b.call.oi - a.call.oi);
    let sortedPuts = [...chain.strikes].sort((a, b) => b.put.oi - a.put.oi);

    // Primary
    chain.resistance.strike = sortedCalls[0].strike;
    chain.resistance.oi = sortedCalls[0].call.oi;
    
    chain.support.strike = sortedPuts[0].strike;
    chain.support.oi = sortedPuts[0].put.oi;

    // Secondary (ensuring it's not the same strike as primary if possible)
    let secCallIndex = sortedCalls[1].strike === chain.resistance.strike ? 2 : 1;
    chain.resistance2.strike = sortedCalls[secCallIndex].strike;
    chain.resistance2.oi = sortedCalls[secCallIndex].call.oi;

    let secPutIndex = sortedPuts[1].strike === chain.support.strike ? 2 : 1;
    chain.support2.strike = sortedPuts[secPutIndex].strike;
    chain.support2.oi = sortedPuts[secPutIndex].put.oi;
}

/**
 * Simulate minor updates in Nifty spot price and option chain values
 */
function updateOptionChainTicks(chain, newSpot) {
    chain.spot = newSpot;
    
    // Recalculate support/resistance, greeks, and prices based on the new spot
    const nearestATM = Math.round(newSpot / 50) * 50;

    chain.strikes.forEach(strikeObj => {
        const strike = strikeObj.strike;
        const distFromAtm = Math.abs(strike - nearestATM);
        
        // Dynamic IV adjustments based on spot movement
        const ivCall = strikeObj.call.iv + (Math.random() * 0.2 - 0.1);
        const ivPut = strikeObj.put.iv + (Math.random() * 0.2 - 0.1);
        
        strikeObj.call.iv = parseFloat(Math.max(5.0, Math.min(30.0, ivCall)).toFixed(2));
        strikeObj.put.iv = parseFloat(Math.max(5.0, Math.min(30.0, ivPut)).toFixed(2));

        // Recalculate Greeks & Price
        const callGreeks = calculateGreeks(newSpot, strike, chain.daysToExpiry, strikeObj.call.iv, RISK_FREE_RATE);
        const putGreeks = calculateGreeks(newSpot, strike, chain.daysToExpiry, strikeObj.put.iv, RISK_FREE_RATE);

        // Update call details
        const callSpread = Math.max(0.1, callGreeks.callPrice * 0.005);
        const oldCallLtp = strikeObj.call.ltp;
        strikeObj.call.ltp = parseFloat(callGreeks.callPrice.toFixed(2));
        strikeObj.call.netChange = parseFloat((strikeObj.call.netChange + (strikeObj.call.ltp - oldCallLtp)).toFixed(2));
        strikeObj.call.bid = parseFloat(Math.max(0.05, callGreeks.callPrice - callSpread).toFixed(2));
        strikeObj.call.ask = parseFloat((callGreeks.callPrice + callSpread).toFixed(2));
        strikeObj.call.greeks = {
            delta: callGreeks.callDelta,
            gamma: callGreeks.gamma,
            theta: callGreeks.callTheta,
            vega: callGreeks.vega,
            rho: callGreeks.callRho
        };

        // Update put details
        const putSpread = Math.max(0.1, putGreeks.putPrice * 0.005);
        const oldPutLtp = strikeObj.put.ltp;
        strikeObj.put.ltp = parseFloat(putGreeks.putPrice.toFixed(2));
        strikeObj.put.netChange = parseFloat((strikeObj.put.netChange + (strikeObj.put.ltp - oldPutLtp)).toFixed(2));
        strikeObj.put.bid = parseFloat(Math.max(0.05, putGreeks.putPrice - putSpread).toFixed(2));
        strikeObj.put.ask = parseFloat((putGreeks.putPrice + putSpread).toFixed(2));
        strikeObj.put.greeks = {
            delta: putGreeks.putDelta,
            gamma: putGreeks.gamma,
            theta: putGreeks.putTheta,
            vega: putGreeks.vega,
            rho: putGreeks.putRho
        };

        // Micro fluctuations in OI & Volume
        if (Math.random() < 0.15) { // 15% chance of tick update in volumes
            const callOiTick = Math.round(Math.random() * 5000 - 2000);
            const putOiTick = Math.round(Math.random() * 5000 - 2000);
            
            strikeObj.call.oi = Math.max(10000, strikeObj.call.oi + callOiTick);
            strikeObj.put.oi = Math.max(10000, strikeObj.put.oi + putOiTick);
            
            strikeObj.call.changeOI += callOiTick;
            strikeObj.put.changeOI += putOiTick;

            strikeObj.call.volume += Math.round(Math.random() * 10000);
            strikeObj.put.volume += Math.round(Math.random() * 10000);
        }
    });

    // Recompute totals
    let totCallOI = 0;
    let totPutOI = 0;
    chain.strikes.forEach(s => {
        totCallOI += s.call.oi;
        totPutOI += s.put.oi;
    });

    chain.totalCallOI = totCallOI;
    chain.totalPutOI = totPutOI;
    chain.pcr = parseFloat((totPutOI / totCallOI).toFixed(3));
    chain.maxPainStrike = calculateMaxPain(chain.strikes);
    calculateSupportResistance(chain);

    return chain;
}

// Export functions if running in Node/ES6, otherwise bind to window
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        generateOptionChain, 
        calculateMaxPain, 
        calculateSupportResistance, 
        updateOptionChainTicks, 
        EXPY_DATES, 
        LOT_SIZE, 
        BASE_SPOT 
    };
} else {
    window.generateOptionChain = generateOptionChain;
    window.calculateMaxPain = calculateMaxPain;
    window.calculateSupportResistance = calculateSupportResistance;
    window.updateOptionChainTicks = updateOptionChainTicks;
    window.EXPY_DATES = EXPY_DATES;
    window.LOT_SIZE = LOT_SIZE;
    window.BASE_SPOT = BASE_SPOT;
}
