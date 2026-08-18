import { clamp } from './utils.js';

export const REG_INFO = {
  STRONG_UP: { l: 'اتجاه صاعد قوي', e: '💪', cls: 'text-emerald-400' },
  UP: { l: 'اتجاه صاعد', e: '⬆', cls: 'text-up' },
  DOWN: { l: 'اتجاه هابط', e: '⬇', cls: 'text-down' },
  STRONG_DOWN: { l: 'اتجاه هابط قوي', e: '🔻', cls: 'text-rose-400' },
  HIGH_VOL: { l: 'حركة قوية جداً', e: '⚡', cls: 'text-amber-400' },
  QUIET: { l: 'سوق هادئ', e: '😴', cls: 'text-slate-400' },
  RANGE: { l: 'تذبذب جانبي', e: '↔', cls: 'text-sky-300' }
};

export function classifyRegime(h, m, i, I1, I5, H1) {
  const A1 = I1.atr[h]; if (!A1) return 'RANGE';
  const slope = (I1.e50[h] - I1.e50[Math.max(0, h - 12)]) / A1, gap = Math.abs(I1.e21[h] - I1.e50[h]) / A1;
  const up = I1.e21[h] > I1.e50[h] && H1[h].c > I1.e50[h], dn = I1.e21[h] < I1.e50[h] && H1[h].c < I1.e50[h];
  const vol = I5.atr[i] / (I5.atrMa[i] || 1);
  
  if (vol > 1.7) return 'HIGH_VOL'; if (vol < 0.65) return 'QUIET';
  if (up && gap > 0.9 && slope > 0.12) return 'STRONG_UP'; if (dn && gap > 0.9 && slope < -0.12) return 'STRONG_DOWN';
  if (up) return 'UP'; if (dn) return 'DOWN'; return 'RANGE';
}

export function guardNew() { return { d: -1, pnl: 0, trades: 0, paused: null, wk: -1, wkPnl: 0, wkPaused: null } }

export function guardSync(g, dk) {
  const wk = Math.floor(dk / 7);
  if (g.wk !== wk) { g.wk = wk; g.wkPnl = 0; g.wkPaused = null }
  if (g.d !== dk) { g.d = dk; g.pnl = 0; g.trades = 0; g.paused = null }
}

export function guardBlocked(g, cfg) {
  if (!cfg.disc) return null;
  if (g.wkPaused) return g.wkPaused; if (g.paused) return g.paused;
  if (g.pnl >= cfg.dailyTarget) return '🎯 Daily Target Reached';
  if (g.trades >= cfg.maxDayTrades) return 'بلغت حد الصفقات اليومي'; return null;
}

export function tryResolve(o, bar, i, cfg, I15, m15Of) {
  let px = 0, reason = ''; const dir = o.side === 'BUY' ? 1 : -1;
  if (o.side === 'BUY') {
    if (bar.l <= o.sl) { px = o.sl - cfg.slip; reason = 'SL' } else if (bar.h >= o.tp) { px = o.tp - cfg.slip; reason = 'TP' }
  } else {
    if (bar.h >= o.sl) { px = o.sl + cfg.slip; reason = 'SL' } else if (bar.l <= o.tp) { px = o.tp + cfg.slip; reason = 'TP' }
  }
  if (!reason && cfg.timeExit > 0 && i - o.i >= cfg.timeExit) { px = bar.c; reason = 'TIME' }
  if (!reason) {
    const m = m15Of(i);
    if (o.side === 'BUY' && I15.e21[m] < I15.e50[m]) { px = bar.c; reason = 'INVALIDATION' }
    if (o.side === 'SELL' && I15.e21[m] > I15.e50[m]) { px = bar.c; reason = 'INVALIDATION' }
  }
  if (!reason) return null;
  const pnl = (px - o.entry) * dir * 100 * o.lots; return { px, reason, pnl };
}

export function partialCheck(o, bar, cfg) {
  if (!cfg.partialTP || o.part) return;
  const dir = o.side === 'BUY' ? 1 : -1, r1 = o.entry + dir * o.baseDist;
  const hit = o.side === 'BUY' ? bar.h >= r1 : bar.l <= r1; if (!hit) return;
  if (o.lots >= 0.02) {
    const half = Math.round(o.lots * 50) / 100;
    o.acc += (r1 - o.entry) * dir * 100 * half; o.lots = Math.max(0.01, Math.round((o.lots - half) * 100) / 100);
  }
  o.sl = o.entry; o.part = true;
}
