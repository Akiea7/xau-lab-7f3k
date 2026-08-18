import { detectSignal } from './engine.js';
import { calculatePosition, calculatePnL } from './risk.js';

/**
 * 📊 محرك الاختبار الاحترافي (Professional Backtester)
 */
export function runProfessionalBacktest(data, indicators, options) {
    let { balance = 10000, riskPct = 1.0, rr = 2.0 } = options;
    
    let initialBalance = balance;
    let peakEquity = balance;
    let maxDrawdownPct = 0;
    
    let trades = [];
    let openTrade = null;

    for (let i = 50; i < data.length; i++) {
        const bar = data[i];

        // 1. إدارة الصفقة المفتوحة
        if (openTrade) {
            let exitPrice = null;
            let reason = '';

            // فحص ضرب الهدف أو الوقف باستخدام الـ High و Low للشمعة
            if (openTrade.side === 'BUY') {
                if (bar.l <= openTrade.sl) { exitPrice = openTrade.sl; reason = 'Hit SL'; }
                else if (bar.h >= openTrade.tp) { exitPrice = openTrade.tp; reason = 'Hit TP'; }
            } else {
                if (bar.h >= openTrade.sl) { exitPrice = openTrade.sl; reason = 'Hit SL'; }
                else if (bar.l <= openTrade.tp) { exitPrice = openTrade.tp; reason = 'Hit TP'; }
            }

            // الإغلاق الإجباري في نهاية البيانات
            if (!exitPrice && i === data.length - 1) {
                exitPrice = bar.c;
                reason = 'End of Data';
            }

            if (exitPrice) {
                const pnl = calculatePnL(openTrade.entry, exitPrice, openTrade.side, openTrade.lots);
                balance += pnl;
                
                openTrade.exit = exitPrice;
                openTrade.pnl = pnl;
                openTrade.closeTime = bar.t;
                openTrade.reason = reason;
                trades.push(openTrade);
                
                openTrade = null;

                // تحديث التراجع الأقصى (Max Drawdown)
                if (balance > peakEquity) {
                    peakEquity = balance;
                } else {
                    let dd = ((peakEquity - balance) / peakEquity) * 100;
                    if (dd > maxDrawdownPct) maxDrawdownPct = dd;
                }
            }
            continue; // نمنع فتح صفقة جديدة وهناك صفقة مفتوحة (يحل مشكلة تكرار الإشارة)
        }

        // 2. البحث عن إشارة جديدة (فقط إذا لم تكن هناك صفقة مفتوحة)
        const signal = detectSignal(data, indicators, i, { rr });
        if (signal) {
            const lots = calculatePosition(balance, riskPct, signal.entry, signal.sl);
            openTrade = {
                id: trades.length + 1,
                openTime: bar.t,
                side: signal.side,
                entry: signal.entry,
                sl: signal.sl,
                tp: signal.tp,
                lots: lots,
                riskAmount: balance * (riskPct / 100),
                setup: signal.reason
            };
        }
    }

    // 3. تجميع الإحصائيات (Metrics)
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl <= 0);
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
    const netProfit = balance - initialBalance;
    const netPct = (netProfit / initialBalance) * 100;

    return {
        initialBalance,
        finalBalance: balance,
        netProfit,
        netPct,
        totalTrades: trades.length,
        wins: wins.length,
        losses: losses.length,
        winRate: winRate.toFixed(1),
        maxDrawdownPct: maxDrawdownPct.toFixed(2),
        trades
    };
}
