import { initSecurity } from './lock.js';
import { loadHistoricalData, M5, agg } from './data.js';
import { buildInd, buildPivots } from './indicators.js';
import { evaluate, runBacktest } from './engine.js';
import { drawCandles } from './chart.js';
import { initReplay } from './replay.js';

const $ = (id) => document.getElementById(id);

export let M15 = [], H1 = [], I5 = [], I15 = [], I1 = [], PV15 = [];

export function buildAll() {
  try {
    if (M5 && M5.length > 0) {
      M15 = agg(M5, 3); H1 = agg(M5, 12);
      I5 = buildInd(M5); I15 = buildInd(M15); I1 = buildInd(H1);
      PV15 = buildPivots(M15);
    }
  } catch(e) {}
}

const P = { riskPct: 1.0, balance: 10000, rr: 2.0 };
const live = { open: null, tf: 'M5', offset: 0, hover: null, ws: null, latestSignal: null, symbol: 'XAUUSD' };

document.addEventListener('DOMContentLoaded', async () => {
  try { initSecurity(); } catch(e) {}

  if ($('hSrc')) $('hSrc').innerHTML = '⏳ جاري تحميل البيانات...';
  
  // 1. حقن النافذة والزر برمجياً لضمان ظهورهم 100%
  injectModalAndButton();

  try {
    const bars = await loadHistoricalData();
    if (bars && bars.length > 0) {
        buildAll();
        drawMain();
        initReplay(M5, drawCandles, buildInd);

        const lastPrice = M5[M5.length - 1].c;
        if ($('hPrice')) $('hPrice').textContent = lastPrice.toFixed(2);
        
        const sig = evaluate(M5.length - 1, P);
        if (sig) updateSignalUI(sig);

        if ($('hSrc')) {
          $('hSrc').innerHTML = '🟡 وضع البيانات التاريخية (غير مربوط)';
          $('hSrc').className = 'text-xs font-bold text-gold';
        }
    }
  } catch(e) {}
});

function injectModalAndButton() {
    const sigContainer = $('signalContent');
    
    // حقن زر الربط فوق المحرك
    if (sigContainer && !$('btnOpenMt5')) {
        const btnOpen = document.createElement('button');
        btnOpen.id = 'btnOpenMt5';
        btnOpen.className = 'w-full mb-4 bg-[#171C29] border border-panel text-gold px-4 py-3 rounded text-sm font-bold shadow hover:bg-panel transition-colors';
        btnOpen.innerText = '🔗 انقر هنا لربط حسابك بـ Hantec';
        sigContainer.parentNode.insertBefore(btnOpen, sigContainer);
    }

    // حقن النافذة المنبثقة
    if (!$('mt5Modal')) {
        const modal = document.createElement('div');
        modal.id = 'mt5Modal';
        modal.className = 'fixed inset-0 bg-black/90 z-[100] flex items-center justify-center hidden';
        modal.innerHTML = `
        <div class="bg-[#0B0E14] border border-panel p-6 rounded-lg w-11/12 max-w-md shadow-2xl" dir="rtl">
            <h2 class="text-gold text-lg font-bold mb-4 border-b border-panel pb-2">🔗 ربط حساب التداول (MT5)</h2>
            <div class="space-y-4">
                <div>
                    <label class="block text-slate-400 text-xs mb-1">MetaApi Token</label>
                    <input type="password" id="mt5Token" class="w-full bg-[#171C29] border border-panel rounded p-2 text-white text-sm focus:outline-none focus:border-[#38bdf8]" placeholder="ضع توكن MetaApi هنا...">
                </div>
                <div>
                    <label class="block text-slate-400 text-xs mb-1">Account ID</label>
                    <input type="text" id="mt5AccountId" class="w-full bg-[#171C29] border border-panel rounded p-2 text-white text-sm focus:outline-none focus:border-[#38bdf8]" placeholder="مثال: 2a742243-...">
                </div>
                <div>
                    <label class="block text-slate-400 text-xs mb-1">رمز الذهب (Symbol)</label>
                    <input type="text" id="mt5Symbol" class="w-full bg-[#171C29] border border-panel rounded p-2 text-white text-sm focus:outline-none focus:border-[#38bdf8]" value="XAUUSD">
                </div>
                <button id="btnConnectMt5" class="w-full bg-[#F0B90B] text-black font-bold py-2 rounded shadow hover:shadow-[0_0_15px_rgba(240,185,11,0.4)] transition-all">بدء الاتصال بالسيرفر ⚡</button>
                <button id="btnCloseModal" class="w-full mt-2 bg-transparent text-slate-500 text-xs py-1 hover:text-white">إلغاء والتصفح بالوضع التاريخي</button>
            </div>
        </div>`;
        document.body.appendChild(modal);
    }
    autoConnectLive();
}


