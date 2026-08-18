import { loadHistoricalData, M5, agg } from './data.js';
import { buildInd, buildPivots } from './indicators.js';
import { evaluate } from './engine.js';
import { drawCandles } from './chart.js';

// Global State
export let M15 = [], H1 = [], I5 = [], I15 = [], I1 = [], PV15 = [];
const $ = (id) => document.getElementById(id);

export function buildAll() {
    try {
        if (M5 && M5.length > 0) {
            M15 = agg(M5, 3); 
            H1 = agg(M5, 12);
            I5 = buildInd(M5); 
            I15 = buildInd(M15); 
            I1 = buildInd(H1);
            PV15 = buildPivots(M15);
        }
    } catch(error) {
        console.error('[BUILD INDICATORS ERROR]', error);
    }
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
    } catch(error) {
        console.error('[CHART DRAW ERROR]', error);
    }
}

// مؤقتاً تم إيقاف أزرار الباكتيست واللايف لحين ربطها بالملفات الجديدة في المراحل القادمة
