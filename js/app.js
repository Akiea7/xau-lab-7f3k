import { loadHistoricalData, M5, agg } from './data.js';
import { buildInd } from './indicators.js';
import { runProfessionalBacktest } from './backtest.js';
import { runLabExperiments } from './lab.js';
import { drawCandles } from './chart.js';

// Global State
export let M15 = [], H1 = [], I5 = [], I15 = [], I1 = [];
const $ = (id) => document.getElementById(id);

export function buildAll() {
    try {
        if (M5 && M5.length > 0) {
            M15 = agg(M5, 3); 
            H1 = agg(M5, 12);
            I5 = buildInd(M5); 
            I15 = buildInd(M15); 
            I1 = buildInd(H1);
        }
    } catch(error) { console.error('[BUILD ERROR]', error); }
}

document.addEventListener('DOMContentLoaded', async () => {
    if ($('hSrc')) $('hSrc').innerHTML = '⏳ جاري تحميل البيانات...';
    try {
        const bars = await loadHistoricalData();
        if (bars && bars.length > 0) {
            buildAll();
            drawMain();
            if ($('hSrc')) {
                $('hSrc').innerHTML = '🟡 وضع البيانات التاريخية';
                $('hSrc').className = 'text-xs font-bold text-gold';
            }
        }
    } catch(error) {
        console.error('[DATA LOAD ERROR]', error);
        if ($('hSrc')) $('hSrc').innerHTML = '❌ فشل جلب البيانات';
    }
});

function drawMain() {
    try {
        if ($('chartMain') && M5 && M5.length > 0) {
            drawCandles($('chartMain'), M5, I5, 130, 0, [], null, null);
        }
    } catch(error) { console.error('[CHART DRAW ERROR]', error); }
}

// --- ربط أزرار الواجهة الأمامية بالمحركات (UI Wiring) ---
document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const text = btn.textContent.trim().toUpperCase();

    // 1. زر الباكتيست
    if (text.includes('RUN BACKTEST')) {
        const originalText = btn.innerHTML;
        btn.innerText = 'جاري الحساب... ⏳';
        setTimeout(() => {
            try {
                // تشغيل المحرك الاحترافي الجديد
                const res = runProfessionalBacktest(M5, I5, { balance: 10000, riskPct: 1.0, rr: 2.0 });
                renderBacktestResults(btn, res);
            } catch(error) { console.error('[BACKTEST ERROR]', error); }
            btn.innerHTML = originalText;
        }, 100);
    }

    // 2. زر المختبر
    if (text.includes('RUN EXPERIMENT')) {
        const originalText = btn.innerHTML;
        btn.innerText = 'جاري إجراء التجارب... 🧪';
        setTimeout(() => {
            try {
                // تشغيل المختبر الجديد
                const results = runLabExperiments(M5, I5);
                renderLabResults(btn, results);
            } catch(error) { console.error('[LAB ERROR]', error); }
            btn.innerHTML = originalText;
        }, 100);
    }
});

// دوال حقن النتائج في الـ HTML (آمنة ولا تعتمد على تصميم مسبق)
function renderBacktestResults(btn, res) {
    let resBox = $('btDynamicResults');
    if (!resBox) {
        resBox = document.createElement('div');
        resBox.id = 'btDynamicResults';
        resBox.className = 'mt-4 bg-card border border-panel rounded p-4';
        btn.parentNode.appendChild(resBox);
    }
    resBox.innerHTML = `
        <h3 class="text-gold text-sm font-bold mb-3 border-b border-panel pb-2">نتائج الاختبار (المحرك الاحترافي)</h3>
        <div class="grid grid-cols-2 gap-4 text-center text-sm">
            <div><span class="text-muted text-xs block">صافي الربح</span><span class="font-bold ${res.netProfit>=0?'text-buy':'text-sell'}">${res.netProfit>=0?'+':''}$${res.netProfit.toFixed(2)}</span></div>
            <div><span class="text-muted text-xs block">نسبة النجاح</span><span class="font-bold text-gold">${res.winRate}%</span></div>
            <div><span class="text-muted text-xs block">عدد الصفقات</span><span class="font-bold">${res.totalTrades}</span></div>
            <div><span class="text-muted text-xs block">أقصى تراجع (DD)</span><span class="font-bold text-sell">-${res.maxDrawdownPct}%</span></div>
        </div>
    `;
}

function renderLabResults(btn, res) {
    let labBox = $('labDynamicResults');
    if (!labBox) {
        labBox = document.createElement('div');
        labBox.id = 'labDynamicResults';
        labBox.className = 'mt-4 grid grid-cols-3 gap-2 text-center text-xs';
        btn.parentNode.appendChild(labBox);
    }
    
    // تحديد الاستراتيجية الأفضل (التي حققت أعلى ربح) لتلوينها
    const bestKey = Object.keys(res).reduce((a, b) => res[a].netProfit > res[b].netProfit ? a : b);

    const makeCard = (title, r, isBest) => `
      <div class="bg-panel border ${isBest?'border-[#9333ea]':'border-panel'} rounded p-2">
        <div class="${isBest?'text-[#d8b4fe]':'text-muted'} font-bold mb-2">${title}</div>
        <div class="mb-1 text-muted">WinRate: ${r.winRate}%</div>
        <div class="font-bold text-sm ${r.netProfit>=0?'text-buy':'text-sell'}">${r.netProfit>=0?'+':''}$${r.netProfit.toFixed(0)}</div>
        <div class="text-gold text-[10px] mt-1">DD: -${r.maxDrawdownPct}%</div>
      </div>`;

    labBox.innerHTML = 
        makeCard('A (كلاسيك)', res.A, bestKey === 'A') + 
        makeCard('B (عنيف)', res.B, bestKey === 'B') + 
        makeCard('C (قناص)', res.C, bestKey === 'C');
}
