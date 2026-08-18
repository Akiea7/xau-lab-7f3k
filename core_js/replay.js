import { calculatePosition, calculatePnL } from './risk.js';
import { drawCandles } from './chart.js';

let rData = [], rInd = [];
let state = { active: false, index: 100, balance: 10000, openTrade: null, history: [] };
const $ = (id) => document.getElementById(id);
const logFeedback = (msg, isWin) => { if($('replayFeedback')) $('replayFeedback').innerHTML = `<span class="${isWin===true?'text-buy':isWin===false?'text-sell':'text-gold'}">${msg}</span>`; };

export function initReplaySystem(data, indicators) {
    rData = data; rInd = indicators;
    const minIdx = 100;
    const maxIdx = Math.floor(data.length * 0.7);
    state.index = Math.floor(Math.random() * (maxIdx - minIdx + 1)) + minIdx;
    state.balance = 10000; state.openTrade = null; state.history = []; state.active = true;

    // تبديل الواجهة
    if($('replaySetup')) $('replaySetup').classList.add('hidden');
    if($('replayActive')) $('replayActive').classList.remove('hidden');

    drawReplayChart();
    logFeedback('🎬 بدأت جلسة المحاكاة!', null);
}

export function nextReplayCandle() {
    if (!state.active || state.index >= rData.length - 1) return;
    state.index++;
    const bar = rData[state.index];
    
    if (state.openTrade) {
        let exitPrice = null; let reason = '';
        if (state.openTrade.side === 'BUY') {
            if (bar.l <= state.openTrade.sl) { exitPrice = state.openTrade.sl; reason = 'Hit SL'; }
            else if (bar.h >= state.openTrade.tp) { exitPrice = state.openTrade.tp; reason = 'Hit TP'; }
        } else {
            if (bar.h >= state.openTrade.sl) { exitPrice = state.openTrade.sl; reason = 'Hit SL'; }
            else if (bar.l <= state.openTrade.tp) { exitPrice = state.openTrade.tp; reason = 'Hit TP'; }
        }

        if (exitPrice) {
            const pnl = calculatePnL(state.openTrade.entry, exitPrice, state.openTrade.side, state.openTrade.lots);
            state.balance += pnl;
            state.history.push({...state.openTrade, exit: exitPrice, pnl, reason});
            state.openTrade = null;
            logFeedback(`تم إغلاق الصفقة: ${reason} | PnL: $${pnl.toFixed(2)} | الرصيد: $${state.balance.toFixed(2)}`, pnl > 0);
        }
    }
    drawReplayChart();
}

export function executeReplayTrade(side) {
    if (!state.active) return logFeedback('⚠️ ابدأ الجلسة أولاً', false);
    if (state.openTrade) return logFeedback('⚠️ لديك صفقة مفتوحة', false);

    const bar = rData[state.index];
    const atr = (rInd[state.index] && rInd[state.index].atr) ? rInd[state.index].atr : 2.0;

    let sl = side === 'BUY' ? bar.c - (atr * 1.5) : bar.c + (atr * 1.5);
    let tp = side === 'BUY' ? bar.c + (atr * 3.0) : bar.c - (atr * 3.0);
    const lots = calculatePosition(state.balance, 1.0, bar.c, sl);

    state.openTrade = { side, entry: bar.c, sl, tp, lots, time: bar.t };
    logFeedback(`✅ دخلت ${side} | دخول: ${bar.c.toFixed(2)} | اللوت: ${lots}`, true);
    drawReplayChart();
}

function drawReplayChart() {
    const chartDiv = document.getElementById('chartReplay'); // تم الإصلاح
    if (chartDiv && rData.length > 0) {
        drawCandles(chartDiv, rData.slice(0, state.index + 1), rInd.slice(0, state.index + 1), 130, 0, [], state.openTrade, null);
    }
}
