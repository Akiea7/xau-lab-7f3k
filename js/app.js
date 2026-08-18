import { loadHistoricalData, M5, agg } from './data.js';
import { buildInd } from './indicators.js';
import { runProfessionalBacktest } from './backtest.js';
import { runLabExperiments } from './lab.js';
import { initReplaySystem, nextReplayCandle, executeReplayTrade } from './replay.js';
import { initLiveConnection } from './live.js';
import { detectSignal } from './engine.js';
import { drawCandles } from './chart.js';

export let M15 = [], H1 = [], I5 = [], I15 = [], I1 = [];
const $ = (id) => document.getElementById(id);

export function buildAll() {
    try {
        if (M5 && M5.length > 0) {
            M15 = agg(M5, 3); H1 = agg(M5, 12);
            I5 = buildInd(M5); I15 = buildInd(M15); I1 = buildInd(H1);
        }
    } catch(err) { console.error('[BUILD ERROR]', err); }
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
    } catch(err) { console.error('[DATA LOAD ERROR]', err); }

    setTimeout(startLiveStream, 2000);
});

function drawMain() {
    if ($('chartMain') && M5 && M5.length > 0) {
        drawCandles($('chartMain'), M5, I5, 130, 0, [], null, null);
    }
}

document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const text = btn.textContent.trim().toUpperCase();

    // تشغيل الباكتيست
    if (text.includes('RUN BACKTEST')) {
        const original = btn.innerHTML;
        btn.innerText = 'جاري الحساب... ⏳';
        setTimeout(() => {
            const res = runProfessionalBacktest(M5, I5, { balance: 10000, riskPct: 1.0, rr: 2.0, maxTradesPerDay: 4, spread: 0.30, slippage: 0.10, commissionPerLot: 7.00, contractSize: 100 });
            renderBacktestResults(res);
            btn.innerHTML = original;
        }, 100);
    }

    // تشغيل المختبر
    if (text.includes('RUN EXPERIMENT')) {
        const original = btn.innerHTML;
        btn.innerText = 'جاري التجارب... 🧪';
        setTimeout(() => {
            const res = runLabExperiments(M5, I5);
            renderLabResults(res);
            btn.innerHTML = original;
        }, 100);
    }

    // نظام التدريب (تم تصحيح الآيدي إلى #replay)
    if (text.includes('بدء جلسة جديدة') || text.includes('START REPLAY')) initReplaySystem(M5, I5);
    if (text.includes('شمعة تالية') || text.includes('NEXT CANDLE')) nextReplayCandle();
    
    if (text === 'BUY' || text === 'شراء') {
        if (btn.closest('#replay')) executeReplayTrade('BUY');
    }
    if (text === 'SELL' || text === 'بيع') {
        if (btn.closest('#replay')) executeReplayTrade('SELL');
    }
});

// حقن النتائج بالعناصر الأصلية للـ HTML
function renderBacktestResults(res) {
    if($('btNet')) {
        $('btNet').textContent = (res.netProfit>=0?'+':'') + '$' + res.netProfit.toFixed(2);
        $('btNet').className = res.netProfit>=0 ? 'text-buy font-bold' : 'text-sell font-bold';
    }
    if($('btWR')) $('btWR').textContent = res.winRate + '%';
    if($('btTrades')) $('btTrades').textContent = res.totalTrades;
    if($('btDD')) $('btDD').textContent = '-' + res.maxDrawdownPct + '%';
}

function renderLabResults(res) {
    if($('labNetA')) { $('labNetA').textContent = (res.A.netProfit>=0?'+':'') + '$' + res.A.netProfit.toFixed(0); $('labNetA').className = res.A.netProfit>=0 ? 'text-buy' : 'text-sell'; }
    if($('labWrA')) $('labWrA').textContent = res.A.winRate + '%';

    if($('labNetB')) { $('labNetB').textContent = (res.B.netProfit>=0?'+':'') + '$' + res.B.netProfit.toFixed(0); $('labNetB').className = res.B.netProfit>=0 ? 'text-buy' : 'text-sell'; }
    if($('labWrB')) $('labWrB').textContent = res.B.winRate + '%';

    if($('labNetC')) { $('labNetC').textContent = (res.C.netProfit>=0?'+':'') + '$' + res.C.netProfit.toFixed(0); $('labNetC').className = res.C.netProfit>=0 ? 'text-buy' : 'text-sell'; }
    if($('labWrC')) $('labWrC').textContent = res.C.winRate + '%';
}

function startLiveStream() {
    initLiveConnection(
        (msg) => {
            if ($('hSrc')) {
                $('hSrc').innerHTML = msg;
                $('hSrc').className = msg.includes('متصل') ? 'text-xs font-bold text-buy' : 'text-xs font-bold text-gold';
            }
        },
        (price) => {
            if ($('hPrice')) $('hPrice').textContent = Number(price).toFixed(2);
            if (M5 && M5.length > 0) {
                const lastBar = M5[M5.length - 1];
                if (price > lastBar.h) lastBar.h = price;
                if (price < lastBar.l) lastBar.l = price;
                lastBar.c = price;
                drawMain();
                if (I5 && I5.length > 0) {
                    const signal = detectSignal(M5, I5, M5.length - 1, { rr: 2.0 });
                    updateLiveSignalUI(signal);
                }
            }
        },
        (balance) => {
            if ($('hBal')) $('hBal').textContent = '$' + Number(balance).toFixed(2);
        }
    );
}

function updateLiveSignalUI(signal) {
    const container = $('signalContent');
    if (!container) return;
    if (!signal) {
        container.innerHTML = '<div class="text-muted py-6 text-sm text-center">بانتظار إشارة من المحرك... ⚪</div>';
        return;
    }
    const isBuy = signal.side === 'BUY';
    container.innerHTML = `
        <div class="text-2xl font-bold ${isBuy ? 'text-buy' : 'text-sell'} mb-1">${isBuy ? '🟢' : '🔴'} ${signal.side}</div>
        <div class="text-muted text-[10px] mb-3">${signal.reason}</div>
        <div class="flex justify-between text-xs bg-panel border border-panel p-3 rounded mb-4">
           <div><span class="text-muted block mb-1">Entry</span><span class="text-main font-bold">${signal.entry.toFixed(2)}</span></div>
           <div><span class="text-muted block mb-1">SL</span><span class="text-sell font-bold">${signal.sl.toFixed(2)}</span></div>
           <div><span class="text-muted block mb-1">TP</span><span class="text-buy font-bold">${signal.tp.toFixed(2)}</span></div>
        </div>
        <div class="bg-card border border-panel text-gold p-2 rounded text-[10px] text-center">
            ⚠️ وضع القراءة فقط. لن يتم التنفيذ بالسوق.
        </div>`;
}
