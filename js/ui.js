export function initUI() {
  document.getElementById('appMain').innerHTML = `
    <section id="sec-live" class="space-y-6">
      <div class="grid xl:grid-cols-3 gap-6">
        <div class="xl:col-span-2 card p-4 fadeUp">
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <div class="flex rounded-xl overflow-hidden border border-ink-600">
              <button data-tf="H1" class="tfBtn px-3 py-1.5 text-[12px] font-bold bg-gold-500 text-ink-950">H1 سياق</button>
              <button data-tf="M15" class="tfBtn px-3 py-1.5 text-[12px] font-bold bg-ink-700 text-slate-300">M15 إعداد</button>
              <button data-tf="M5" class="tfBtn px-3 py-1.5 text-[12px] font-bold bg-ink-700 text-slate-300">M5 تنفيذ</button>
            </div>
            <div class="ms-auto flex items-center gap-2 text-[11px]">
              <button id="chPrev" class="chip bg-ink-600 hover:bg-ink-500">‹ أقدم</button>
              <button id="chLive" class="chip bg-gold-500/15 text-gold-300 border border-gold-500/30">الأحدث ⦿</button>
            </div>
          </div>
          <canvas id="chartMain" height="420"></canvas>
        </div>
        <div class="space-y-6">
          <div id="signalCard" class="card p-5 fadeUp"><p class="text-slate-500 text-sm text-center py-8">بانتظار اتصال WebSocket...</p></div>
          <div class="card p-4 fadeUp">
            <h3 class="font-bold text-white text-sm mb-3">🛡 مدير المخاطرة (LIVE)</h3>
            <div class="grid grid-cols-2 gap-2 text-center text-[11px] num mb-3">
              <div class="bg-ink-800 rounded-lg py-2 border border-ink-700"><p class="text-slate-500">P&L اليوم</p><b id="gPnl" class="text-white">$0.0</b></div>
              <div class="bg-ink-800 rounded-lg py-2 border border-ink-700"><p class="text-slate-500">P&L الأسبوع</p><b id="gWeek" class="text-white">$0.0</b></div>
              <div class="bg-ink-800 rounded-lg py-2 border border-ink-700"><p class="text-slate-500">صفقات اليوم</p><b id="gTr" class="text-white">0/4</b></div>
              <div class="bg-ink-800 rounded-lg py-2 border border-ink-700"><p class="text-slate-500">خسائر متتالية</p><b id="gCon" class="text-white">0</b></div>
              <div class="bg-ink-800 rounded-lg py-2 border border-ink-700 col-span-2"><p class="text-slate-500">الرصيد</p><b id="gBal" class="text-gold-300">$10,000</b></div>
            </div>
            <div id="gStatus" class="text-[12px] font-bold text-up bg-up/10 border border-up/30 rounded-lg px-3 py-2 text-center">بانتظار البيانات</div>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-7 gap-3">
        <div class="card p-3 text-center col-span-2 md:col-span-1"><p class="text-[10px] text-slate-400">ظرف السوق</p><p id="iReg" class="font-extrabold text-[13px]">—</p></div>
        <div class="card p-3 text-center"><p class="text-[10px] text-slate-400">H1</p><p id="iCtx" class="font-extrabold text-[13px]">—</p></div>
        <div class="card p-3 text-center"><p class="text-[10px] text-slate-400">M15</p><p id="iM15" class="font-extrabold text-[13px]">—</p></div>
        <div class="card p-3 text-center"><p class="text-[10px] text-slate-400">البنية</p><p id="iStr" class="font-extrabold text-[13px]">—</p></div>
        <div class="card p-3 text-center"><p class="text-[10px] text-slate-400">RSI M5</p><p id="iR5" class="num font-extrabold text-[13px]">—</p></div>
        <div class="card p-3 text-center"><p class="text-[10px] text-slate-400">التقلب</p><p id="iVol" class="num font-extrabold text-[13px]">—</p></div>
        <div class="card p-3 text-center"><p class="text-[10px] text-slate-400">الجلسة</p><p id="iSes" class="font-extrabold text-[13px] text-gold-300">—</p></div>
      </div>
    </section>
    
    <section id="sec-journal" class="hidden space-y-6">
      <div class="card p-5">
        <h3 class="font-bold text-white text-sm mb-3">سجل الصفقات الحية (مربوط بقاعدة البيانات)</h3>
        <div class="overflow-x-auto"><table class="w-full text-[11px] num text-center"><thead class="text-slate-400 border-b border-ink-600"><tr><th class="py-2">الوقت</th><th>إشارة</th><th>دخول</th><th>SL</th><th>TP</th><th>خروج</th><th>الحالة</th><th>P&L</th></tr></thead><tbody id="jTable"><tr><td colspan="8" class="py-6 text-slate-500">بانتظار الصفقات الحية...</td></tr></tbody></table></div>
      </div>
    </section>

    <section id="sec-report" class="hidden"><div class="max-w-xl mx-auto card p-6 num text-[13px] leading-7" id="repCard">تقرير الأداء اليومي سيظهر هنا...</div></section>
  `;
}

export function switchTab(t) {
  document.querySelectorAll('.tabBtn').forEach(x => { x.classList.remove('active', 'text-gold-300', 'font-extrabold'); x.classList.add('text-slate-400') });
  const b = document.querySelector(`[data-tab="${t}"]`); 
  if (b) b.classList.add('active', 'text-gold-300', 'font-extrabold');
  ['live', 'journal', 'report'].forEach(s => {
    const el = document.getElementById('sec-' + s);
    if (el) el.classList.toggle('hidden', s !== t);
  });
}
