import { detectRegime } from './regime.js';

/**
 * 🔍 دالة مساعدة لاكتشاف نماذج البرايس أكشن (Price Action)
 */
function getPriceAction(bar, prevBar, atr) {
    const body = Math.abs(bar.c - bar.o);
    const wickUp = bar.h - Math.max(bar.c, bar.o);
    const wickDown = Math.min(bar.c, bar.o) - bar.l;
    const totalSize = bar.h - bar.l;

    // 1. الشموع الابتلاعية
    const isBullishEngulfing = bar.c > bar.o && prevBar.c < prevBar.o && bar.c > prevBar.o && bar.o < prevBar.c;
    const isBearishEngulfing = bar.c < bar.o && prevBar.c > prevBar.o && bar.c < prevBar.o && bar.o > prevBar.c;

    // 2. شموع الرفض السعري (Pinbar / Hammer)
    // الذيل يمثل ضعف حجم الجسم، والذيل المعاكس صغير جداً، وحجم الشمعة كافٍ (نصف ATR على الأقل)
    const isBullishPinbar = wickDown > (body * 2) && wickUp < body && totalSize > (atr * 0.5);
    const isBearishPinbar = wickUp > (body * 2) && wickDown < body && totalSize > (atr * 0.5);

    if (isBullishEngulfing) return 'BULL_ENGULFING';
    if (isBearishEngulfing) return 'BEAR_ENGULFING';
    if (isBullishPinbar) return 'BULL_PINBAR';
    if (isBearishPinbar) return 'BEAR_PINBAR';
    return 'NONE';
}

/**
 * 🧠 محرك الإشارات (XAU Precision Core Strategy)
 */
export function detectSignal(data, indicators, index, settings = { rr: 2.0 }) {
    if (index < 50) return null; // تجاهل منطقة التحمية

    const bar = data[index];
    const prevBar = data[index - 1];
    const ind = indicators[index];
    
    if (!ind || !ind.isWarm) return null;

    const regime = detectRegime(indicators, index);
    const { e21, e50, rsi, atr } = ind;
    
    // 1. فلتر البيئة: لا نتداول في التذبذب العرضي إطلاقاً
    if (regime.includes('RANGE') || regime === 'UNKNOWN') return null;

    // 2. رصد البرايس أكشن الحالي
    const pa = getPriceAction(bar, prevBar, atr);

    // ==========================================
    // 🟢 استراتيجية القناص الشرائية (Buy Setup)
    // ==========================================
    // الشرط: ترند صاعد + تصحيح يلامس منطقة EMA21 + الزخم هدأ (RSI < 50) + ظهر نموذج شرائي
    const isNearEma21Buy = Math.abs(bar.l - e21) < (atr * 0.5); // السعر صحح واقترب من المتوسط

    if (regime.includes('UP') && isNearEma21Buy && rsi <= 50 && (pa === 'BULL_ENGULFING' || pa === 'BULL_PINBAR')) {
        let slDist = (atr * 1.0); let tpDist = slDist * settings.rr; return { side: 'BUY', entry: bar.c, slDist, tpDist, reason: `Regime: ${regime} | PA: ${pa} | RSI: ${rsi.toFixed(0)}` 
        };
    }

    // ==========================================
    // 🔴 استراتيجية القناص البيعية (Sell Setup)
    // ==========================================
    // الشرط: ترند هابط + تصحيح صاعد يلامس EMA21 + الزخم ارتفع (RSI > 50) + ظهر نموذج بيعي
    const isNearEma21Sell = Math.abs(bar.h - e21) < (atr * 0.5);

    if (regime.includes('DOWN') && isNearEma21Sell && rsi >= 50 && (pa === 'BEAR_ENGULFING' || pa === 'BEAR_PINBAR')) {
        let slDist = (atr * 1.0); let tpDist = slDist * settings.rr; return { side: 'SELL', entry: bar.c, slDist, tpDist, reason: `Regime: ${regime} | PA: ${pa} | RSI: ${rsi.toFixed(0)}` 
        };
    }

    return null;
}
