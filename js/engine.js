import { detectRegime } from './regime.js';

export function detectSignal(data, indicators, index, settings = { rr: 2.0 }) {
    if (index < 50) return null; // تجاهل التحمية

    const bar = data[index];
    const ind = indicators[index];
    if (!ind || !ind.isWarm) return null;

    const regime = detectRegime(indicators, index);
    const { e21, e50, rsi, atr } = ind;
    
    // منع التداول في التذبذب
    if (regime.includes('RANGE')) return null;

    // استراتيجية شراء مبسطة: ترند صاعد + السعر فوق EMA21 + RSI مريح (أقل من 55)
    if (regime.includes('UP') && bar.c > e21 && rsi < 55) {
        let sl = bar.l - (atr * 1.0); // الوقف أسفل الشمعة بـ 1 ATR
        let tp = bar.c + (Math.abs(bar.c - sl) * settings.rr);
        return { side: 'BUY', entry: bar.c, sl, tp, reason: `Regime: ${regime}, Trend Pullback` };
    }

    // استراتيجية بيع مبسطة: ترند هابط + السعر جوة EMA21 + RSI مريح (أكبر من 45)
    if (regime.includes('DOWN') && bar.c < e21 && rsi > 45) {
        let sl = bar.h + (atr * 1.0); // الوقف أعلى الشمعة بـ 1 ATR
        let tp = bar.c - (Math.abs(sl - bar.c) * settings.rr);
        return { side: 'SELL', entry: bar.c, sl, tp, reason: `Regime: ${regime}, Trend Pullback` };
    }

    return null;
}
