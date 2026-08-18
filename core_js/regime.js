/**
 * 🧭 نظام تحديد حالة السوق (Market Regime)
 * يحلل المؤشرات الحالية لتحديد بيئة التداول (ترند قوي، تذبذب، سيولة عالية، إلخ)
 */
export function detectRegime(indicators, currentIndex) {
    if (!indicators || currentIndex < 0 || currentIndex >= indicators.length) return 'UNKNOWN';

    const ind = indicators[currentIndex];
    
    // منع التحليل إذا كنا في فترة التحمية (أول 50 شمعة)
    if (!ind || !ind.isWarm) return 'WARMUP';

    const { e21, e50, rsi, atr, atrMa } = ind;

    // 1. تحليل تقارب/تباعد المتوسطات لمعرفة هل السوق عرضي (Range)
    // إذا كانت المسافة بين المتوسطات أقل من نصف حجم الشمعة المعتاد (ATR)، فالسوق متداخل
    const emaDistance = Math.abs(e21 - e50);
    const isRange = emaDistance < (atr * 0.5);

    // 2. تحليل الاتجاه الأساسي (Trend)
    const isBullish = e21 > e50;
    const isBearish = e21 < e50;
    
    // 3. تحديد قوة الترند باستخدام زخم الـ RSI
    const isStrongBull = isBullish && rsi >= 60;
    const isStrongBear = isBearish && rsi <= 40;

    // 4. تحليل السيولة والنشاط (Volatility)
    const isHighVol = atr > (atrMa * 1.5);
    const isQuiet = atr < (atrMa * 0.7);

    // --- التقييم النهائي (حسب الأولوية) ---
    
    if (isRange) {
        if (isQuiet) return 'QUIET_RANGE'; // سوق ميت لا يصلح للتداول
        if (isHighVol) return 'HIGH_VOL_RANGE'; // تذبذب عنيف وعشوائي
        return 'RANGE'; // تذبذب طبيعي
    }

    // حالات الترند
    if (isStrongBull) return 'STRONG_UP';
    if (isStrongBear) return 'STRONG_DOWN';
    
    if (isBullish) return 'UP';
    if (isBearish) return 'DOWN';

    return 'UNKNOWN';
}
