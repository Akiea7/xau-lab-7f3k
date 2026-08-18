// دوال رياضية مساعدة
function calcEMA(data, period) {
  let k = 2 / (period + 1);
  let ema = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

export function buildInd(bars) {
  if (!bars || bars.length === 0) return [];
  
  let closes = bars.map(b => b.c);
  let highs = bars.map(b => b.h);
  let lows = bars.map(b => b.l);
  
  // 1. حساب EMA 21 و EMA 50
  let e21 = calcEMA(closes, 21);
  let e50 = calcEMA(closes, 50);
  
  // 2. حساب RSI 14
  let rsi = new Array(bars.length).fill(null);
  let gains = 0, losses = 0;
  for (let i = 1; i <= 14 && i < bars.length; i++) {
    let diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / 14;
  let avgLoss = losses / 14;
  
  for (let i = 14; i < bars.length; i++) {
    if (i > 14) {
      let diff = closes[i] - closes[i - 1];
      avgGain = (avgGain * 13 + (diff >= 0 ? diff : 0)) / 14;
      avgLoss = (avgLoss * 13 + (diff < 0 ? -diff : 0)) / 14;
    }
    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
  }

  // 3. حساب ATR 14
  let tr = [highs[0] - lows[0]];
  for (let i = 1; i < bars.length; i++) {
    let hl = highs[i] - lows[i];
    let hc = Math.abs(highs[i] - closes[i - 1]);
    let lc = Math.abs(lows[i] - closes[i - 1]);
    tr.push(Math.max(hl, hc, lc));
  }
  let atr = calcEMA(tr, 14); // Smoothed ATR
  let atrMa = calcEMA(atr, 14); // ATR Moving Average للتحقق من الفوليوم

  // تجميع النتائج في مصفوفة تتطابق مع الشموع
  let result = [];
  for (let i = 0; i < bars.length; i++) {
    result.push({
      e21: e21[i],
      e50: e50[i],
      rsi: rsi[i],
      atr: atr[i],
      atrMa: atrMa[i]
    });
  }
  return result;
}

export function buildPivots(bars, left = 2, right = 2) {
  let pivots = [];
  for (let i = left; i < bars.length - right; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - left; j <= i + right; j++) {
      if (i === j) continue;
      if (bars[j].h >= bars[i].h) isHigh = false;
      if (bars[j].l <= bars[i].l) isLow = false;
    }
    // منع Look-ahead bias: تأخير تسجيل الـ Pivot لحين اكتمال شمعات اليمين
    if (isHigh) pivots.push({ idx: i, val: bars[i].h, type: 'H', confirmIdx: i + right });
    if (isLow)  pivots.push({ idx: i, val: bars[i].l, type: 'L', confirmIdx: i + right });
  }
  return pivots;
}
