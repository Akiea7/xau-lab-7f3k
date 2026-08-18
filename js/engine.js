import { detectRegime } from './regime.js';

/**
 * 🧠 محرك الإشارات (Signal Engine)
 * وظيفته الوحيدة: قراءة البيانات وإرجاع إشارة الدخول (بدون إدارة صفقات)
 */
export function detectSignal(data, indicators, index, settings = { rr: 2.0 }) {
    if (index < 50) return null; // تجاهل فترة التحمية

    const bar = data[index];
    const ind = indicators[index];
    
    // إذا لم تكتمل المؤشرات أو السوق في فترة تحمية، تجاهل
    if (!ind || !ind.isWarm) return null;

    const regime = detectRegime(indicators, index);

    // --- شروط الاستراتيجية ---
    // لا نتداول في أوقات التذبذب أو الأسواق الميتة أو العنيفة جداً
    if (regime.includes('RANGE')) return null;

    const { e21, e50, rsi, atr } = ind;
    const prevBar = data[index - 1];

    // استراتيجية الشراء: ترند صاعد + تصحيح للأسفل (RSI < 45) + شمعة ابتلاعية خضراء
    const isBullishEngulfing = bar.c > bar.o && prevBar.c < prevBar.o && bar.c > prevBar.o && bar.o < prevBar.c;
    if (regime.includes('UP') && rsi < 45 && isBullishEngulfing && bar.c > e21) {
        let sl = bar.l - (atr * 0.5); // الوقف تحت ذيل الشمعة بنصف ATR
        let tp = bar.c + (Math.abs(bar.c - sl) * settings.rr);
        return { side: 'BUY', entry: bar.c, sl, tp, reason: `Regime: ${regime}, Bullish Engulfing` };
    }

    // استراتيجية البيع: ترند هابط + تصحيح للأعلى (RSI > 55) + شمعة ابتلاعية حمراء
    const isBearishEngulfing = bar.c < bar.o && prevBar.c > prevBar.o && bar.c < prevBar.o && bar.o > prevBar.c;
    if (regime.includes('DOWN') && rsi > 55 && isBearishEngulfing && bar.c < e21) {
        let sl = bar.h + (atr * 0.5); // الوقف فوق ذيل الشمعة بنصف ATR
        let tp = bar.c - (Math.abs(sl - bar.c) * settings.rr);
        return { side: 'SELL', entry: bar.c, sl, tp, reason: `Regime: ${regime}, Bearish Engulfing` };
    }

    return null;
}
