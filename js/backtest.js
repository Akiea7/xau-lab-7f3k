import { detectSignal } from './engine.js';
import { calculatePosition, calculatePnL } from './risk.js';

export function runProfessionalBacktest(data, indicators, options) {
    let { balance = 10000, riskPct = 1.0, rr = 2.0, maxTradesPerDay = 4, spread = 0.30, slippage = 0.10, commissionPerLot = 7.00, contractSize = 100 } = options;
    let initialBalance = balance;
    let peakEquity = balance;
    let maxDrawdownPct = 0;
    let trades = [];
    let equityCurve = []; // 🔴 إضافة مصفوفة الـ Equity Curve
    let openTrade = null;
    let dailyTradeCount = 0;
    let currentDay = null;

    for (let i = 50; i < data.length; i++) {
        const bar = data[i];
        const barDate = new Date(bar.t).toDateString();
        if (barDate !== currentDay) { currentDay = barDate; dailyTradeCount = 0; }

        if (openTrade) {
            let exitPrice = null; let reason = '';
            let hitSL = false, hitTP = false;

            // 🟠 محاكاة Bid/Ask للخروج
            if (openTrade.side === 'BUY') {
                // الشراء يخرج على سعر الـ Bid (نفس سعر الشارت)
                if (bar.l <= openTrade.sl) hitSL = true;
                if (bar.h >= openTrade.tp) hitTP = true;
            } else {
                // البيع يخرج على سعر الـ Ask (السعر + السبريد)
                if (bar.h + spread >= openTrade.sl) hitSL = true;
                if (bar.l + spread <= openTrade.tp) hitTP = true;
            }

            if (hitSL && hitTP) hitTP = false; // Conservative SL Policy

            if (hitSL) { exitPrice = openTrade.side==='BUY' ? openTrade.sl - slippage : openTrade.sl + slippage; reason = 'Hit SL'; }
            else if (hitTP) { exitPrice = openTrade.tp; reason = 'Hit TP'; }

            if (!exitPrice && i === data.length - 1) { exitPrice = openTrade.side === 'BUY' ? bar.c : (bar.c + spread); reason = 'End of Data'; }

            if (exitPrice) {
                const pnl = calculatePnL(openTrade.actualEntry, exitPrice, openTrade.side, openTrade.lots, { contractSize, commissionPerLot });
                balance += pnl;
                openTrade.exit = exitPrice; openTrade.pnl = pnl; openTrade.closeTime = bar.t; openTrade.reason = reason;
                trades.push(openTrade);
                openTrade = null;

                if (balance > peakEquity) peakEquity = balance;
                else {
                    let dd = ((peakEquity - balance) / peakEquity) * 100;
                    if (dd > maxDrawdownPct) maxDrawdownPct = dd;
                }
                equityCurve.push({ time: bar.t, equity: balance });
            }
            continue;
        }

        if (dailyTradeCount >= maxTradesPerDay) continue;

        const signal = detectSignal(data, indicators, i, { rr });
        if (signal) {
            // 🟠 محاكاة Bid/Ask للدخول (BUY من الـ Ask، SELL من الـ Bid)
            let actualEntry = signal.side === 'BUY' ? (signal.entry + spread + slippage) : (signal.entry - slippage);
            
            // 🟠 حساب SL/TP بناءً على سعر التنفيذ الفعلي (Execution Price)
            let sl = signal.side === 'BUY' ? actualEntry - signal.slDist : actualEntry + signal.slDist;
            let tp = signal.side === 'BUY' ? actualEntry + signal.tpDist : actualEntry - signal.tpDist;

            const lots = calculatePosition(balance, riskPct, actualEntry, sl, { contractSize, minLot: 0.01, maxLot: 100, lotStep: 0.01 });
            openTrade = { id: trades.length + 1, openTime: bar.t, side: signal.side, actualEntry, sl, tp, lots, setup: signal.reason };
            dailyTradeCount++;
        }
    }

    const wins = trades.filter(t => t.pnl > 0);
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
    return { initialBalance, finalBalance: balance, netProfit: balance - initialBalance, totalTrades: trades.length, winRate: winRate.toFixed(1), maxDrawdownPct: maxDrawdownPct.toFixed(2), trades, equityCurve };
}
