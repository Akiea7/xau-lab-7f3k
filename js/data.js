/**
 * 📊 نظام جلب البيانات (Data Provider)
 * تم التخلص من PAXG - النظام الآن يجلب XAU/USD حقيقي
 */
export let M5 = [];

export async function loadHistoricalData() {
    try {
        // نستخدم Yahoo Finance لجلب بيانات XAUUSD=X الحقيقية
        // ونمررها عبر AllOrigins (Proxy) لتجاوز حظر الـ CORS في المتصفحات (GitHub Pages)
        const targetUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/XAUUSD=X?interval=5m&range=5d';
        const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(targetUrl);
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('فشل الاتصال بمزود بيانات الذهب');
        
        const proxyData = await response.json();
        
        // البيانات تأتي كنص داخل contents بسبب البروكسي
        const data = JSON.parse(proxyData.contents);

        if (!data || !data.chart || !data.chart.result) {
            throw new Error('تنسيق البيانات غير صالح');
        }

        const result = data.chart.result[0];
        const timestamps = result.timestamp;
        const quote = result.indicators.quote[0];

        M5 = [];
        for (let i = 0; i < timestamps.length; i++) {
            // تخطي الفترات اللي السوق بيها مغلق (Null data)
            if (quote.close[i] === null) continue;
            
            M5.push({
                t: timestamps[i] * 1000, // تحويل الثواني إلى ملي ثانية لتطابق جافاسكربت
                o: quote.open[i],
                h: quote.high[i],
                l: quote.low[i],
                c: quote.close[i],
                v: quote.volume[i] || 0
            });
        }
        
        console.log(`✅ تم تحميل ${M5.length} شمعة M5 حقيقية لـ XAU/USD`);
        return M5;
        
    } catch (error) {
        console.error('[DATA FETCH ERROR]', error.message);
        return [];
    }
}

/**
 * 🔄 دالة تجميع الشموع (Timeframe Aggregator)
 * تحول شموع الـ 5 دقائق إلى 15 دقيقة وساعة بدقة
 */
export function agg(bars, factor) {
    let out = [];
    for (let i = 0; i < bars.length; i += factor) {
        let chunk = bars.slice(i, i + factor);
        if (chunk.length === factor) {
            out.push({
                t: chunk[0].t,
                o: chunk[0].o,
                h: Math.max(...chunk.map(b => b.h)),
                l: Math.min(...chunk.map(b => b.l)),
                c: chunk[chunk.length - 1].c,
                v: chunk.reduce((sum, b) => sum + b.v, 0)
            });
        }
    }
    return out;
}
