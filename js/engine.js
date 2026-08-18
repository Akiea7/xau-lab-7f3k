import { M15, H1, I5, I15, I1, PV15 } from './app.js';
import { M5 } from './data.js';

let lastSignal = null; // لمنع تكرار نفس الإشارة

export function evaluate(i, P) {
  // نحتاج على الأقل 50 شمعة سابقة للمتوسطات
  if (i < 50 || !I5 || !I5[i]) return null;

  let b5 = M5[i];
  let i5 = I5[i];
  
  // 1. مزامنة التايم فريمات (نجيب بيانات H1 و M15 اللي تطابق وقت شمعة M5 الحالية)
  let idx1 = H1.findIndex(b => b.t > b5.t) - 1; 
  if(idx1 < 0) idx1 = H1.length - 1;
  let i1 = I1 && I1[idx1] ? I1[idx1] : null;

  // 2. تحليل حالة السوق (Regime Detection)
  let regime = detectRegime(i5, i1);

  // 3. بناء الشروط وحساب النقاط (Score)
  let score = 0;
  let side = null;

  let isUpTrend = i5.e21 > i5.e50 && b5.c > i5.e21;
  let isDownTrend = i5.e21 < i5.e50 && b5.c < i5.e21;

  if (isUpTrend) {
    side = 'BUY';
    score += 40; // نقطة للترند
    if (regime.includes('UP')) score += 20; // توافق مع الترند الكبير
    if (i5.rsi > 40 && i5.rsi < 65) score += 25; // تراجع صحي للـ RSI
  } else if (isDownTrend) {
    side = 'SELL';
    score += 40; // نقطة للترند
    if (regime.includes('DOWN')) score += 20; // توافق مع الترند الكبير
    if (i5.rsi < 60 && i5.rsi > 35) score += 25; // تراجع صحي للـ RSI
  }

  // إذا السكور قليل أو ماكو إشارة، نلغي
  if (!side || score < 75) return null;

  // 4. منع الإشارات المكررة (ننتظر على الأقل 10 شمعات أو نعكس الاتجاه)
  if (lastSignal && lastSignal.side === side && (b5.t - lastSignal.time) < 10 * 5 * 60 * 1000) {
    return lastSignal; // نرجع الإشارة القديمة للواجهة بس ما نفتح صفقة جديدة
  }

  // 5. حساب المخاطرة (SL و TP مبنية على ATR الديناميكي)
  let atr = i5.atr || 2.5; 
  let entry = b5.c;
  
  // الستوب 1.5 ضعف الـ ATR، الهدف ضعف الستوب (RR = 1:2)
  let slDist = atr * 1.5;
  let rr = P.rr || 2.0; let tpDist = slDist * rr; 

  let sl = side === 'BUY' ? entry - slDist : entry + slDist;
  let tp = side === 'BUY' ? entry + tpDist : entry - tpDist;

  let signal = {
    type: 'signal',
    side: side,
    score: score,
    entry: entry.toFixed(2),
    sl: sl.toFixed(2),
    tp: tp.toFixed(2),
    regime: regime,
    time: b5.t
  };

  lastSignal = signal;
  return signal;
}

// دالة تحديد حالة السوق
function detectRegime(i5, i1) {
  if (!i1) return 'RANGE';
  if (i1.e21 > i1.e50 && i5.e21 > i5.e50) return 'STRONG UP';
  if (i1.e21 < i1.e50 && i5.e21 < i5.e50) return 'STRONG DOWN';
  if (i5.e21 > i5.e50) return 'UP';
  if (i5.e21 < i5.e50) return 'DOWN';
  return 'RANGE';
}

// 🛡️ المرحلة 4 و 5: مدير المخاطر ومحرك الباكتيست الفعلي
export function runBacktest(bars, P) {
  let balance = P.balance || 10000;
  let peak = balance;
  let maxDD = 0;
  let trades = [];
  let openTrade = null;

  // إيقاف منع التكرار مؤقتاً لتشغيل الاختبار
  let tempLast = lastSignal;
  lastSignal = null;

  for (let i = 50; i < bars.length; i++) {
    let bar = bars[i];

    // إذا عندنا صفقة مفتوحة، نراقب الـ SL والـ TP
    if (openTrade) {
      let isHitTP = false;
      let isHitSL = false;
      
      if (openTrade.side === 'BUY') {
        if (bar.l <= openTrade.sl) isHitSL = true;
        else if (bar.h >= openTrade.tp) isHitTP = true;
      } else {
        if (bar.h >= openTrade.sl) isHitSL = true;
        else if (bar.l <= openTrade.tp) isHitTP = true;
      }

      if (isHitTP || isHitSL) {
        // إدارة المخاطر: المخاطرة الثابتة (مثلاً 1% من الرصيد الحالي)
        let riskAmount = balance * (P.riskPct / 100); 
        // الربح يعتمد على نسبة الـ RR (حسبناها 1:2 سابقاً)
        let pnl = isHitTP ? (riskAmount * (P.rr || 2.0)) : -riskAmount;
        
        balance += pnl;
        if (balance > peak) peak = balance;
        let currentDD = ((peak - balance) / peak) * 100;
        if (currentDD > maxDD) maxDD = currentDD;

        trades.push({
          time: new Date(bar.t).toLocaleTimeString('en-US', {hour12: false, hour: "numeric", minute: "numeric"}),
          side: openTrade.side,
          pnl: pnl,
          won: isHitTP
        });
        openTrade = null; // إغلاق الصفقة
      }
    }

    // إذا ماكو صفقة مفتوحة، نبحث عن إشارة
    if (!openTrade) {
      let sig = evaluate(i, P);
      if (sig && sig.type === 'signal') {
        openTrade = {
          side: sig.side,
          entry: parseFloat(sig.entry),
          sl: parseFloat(sig.sl),
          tp: parseFloat(sig.tp)
        };
      }
    }
  }

  lastSignal = tempLast; // إرجاع الحالة المباشرة

  let wins = trades.filter(t => t.won).length;
  let winRate = trades.length > 0 ? ((wins / trades.length) * 100).toFixed(1) : 0.0;
  let net = balance - (P.balance || 10000);

  return { trades, balance, net, winRate, maxDD: maxDD.toFixed(1) };
}