function autoConnectLive() {
    live.symbol = 'XAUUSD';
    connectLiveServer();
}

function connectLiveServer() {
    if(live.ws) live.ws.close();
    live.ws = new WebSocket('ws://127.0.0.1:3000');
    
    live.ws.onopen = () => {
        /* الاتصال يتم من السيرفر مباشرة */
    };

    live.ws.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.type === 'status') {
                if ($('hSrc')) {
                    $('hSrc').innerHTML = data.msg;
                    $('hSrc').className = data.msg.includes('متصل') ? 'text-xs font-bold text-buy' : 'text-xs font-bold text-gold';
                }
                if(data.msg.includes('متصل')) {
                    $('mt5Modal').classList.add('hidden');
                    if($('btnConnectMt5')) $('btnConnectMt5').innerText = 'بدء الاتصال بالسيرفر ⚡';
                    if($('btnOpenMt5')) {
                        $('btnOpenMt5').innerText = '✅ متصل بالحساب: ' + accountId.substring(0,6) + '...';
                        $('btnOpenMt5').classList.replace('text-gold', 'text-buy');
                        $('btnOpenMt5').classList.replace('border-panel', 'border-buy');
                    }
                }
            }
            else if (data.type === 'tick') {
                if ($('hPrice')) $('hPrice').textContent = Number(data.price).toFixed(2);
                if (M5 && M5.length > 0) {
                    const lastBar = M5[M5.length - 1];
                    if (data.price > lastBar.h) lastBar.h = data.price;
                    if (data.price < lastBar.l) lastBar.l = data.price;
                    lastBar.c = data.price;
                    const signal = evaluate(M5.length - 1, P);
                    if (signal) live.latestSignal = signal;
                }
                drawMain();
                updateSignalUI(live.latestSignal);
            } 
            else if (data.type === 'balance') {
                if ($('hBal')) $('hBal').textContent = '$' + Number(data.balance).toFixed(2);
            }
            else if (data.type === 'trade_result') {
                if(data.success) {
                    alert('✅ تم تنفيذ الصفقة بنجاح!');
                    live.latestSignal = null;
                    updateSignalUI(null);
                } else {
                    alert('❌ فشل التنفيذ: ' + data.error);
                }
            }
        } catch(err) {}
    };

    live.ws.onerror = () => {
        if($('btnConnectMt5')) $('btnConnectMt5').innerText = '❌ فشل الاتصال (تأكد من تشغيل Termux بـ 98)';
    };
}

function drawMain() {
  try {
    const C = live.tf === 'H1' ? H1 : live.tf === 'M15' ? M15 : M5;
    const I = live.tf === 'H1' ? I1 : live.tf === 'M15' ? I15 : I5;
    if ($('chartMain') && C && C.length > 0) drawCandles($('chartMain'), C, I, 130, live.offset, [], live.open, live.hover);
  } catch(e) {}
}

function updateSignalUI(signal) {
  const container = $('signalContent');
  if (!container) return;
  if (!signal || signal.type !== 'signal') {
    container.innerHTML = '<div class="text-slate-500 py-6 text-sm">بانتظار إشارة من المحرك... ⚪</div>';
    return;
  }
  const isBuy = signal.side === 'BUY';
  container.innerHTML = `
    <div class="text-2xl font-bold ${isBuy ? 'text-buy' : 'text-sell'} mb-1">${isBuy ? '🟢' : '🔴'} ${signal.side}</div>
    <div class="text-gold font-bold text-xs mb-4">SCORE ${signal.score || 85}/100</div>
    <div class="flex justify-between text-xs bg-[#0B0E14] border border-panel p-3 rounded mb-4">
       <div><span class="text-slate-400 block mb-1">Entry</span><span class="text-white font-bold">${signal.entry}</span></div>
       <div><span class="text-slate-400 block mb-1">SL</span><span class="text-sell font-bold">${signal.sl}</span></div>
       <div><span class="text-slate-400 block mb-1">TP</span><span class="text-buy font-bold">${signal.tp}</span></div>
    </div>
    <button id="btnExecSig" class="w-full bg-[#F0B90B] text-black font-bold py-2 rounded text-xs shadow-[0_0_10px_rgba(240,185,11,0.3)] hover:shadow-[0_0_20px_rgba(240,185,11,0.6)] transition-all">تنفيذ (LIVE) ⚡</button>
  `;
  
  const btnExec = $('btnExecSig');
  if(btnExec) {
      btnExec.onclick = () => {
          if(live.ws && live.ws.readyState === 1 && live.symbol) {
              btnExec.innerText = 'جاري التنفيذ... ⏳';
              live.ws.send(JSON.stringify({
                  type: 'execute_trade',
                  action: signal.side,
                  symbol: live.symbol,
                  lots: 0.01,
                  sl: parseFloat(signal.sl),
                  tp: parseFloat(signal.tp)
              }));
          } else {
              alert("⚠️ يرجى ربط حساب MT5 من الزر بالأعلى أولاً!");
          }
      };
  }
}

