export let M5 = [];

export async function loadHistoricalData() {
    try {
        const targetUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/XAUUSD=X?interval=5m&range=1mo';
        const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(targetUrl);
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('فشل جلب البيانات');
        
        const proxyData = await response.json();
        const data = JSON.parse(proxyData.contents);
        const result = data.chart.result[0];
        
        M5 = [];
        for (let i = 0; i < result.timestamp.length; i++) {
            if (result.indicators.quote[0].close[i] === null) continue;
            M5.push({
                t: result.timestamp[i] * 1000,
                o: result.indicators.quote[0].open[i],
                h: result.indicators.quote[0].high[i],
                l: result.indicators.quote[0].low[i],
                c: result.indicators.quote[0].close[i],
                v: result.indicators.quote[0].volume[i] || 0
            });
        }
        return M5;
    } catch (error) {
        console.error('⚠️ جلب البيانات فشل، سيتم توليد بيانات وهمية مؤقتة لمنع توقف المنصة.');
        return generateMockData();
    }
}

function generateMockData() {
    M5 = []; let price = 2400.00; let now = Date.now() - (1000 * 300000);
    for(let i=0; i<1000; i++) {
        let o = price; let h = o + (Math.random() * 5); let l = o - (Math.random() * 5);
        let c = l + (Math.random() * (h - l)); price = c;
        M5.push({ t: now + (i * 300000), o, h, l, c, v: 100 });
    }
    return M5;
}

export function agg(bars, timeFrameMinutes) {
    if (!bars.length) return [];
    const timeframeMs = timeFrameMinutes * 60 * 1000;
    let out = []; let currentChunk = [bars[0]];
    let currentInterval = Math.floor(bars[0].t / timeframeMs);

    for (let i = 1; i < bars.length; i++) {
        let b = bars[i];
        let interval = Math.floor(b.t / timeframeMs);
        if (interval === currentInterval) currentChunk.push(b);
        else {
            out.push({
                t: currentChunk[0].t, o: currentChunk[0].o,
                h: Math.max(...currentChunk.map(c => c.h)), l: Math.min(...currentChunk.map(c => c.l)),
                c: currentChunk[currentChunk.length - 1].c, v: currentChunk.reduce((s, c) => s + c.v, 0)
            });
            currentChunk = [b]; currentInterval = interval;
        }
    }
    if (currentChunk.length > 0) {
        out.push({
            t: currentChunk[0].t, o: currentChunk[0].o,
            h: Math.max(...currentChunk.map(c => c.h)), l: Math.min(...currentChunk.map(c => c.l)),
            c: currentChunk[currentChunk.length - 1].c, v: currentChunk.reduce((s, c) => s + c.v, 0)
        });
    }
    return out;
}
