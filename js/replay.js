export function initReplay(bars, drawCandles, buildInd) {
   const btnStart = document.getElementById('btnStartReplay');
   const setupDiv = document.getElementById('replaySetup');
   const activeDiv = document.getElementById('replayActive');
   const chartDiv = document.getElementById('chartReplay');
   const btnBuy = document.getElementById('btnRepBuy');
   const btnSell = document.getElementById('btnRepSell');
   const resDiv = document.getElementById('replayResult');

   if(!btnStart) return;

   let currentIndex = 0;
   let sessionBars = [];
   let virtualTrade = null;

   // زر الشمعة التالية
   let btnNext = document.getElementById('btnRepNext');
   if(!btnNext) {
       btnNext = document.createElement('button');
       btnNext.id = 'btnRepNext';
       btnNext.className = "w-full bg-[#38bdf8] text-white font-bold py-3 rounded text-sm hover:bg-[#0284c7] shadow-[0_0_10px_rgba(56,189,248,0.3)] hidden mt-2";
       btnNext.innerText = "شمعة تالية ⏭";
       activeDiv.insertBefore(btnNext, resDiv);
   }

   const renderChart = () => {
       let I = buildInd(sessionBars);
       drawCandles(chartDiv, sessionBars, I, 130, 0, [], null, null);
   };

   btnStart.onclick = () => {
       setupDiv.classList.add('hidden');
       activeDiv.classList.remove('hidden');
       resDiv.classList.add('hidden');
       btnBuy.classList.remove('hidden');
       btnSell.classList.remove('hidden');
       btnNext.classList.add('hidden');
       virtualTrade = null;
       
       // اختيار نقطة بالماضي (ترك مسافة 200 شمعة للرسم و50 للمستقبل)
       currentIndex = Math.floor(Math.random() * (bars.length - 250)) + 200;
       sessionBars = bars.slice(0, currentIndex);
       renderChart();
   };

   const openTrade = (side) => {
       let lastBar = sessionBars[sessionBars.length - 1];
       let I = buildInd(sessionBars);
       let atr = (I && I.length > 0 && I[I.length-1].atr) ? I[I.length-1].atr : 2.5;

       let slDist = atr * 1.5;
       let tpDist = atr * 2.0;

       virtualTrade = {
           side: side,
           entry: lastBar.c,
           sl: side === 'BUY' ? lastBar.c - slDist : lastBar.c + slDist,
           tp: side === 'BUY' ? lastBar.c + tpDist : lastBar.c - tpDist
       };

       resDiv.classList.remove('hidden');
       resDiv.className = `mt-4 text-xs font-bold p-3 rounded border bg-[#171C29] text-slate-300 border-[#1F2637]`;
       resDiv.innerHTML = `🛒 صفقة وهمية (${side}) @ ${virtualTrade.entry.toFixed(2)} <br> SL: <span class="text-sell">${virtualTrade.sl.toFixed(2)}</span> | TP: <span class="text-buy">${virtualTrade.tp.toFixed(2)}</span>`;

       btnBuy.classList.add('hidden');
       btnSell.classList.add('hidden');
       btnNext.classList.remove('hidden');
   };

   btnNext.onclick = () => {
       if(currentIndex < bars.length - 1 && virtualTrade) {
           currentIndex++;
           sessionBars.push(bars[currentIndex]);
           renderChart();

           let bar = bars[currentIndex];
           let isHitTP = false, isHitSL = false;

           if (virtualTrade.side === 'BUY') {
               if (bar.l <= virtualTrade.sl) isHitSL = true;
               else if (bar.h >= virtualTrade.tp) isHitTP = true;
           } else {
               if (bar.h >= virtualTrade.sl) isHitSL = true;
               else if (bar.l <= virtualTrade.tp) isHitTP = true;
           }

           if(isHitTP || isHitSL) {
               btnNext.classList.add('hidden');
               resDiv.className = `mt-4 text-sm font-bold p-3 rounded border ${isHitTP ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'}`;
               resDiv.innerHTML = `النتيجة: ${isHitTP ? '✅ ضرب الهدف (TP)' : '❌ ضرب الستوب (SL)'} <br> السعر الحالي: ${bar.c.toFixed(2)}`;
               
               setTimeout(() => {
                   setupDiv.classList.remove('hidden');
                   activeDiv.classList.add('hidden');
                   btnStart.innerText = "جلسة تدريب أخرى ▶";
               }, 4000);
           }
       }
   };

   btnBuy.onclick = () => openTrade('BUY');
   btnSell.onclick = () => openTrade('SELL');
}
