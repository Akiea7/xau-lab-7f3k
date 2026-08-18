import { calculatePosition, calculatePnL } from './risk.js';
import { drawCandles } from './chart.js';

let rData = [], rInd = [];
let state = {
    active: false,
    index: 100, // نبدأ بعد فترة التحمية
    balance: 10000,
    openTrade: null,
    history: []
};

/**
 * 🎬 تهيئة جلسة المحاكاة
 */
export function initReplaySystem(data, indicators) {
    rData = data;
    rInd = indicators;
    
    // اختيار نقطة عشوائية للبدء (بعيداً عن البداية والنهاية)
    const minIdx = 100;
    const maxIdx = Math.floor(data.length * 0.7);
    state.index = Math.floor(Math.random() * (maxIdx - minIdx + 1)) + minIdx;
    
    state.balance = 10000;
    state.openTrade = null;
    state.history = [];
    state.active = true;

    drawReplayChart();
    alert('🎬 بدأت جلسة المحاكاة! أنت الآن في نقطة زمنية عشوائية من الماضي.');
}

/**
 * ⏭️ التقدم شمعة واحدة للمستقبل
 */
export function nextReplayCandle() {
    if (!state.active || state.index >= rData.length - 1) return;
    state.index++;
    
    const bar = rData[state.index];
    
    // فحص الصفقات المفتوحة مع حركة الشمعة الجديدة
    if (state.openTrade) {
        let exitPrice = null;
        let reason = '';
        
        if (state.openTrade.side === 'BUY') {
            if (bar.l <= state.openTrade.sl) { exitPrice = state.openTrade.sl; reason = 'Hit SL 🔴'; }
            else if (bar.h >= state.openTrade.tp) { exitPrice = state.openTrade.tp; reason = 'Hit TP 🟢'; }
        } else {
            if (bar.h >= state.openTrade.sl) { exitPrice = state.openTrade.sl; reason = 'Hit SL 🔴'; }
            else if (bar.l <= state.openTrade.tp) { exitPrice = state.openTrade.tp; reason = 'Hit TP 🟢'; }
        }

        if (exitPrice) {
            const pnl = calculatePnL(state.openTrade.entry, exitPrice, state.openTrade.side, state.openTrade.lots);
            state.balance += pnl;
            state.history.push({...state.openTrade, exit: exitPrice, pnl, reason});
            state.openTrade = null;
            alert(`تم إغلاق الصفقة: ${reason}\nالربح/الخسارة: $${pnl.toFixed(2)}\nالرصيد الحالي: $${state.balance.toFixed(2)}`);
        }
    }
    
    drawReplayChart();
}

/**
 * ⚡ تنفيذ صفقة وهمية داخل المحاكي
 */
export function executeReplayTrade(side) {
    if (!state.active) return alert('⚠️ يرجى بدء جلسة محاكاة أولاً!');
    if (state.openTrade) return alert('⚠️ لديك صفقة مفتوحة بالفعل! انتظر حتى تُغلق.');

    const bar = rData[state.index];
    const ind = rInd[state.index];
    
    // استخدام ATR لتحديد الأهداف والوقوف، أو قيم ثابتة إذا لم يتوفر
    const atr = (ind && ind.atr) ? ind.atr : 2.0;

    let sl, tp;
    if (side === 'BUY') {
        sl = bar.c - (atr * 1.5);
        tp = bar.c + (atr * 3.0);
    } else {
        sl = bar.c + (atr * 1.5);
        tp = bar.c - (atr * 3.0);
    }

    // حساب اللوت بناءً على المخاطرة (1%)
    const lots = calculatePosition(state.balance, 1.0, bar.c, sl);

    state.openTrade = {
        side,
        entry: bar.c,
        sl,
        tp,
        lots,
        time: bar.t
    };
    
    alert(`✅ تم فتح صفقة ${side}\nالدخول: ${bar.c}\nاللوت: ${lots}\nالوقف: ${sl.toFixed(2)}\nالهدف: ${tp.toFixed(2)}`);
    drawReplayChart();
}

/**
 * 📈 رسم الشارت المقطوع (إخفاء المستقبل)
 */
function drawReplayChart() {
    const chartDiv = document.getElementById('chartMain');
    if (chartDiv && rData.length > 0) {
        // اقتطاع البيانات من البداية وحتى المؤشر الحالي فقط
        const currentData = rData.slice(0, state.index + 1);
        const currentInd = rInd.slice(0, state.index + 1);
        
        // تمرير الصفقة المفتوحة لرسم خطوطها على الشارت (إذا كانت دالة الرسم تدعم ذلك)
        drawCandles(chartDiv, currentData, currentInd, 130, 0, [], state.openTrade, null);
    }
}
