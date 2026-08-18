import { runProfessionalBacktest } from './backtest.js';

/**
 * 🧪 مختبر التجارب (Experimentation Lab)
 * يشغل عدة نسخ من الباكتيست بإعدادات مخاطرة مختلفة للمقارنة
 */
export function runLabExperiments(data, indicators) {
    // التجربة A: كلاسيكي (RR 2.0, مخاطرة 1%)
    const resA = runProfessionalBacktest(data, indicators, { balance: 10000, riskPct: 1.0, rr: 2.0, maxTradesPerDay: 4, spread: 0.30, slippage: 0.10, commissionPerLot: 7.00, contractSize: 100 });

    // التجربة B: سريع وعنيف (RR 1.5, مخاطرة 2.0%) - يفضل في التذبذب
    const resB = runProfessionalBacktest(data, indicators, { balance: 10000, riskPct: 2.0, rr: 1.5, maxTradesPerDay: 4, spread: 0.30, slippage: 0.10, commissionPerLot: 7.00, contractSize: 100 });

    // التجربة C: قناص (RR 3.0, مخاطرة 1%) - يفضل في الترند القوي
    const resC = runProfessionalBacktest(data, indicators, { balance: 10000, riskPct: 1.0, rr: 3.0, maxTradesPerDay: 4, spread: 0.30, slippage: 0.10, commissionPerLot: 7.00, contractSize: 100 });

    return { A: resA, B: resB, C: resC };
}
