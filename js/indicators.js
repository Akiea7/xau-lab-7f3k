/**
 * 📊 نظام بناء المؤشرات (Indicators Normalizer)
 * يحسب المؤشرات بشكل تراكمي ويطابق كل شمعة مع مؤشراتها في نفس الـ Index.
 */
export function buildInd(data) {
    if (!data || data.length === 0) return [];

    let results = new Array(data.length).fill(null);
    const WARMUP_PERIOD = 50; // فترة التحمية الإجبارية

    // متغيرات حفظ الحالة (State Variables)
    let ema21 = null, ema50 = null;
    let gains = 0, losses = 0, avgGain = null, avgLoss = null;
    let trs = [], atr = null, atrHistory = [], atrMa = null;

    // ثوابت الـ EMA
    const k21 = 2 / (21 + 1);
    const k50 = 2 / (50 + 1);

    for (let i = 0; i < data.length; i++) {
        const curr = data[i];
        const prev = i > 0 ? data[i - 1] : null;

        // --- 1. حساب EMA 21 ---
        if (i === 20) {
            let sum = 0; for(let j=0; j<=20; j++) sum += data[j].c;
            ema21 = sum / 21; // SMA كبداية
        } else if (i > 20) {
            ema21 = (curr.c - ema21) * k21 + ema21;
        }

        // --- 2. حساب EMA 50 ---
        if (i === 49) {
            let sum = 0; for(let j=0; j<=49; j++) sum += data[j].c;
            ema50 = sum / 50;
        } else if (i > 49) {
            ema50 = (curr.c - ema50) * k50 + ema50;
        }

        // --- 3. حساب RSI 14 ---
        let rsi = null;
        if (i > 0) {
            let change = curr.c - prev.c;
            let currentGain = change > 0 ? change : 0;
            let currentLoss = change < 0 ? Math.abs(change) : 0;

            if (i < 14) {
                gains += currentGain;
                losses += currentLoss;
            } else if (i === 14) {
                avgGain = gains / 14;
                avgLoss = losses / 14;
                let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
                rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
            } else {
                avgGain = ((avgGain * 13) + currentGain) / 14;
                avgLoss = ((avgLoss * 13) + currentLoss) / 14;
                let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
                rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
            }
        }

        // --- 4. حساب ATR 14 ---
        let currentTR = null;
        if (i > 0) {
            let hl = curr.h - curr.l;
            let hc = Math.abs(curr.h - prev.c);
            let lc = Math.abs(curr.l - prev.c);
            currentTR = Math.max(hl, hc, lc);
            trs.push(currentTR);
            
            if (trs.length > 14) trs.shift();

            if (trs.length === 14) {
                if (atr === null) {
                    atr = trs.reduce((a, b) => a + b, 0) / 14;
                } else {
                    atr = ((atr * 13) + currentTR) / 14; // Smoothed ATR
                }
            }
        }

        // --- 5. حساب ATR MA 14 (متوسط الـ ATR لمعرفة السيولة) ---
        if (atr !== null) {
            atrHistory.push(atr);
            if (atrHistory.length > 14) atrHistory.shift();
            if (atrHistory.length === 14) {
                atrMa = atrHistory.reduce((a, b) => a + b, 0) / 14;
            }
        }

        // --- 6. التجميع وفرض فترة التحمية (Warmup) ---
        const isWarm = i >= WARMUP_PERIOD;

        results[i] = {
            e21: isWarm ? ema21 : null,
            e50: isWarm ? ema50 : null,
            rsi: isWarm ? rsi : null,
            atr: isWarm ? atr : null,
            atrMa: isWarm ? atrMa : null,
            isWarm: isWarm
        };
    }
    return results;
}

/**
 * دالة مؤقتة لتوليد نقاط البيفوت (تم تفريغها لتجنب الأخطاء لحين إعادة بنائها لاحقاً إن احتجناها)
 */
export function buildPivots(data) {
    return new Array(data.length).fill(null);
}
