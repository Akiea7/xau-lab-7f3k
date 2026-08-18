export const $ = id => document.getElementById(id);
export const fmt = (n, d = 2) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const MO = ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'];
export const fmtT = t => {
  const d = new Date(t);
  return `${d.getUTCDate()} ${MO[d.getUTCMonth()]} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

export const sessionOf = h => h < 7 ? 'آسيا' : h < 13 ? 'لندن' : h < 21 ? 'نيويورك' : 'انتقالية';

export function toast(m, t = 'i') {
  const c = t === 'b' ? 'border-up/40 text-emerald-400' : 
            t === 's' ? 'border-down/40 text-rose-400' : 'border-gold-500/40 text-gold-300';
  const e = document.createElement('div');
  e.className = `toast card border ${c} px-4 py-3 text-[12px] font-bold bg-ink-800/95`;
  e.innerHTML = m;
  document.getElementById('toasts').appendChild(e);
  setTimeout(() => { 
    e.style.opacity = 0; 
    e.style.transition = '.4s'; 
    setTimeout(() => e.remove(), 400);
  }, 5200);
}

export const LS = {
  get: (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d } catch (e) { return d } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} }
};
