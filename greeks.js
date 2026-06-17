/**
 * Black-Scholes Options Pricing and Greeks Calculator
 */

// Standard normal cumulative distribution function (approximation)
function stdNormalCDF(x) {
    if (x < 0) {
        return 1.0 - stdNormalCDF(-x);
    }
    const p = 0.2316419;
    const b1 = 0.319381530;
    const b2 = -0.356563782;
    const b3 = 1.781477937;
    const b4 = -1.821255978;
    const b5 = 1.330274429;

    const t = 1.0 / (1.0 + p * x);
    const fact = (((b5 * t + b4) * t + b3) * t + b2) * t + b1;
    return 1.0 - (1.0 / Math.sqrt(2.0 * Math.PI)) * Math.exp(-x * x / 2.0) * fact * t;
}

// Standard normal probability density function
function stdNormalPDF(x) {
    return (1.0 / Math.sqrt(2.0 * Math.PI)) * Math.exp(-x * x / 2.0);
}

/**
 * Calculate Black-Scholes option price and Greeks
 * @param {number} S - Spot price (Underlying price)
 * @param {number} K - Strike price
 * @param {number} tDays - Time to expiry in days
 * @param {number} ivPct - Implied Volatility in percentage (e.g., 15 for 15%)
 * @param {number} rPct - Risk-free interest rate in percentage (e.g., 7 for 7%)
 */
function calculateGreeks(S, K, tDays, ivPct, rPct = 7) {
    // Convert inputs
    const T = Math.max(tDays, 0.0001) / 365.0; // Time in years (avoid division by zero or negative)
    const sigma = Math.max(ivPct, 0.1) / 100.0; // Volatility as decimal
    const r = rPct / 100.0; // Interest rate as decimal

    const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2.0) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);

    const Nd1 = stdNormalCDF(d1);
    const Nd2 = stdNormalCDF(d2);
    const N_d1 = stdNormalCDF(-d1);
    const N_d2 = stdNormalCDF(-d2);
    const nd1 = stdNormalPDF(d1);

    const expRT = Math.exp(-r * T);

    // Theoretical Prices
    const callPrice = S * Nd1 - K * expRT * Nd2;
    const putPrice = K * expRT * N_d2 - S * N_d1;

    // Delta
    const callDelta = Nd1;
    const putDelta = Nd1 - 1.0;

    // Gamma (same for Call and Put)
    const gamma = nd1 / (S * sigma * Math.sqrt(T));

    // Vega (same for Call and Put) - change in option price per 1% change in volatility
    // BS Vega is dV/dSigma. To get per 1% change: (S * sqrt(T) * nd1) * 0.01
    const vega = (S * Math.sqrt(T) * nd1) * 0.01;

    // Theta (decay per day)
    // BS Theta is dV/dT. Standard formula is per year, we divide by 365 to get daily decay.
    const thetaCallTerm1 = -(S * nd1 * sigma) / (2.0 * Math.sqrt(T));
    const thetaCallTerm2 = r * K * expRT * Nd2;
    const callTheta = (thetaCallTerm1 - thetaCallTerm2) / 365.0;

    const thetaPutTerm1 = -(S * nd1 * sigma) / (2.0 * Math.sqrt(T));
    const thetaPutTerm2 = r * K * expRT * N_d2;
    const putTheta = (thetaPutTerm1 + thetaPutTerm2) / 365.0;

    // Rho (change per 1% change in interest rate)
    // BS Rho is dV/dr. For 1% change, multiply by 0.01.
    const callRho = (K * T * expRT * Nd2) * 0.01;
    const putRho = (-K * T * expRT * N_d2) * 0.01;

    return {
        callPrice: Math.max(callPrice, 0.05), // Options cannot trade below minimum tick (0.05 in NSE)
        putPrice: Math.max(putPrice, 0.05),
        callDelta: parseFloat(callDelta.toFixed(4)),
        putDelta: parseFloat(putDelta.toFixed(4)),
        gamma: parseFloat(gamma.toFixed(6)),
        vega: parseFloat(vega.toFixed(4)),
        callTheta: parseFloat(callTheta.toFixed(4)),
        putTheta: parseFloat(putTheta.toFixed(4)),
        callRho: parseFloat(callRho.toFixed(4)),
        putRho: parseFloat(putRho.toFixed(4))
    };
}

// Export functions if running in Node/ES6, otherwise bind to window
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateGreeks, stdNormalCDF, stdNormalPDF };
} else {
    window.calculateGreeks = calculateGreeks;
}
