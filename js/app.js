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
            M15 = agg(M5, 15); H1 = agg(M5, 60);
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

    if (text.includes('RUN BACKTEST')) {
        const original = btn.innerHTML;
        btn.innerHTML = 'جاري الحساب... ⏳';
        setTimeout(() => {
            try {
                const res = runProfessionalBacktest(M5, I5, { balance: 10000, riskPct: 1.0, rr: 2.0, maxTradesPerDay: 4, spread: 0.30, slippage: 0.10, commissionPerLot: 7.00, contractSize: 100 });
                renderBacktestResults(res);
            } catch (err) { console.error("Backtest Error:", err); }
            btn.innerHTML = original;
        }, 50);
    }

    if (text.includes('RUN EXPERIMENT')) {
        const original = btn.innerHTML;
        btn.innerHTML = 'جاري التجارب... 🧪';
        setTimeout(() => {
            try {
                const res = runLabExperiments(M5, I5);
                renderLabResults(res);
            } catch (err) { console.error("Lab Error:", err); }
            btn.innerHTML = original;
        }, 50);
    }

    if (btn.id === 'btnRepNext' || text.includes('NEXT CANDLE')) nextReplayCandle();
    if (text.includes('بدء جلسة جديدة') || text.includes('START REPLAY')) initReplaySystem(M5, I5);
    if (text === 'BUY' || text === 'شراء') if (btn.closest('#replay')) executeReplayTrade('BUY');
    if (text === 'SELL' || text === 'بيع') if (btn.closest('#replay')) executeReplayTrade('SELL');
});

function renderJournal(trades) {
    const tbody = $('journalBody');
    if (!tbody || !trades) return;
    tbody.innerHTML = trades.map(t => `
        <tr class="border-b border-panel text-xs text-center hover:bg-panel transition-colors">
            <td class="py-2 text-muted">${new Date(t.openTime).toLocaleString()}</td>
            <td class="font-bold ${t.side==='BUY'?'text-buy':'text-sell'}">${t.side}</td>
            <td class="text-main">${(t.actualEntry || t.entry).toFixed(2)}</td>
            <td class="text-sell">${t.sl.toFixed(2)}</td>
            <td class="text-buy">${t.tp.toFixed(2)}</td>
            <td class="text-main">${t.exit ? t.exit.toFixed(2) : '-'}</td>
            <td class="text-gold">${t.lots}</td>
            <td class="font-bold ${t.pnl>=0?'text-buy':'text-sell'}">${t.pnl? (t.pnl>=0?'+':'')+'$'+t.pnl.toFixed(2) : '-'}</td>
        </tr>`
    ).join('');
}

function renderBacktestResults(res) {
    if($('btWaiting')) $('btWaiting').classList.add('hidden');
    if($('btResultsBox')) $('btResultsBox').classList.remove('hidden');
    
    if($('btNet')) {
        $('btNet').textContent = (res.netProfit>=0?'+':'') + '$' + res.netProfit.toFixed(2);
        $('btNet').className = res.netProfit>=0 ? 'text-buy font-bold' : 'text-sell font-bold';
    }
    if($('btWR')) $('btWR').textContent = res.winRate + '%';
    if($('btTrades')) $('btTrades').textContent = res.totalTrades;
    if($('btDD')) $('btDD').textContent = '-' + res.maxDrawdownPct + '%';
    
    renderJournal(res.trades);
}

function renderLabResults(res) {
    if($('labWaiting')) $('labWaiting').classList.add('hidden');
    if($('labResults')) $('labResults').classList.remove('hidden');
    
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
        (tick) => {
            // تحويل آمن للأرقام لمنع الـ NaN
            const bid = Number(tick.bid || 0);
            const ask = Number(tick.ask || 0);
            if (bid === 0) return; // تجاهل التكات الفارغة
            
            const spread = ((ask - bid) * 100).toFixed(0);
            if ($('hPrice')) {
                $('hPrice').innerHTML = `<span class="text-sell">${bid.toFixed(2)}</span> / <span class="text-buy">${ask.toFixed(2)}</span> <span class="text-[10px] text-muted ml-2">(${spread}c Spread)</span>`;
            }
            
            const price = bid;
            if (M5 && M5.length > 0) {
                const tickTime = Date.now();
                const currentCandleTime = Math.floor(tickTime / 300000) * 300000;
                let lastBar = M5[M5.length - 1];

                if (currentCandleTime > lastBar.t) {
                    M5.push({ t: currentCandleTime, o: price, h: price, l: price, c: price, v: 1 });
                    buildAll();
                    if (I5 && I5.length > 1) {
                        const signal = detectSignal(M5, I5, M5.length - 2, { rr: 2.0 });
                        updateLiveSignalUI(signal);
                    }
                } else {
                    if (price > lastBar.h) lastBar.h = price;
                    if (price < lastBar.l) lastBar.l = price;
                    lastBar.c = price;
                    lastBar.v += 1;
                }
                drawMain();
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
    // استخدام slDist بدلاً من sl لتجنب الخطأ
    const slVal = isBuy ? (signal.entry - signal.slDist) : (signal.entry + signal.slDist);
    const tpVal = isBuy ? (signal.entry + signal.tpDist) : (signal.entry - signal.tpDist);
    
    container.innerHTML = `
        <div class="text-2xl font-bold ${isBuy ? 'text-buy' : 'text-sell'} mb-1">${isBuy ? '🟢' : '🔴'} ${signal.side}</div>
        <div class="text-muted text-[10px] mb-3">${signal.reason}</div>
        <div class="flex justify-between text-xs bg-panel border border-panel p-3 rounded mb-4">
           <div><span class="text-muted block mb-1">Entry</span><span class="text-main font-bold">${signal.entry.toFixed(2)}</span></div>
           <div><span class="text-muted block mb-1">SL</span><span class="text-sell font-bold">${slVal.toFixed(2)}</span></div>
           <div><span class="text-muted block mb-1">TP</span><span class="text-buy font-bold">${tpVal.toFixed(2)}</span></div>
        </div>
        <div class="bg-card border border-panel text-gold p-2 rounded text-[10px] text-center">
            ⚠️ وضع القراءة فقط. لن يتم التنفيذ بالسوق.
        </div>`;
}
