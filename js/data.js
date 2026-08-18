export let M5 = [];

export async function loadHistoricalData() {
  return new Promise(async (resolve) => {
    try {
      // 🚀 الخدعة الاحترافية: استخدام PAXGUSDT كممثل دقيق جداً لـ XAUUSD
      // هذا يعطينا 1000 شمعة حقيقية مجاناً وبدون مشاكل الاتصال
      const res = await fetch('https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=5m&limit=1000');
      const data = await res.json();
      
      M5 = data.map(d => ({
        t: d[0],                  // وقت الافتتاح
        o: parseFloat(d[1]),      // سعر الافتتاح
        h: parseFloat(d[2]),      // أعلى سعر
        l: parseFloat(d[3]),      // أدنى سعر
        c: parseFloat(d[4]),      // سعر الإغلاق
        v: parseFloat(d[5])       // الفوليوم
      }));
      
      console.log(`✅ تم جلب ${M5.length} شمعة تاريخية حقيقية بنجاح.`);
      resolve(M5);
    } catch (e) {
      console.error("❌ خطأ في جلب البيانات:", e);
      resolve([]);
    }
  });
}

// 🕒 دالة التجميع (Aggregation) الدقيقة المبنية على الوقت الفعلي
export function agg(bars, factor) {
  // factor: 3 = M15, 12 = H1 (لأن الأساس هو M5)
  let timeframeMs = factor * 5 * 60 * 1000;
  let res = [];
  let currentBar = null;
  
  for(let i = 0; i < bars.length; i++) {
    let b = bars[i];
    // تقريب الوقت لبداية التايم فريم (مثلاً: 10:00, 10:15, 10:30)
    let normalizedTime = Math.floor(b.t / timeframeMs) * timeframeMs;
    
    if(!currentBar || currentBar.t !== normalizedTime) {
      if(currentBar) res.push(currentBar);
      currentBar = { t: normalizedTime, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v };
    } else {
      currentBar.h = Math.max(currentBar.h, b.h);
      currentBar.l = Math.min(currentBar.l, b.l);
      currentBar.c = b.c;
      currentBar.v += b.v;
    }
  }
  if(currentBar) res.push(currentBar);
  return res;
}