// أحداث أزرار الباكتيست والمختبر
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const text = btn.textContent.trim().toUpperCase();

  if (text.includes('RUN BACKTEST')) {
    try {
      const originalText = btn.innerHTML;
      btn.innerText = 'جاري الحساب... ⏳';
      setTimeout(() => {
        const res = runBacktest(M5, { balance: 10000, riskPct: 1.0, rr: 2.0 });
        let resBox = document.getElementById('btDynamicResults');
        if (!resBox) {
            resBox = document.createElement('div');
            resBox.id = 'btDynamicResults';
            resBox.className = 'mt-4 bg-[#0B0E14] border border-panel rounded p-4';
            btn.parentNode.appendChild(resBox);
        }
        resBox.innerHTML = `
          <h3 class="text-gold text-sm font-bold mb-3 border-b border-panel pb-2">نتائج الاختبار</h3>
          <div class="grid grid-cols-2 gap-4 text-center">
            <div><span class="text-slate-400 text-xs block">Net Profit</span><span class="font-bold text-lg ${res.net>=0?'text-buy':'text-sell'}">${res.net>=0?'+':''}$${res.net.toFixed(2)}</span></div>
            <div><span class="text-slate-400 text-xs block">Win Rate</span><span class="font-bold text-lg text-gold">${res.winRate}%</span></div>
            <div><span class="text-slate-400 text-xs block">Trades</span><span class="font-bold text-lg">${res.trades.length}</span></div>
            <div><span class="text-slate-400 text-xs block">Max DD</span><span class="font-bold text-lg text-sell">${res.maxDD}%</span></div>
          </div>
        `;
        btn.innerHTML = originalText;
      }, 100);
    } catch(err) {}
  } else if (text.includes('RUN EXPERIMENT')) {
    try {
      const originalText = btn.innerHTML;
      btn.innerText = 'جاري إجراء التجارب... 🧪';
      setTimeout(() => {
        const resA = runBacktest(M5, { balance: 10000, riskPct: 1.0, rr: 2.0 });
        const resB = runBacktest(M5, { balance: 10000, riskPct: 1.0, rr: 1.5 });
        const resC = runBacktest(M5, { balance: 10000, riskPct: 1.0, rr: 3.0 });
        
        let labBox = document.getElementById('labDynamicResults');
        if (!labBox) {
            labBox = document.createElement('div');
            labBox.id = 'labDynamicResults';
            labBox.className = 'mt-4 grid grid-cols-3 gap-2 text-center text-xs';
            btn.parentNode.appendChild(labBox);
        }
        const makeCard = (title, rr, res, isBest) => `
          <div class="bg-panel border ${isBest?'border-[#9333ea]':'border-panel'} rounded p-2">
            <div class="${isBest?'text-[#d8b4fe]':'text-slate-400'} font-bold mb-2">${title}</div>
            <div class="mb-1 text-slate-500">RR 1:${rr}</div>
            <div class="font-bold text-sm ${res.net>=0?'text-buy':'text-sell'}">${res.net>=0?'+':''}$${res.net.toFixed(0)}</div>
            <div class="text-gold">${res.winRate}%</div>
          </div>`;
        labBox.innerHTML = makeCard('A (كلاسيك)', '2.0', resA, true) + makeCard('B (سريع)', '1.5', resB, false) + makeCard('C (قناص)', '3.0', resC, false);
        btn.innerHTML = originalText;
      }, 100);
    } catch(err) {}
  } else if (text.includes('بدء جلسة جديدة')) {
      const setupDiv = btn.closest('div');
      if(setupDiv && setupDiv.nextElementSibling) {
          setupDiv.classList.add('hidden');
          setupDiv.nextElementSibling.classList.remove('hidden');
          const replayBtn = document.getElementById('btnStartReplay');
          if(replayBtn) replayBtn.click();
      }
  }
});
