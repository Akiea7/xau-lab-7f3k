import { detectSignal } from './engine.js';
import { calculatePosition, calculatePnL } from './risk.js';

export function runProfessionalBacktest(data, indicators, options) {
    let { 
        balance = 10000, 
        riskPct = 1.0, 
        rr = 2.0, 
        maxTradesPerDay = 4, 
        spread = 0.30,      // 30 سنت سبريد للذهب
        slippage = 0.10,    // 10 سنت انزلاق سعري
        commissionPerLot = 7.00,
        contractSize = 100
    } = options;
    
    let initialBalance = balance;
    let peakEquity = balance;
    let maxDrawdownPct = 0;
    
    let trades = [];
    let openTrade = null;
    
    let dailyTradeCount = 0;
    let currentDay = null;

    for (let i = 50; i < data.length; i++) {
        const bar = data[i];

        // تتبع الأيام لتصفير عداد الصفقات اليومي
        const barDate = new Date(bar.t).toDateString();
        if (barDate !== currentDay) {
            currentDay = barDate;
            dailyTradeCount = 0;
        }

        // 1. إدارة الصفقة المفتوحة
        if (openTrade) {
            let exitPrice = null;
            let reason = '';

            // تطبيق السبريد والانزلاق على الإغلاق
            if (openTrade.side === 'BUY') {
                if (bar.l <= openTrade.sl) { exitPrice = openTrade.sl - slippage; reason = 'Hit SL'; }
                else if (bar.h >= openTrade.tp) { exitPrice = openTrade.tp; reason = 'Hit TP'; }
            } else {
                if (bar.h + spread >= openTrade.sl) { exitPrice = openTrade.sl + slippage; reason = 'Hit SL'; }
                else if (bar.l + spread <= openTrade.tp) { exitPrice = openTrade.tp; reason = 'Hit TP'; }
            }

            // الإغلاق الإجباري في نهاية البيانات
            if (!exitPrice && i === data.length - 1) {
                exitPrice = openTrade.side === 'BUY' ? bar.c : (bar.c + spread);
                reason = 'End of Data';
            }

            if (exitPrice) {
                const pnl = calculatePnL(openTrade.actualEntry, exitPrice, openTrade.side, openTrade.lots, { contractSize, commissionPerLot });
                balance += pnl;
                
                openTrade.exit = exitPrice;
                openTrade.pnl = pnl;
                openTrade.closeTime = bar.t;
                openTrade.reason = reason;
                trades.push(openTrade);
                
                openTrade = null;

                if (balance > peakEquity) {
                    peakEquity = balance;
                } else {
                    let dd = ((peakEquity - balance) / peakEquity) * 100;
                    if (dd > maxDrawdownPct) maxDrawdownPct = dd;
                }
            }
            continue;
        }

        // 2. البحث عن إشارة جديدة
        if (dailyTradeCount >= maxTradesPerDay) continue; // تطبيق الحد اليومي

        const signal = detectSignal(data, indicators, i, { rr });
        if (signal) {
            // تطبيق السبريد والانزلاق على الدخول
            let actualEntry = signal.side === 'BUY' ? (signal.entry + spread + slippage) : (signal.entry - slippage);

            const lots = calculatePosition(balance, riskPct, actualEntry, signal.sl, { contractSize, minLot: 0.01, maxLot: 100, lotStep: 0.01 });
            
            openTrade = {
                id: trades.length + 1,
                openTime: bar.t,
                side: signal.side,
                signalEntry: signal.entry,
                actualEntry: actualEntry,
                sl: signal.sl,
                tp: signal.tp,
                lots: lots,
                setup: signal.reason
            };
            
            dailyTradeCount++;
        }
    }

    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl <= 0);
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

    return {
        initialBalance,
        finalBalance: balance,
        netProfit: balance - initialBalance,
        totalTrades: trades.length,
        wins: wins.length,
        losses: losses.length,
        winRate: winRate.toFixed(1),
        maxDrawdownPct: maxDrawdownPct.toFixed(2),
        trades
    };
}
