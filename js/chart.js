export function drawCandles(container, bars, ind, height = 150, offset = 0, trades = [], openTrade = null, hoverIdx = null) {
    if (!container || !bars || bars.length === 0) return;

    // التأكد من وجود Canvas داخل الحاوية مهما كان نوعها
    let cv = container.tagName === 'CANVAS' ? container : container.querySelector('canvas');
    if (!cv) {
        cv = document.createElement('canvas');
        cv.style.width = '100%';
        cv.style.height = '100%';
        if (container.tagName !== 'CANVAS') {
            container.innerHTML = '';
            container.appendChild(cv);
        }
    }

    const ctx = cv.getContext('2d');
    
    // ضبط الدقة لتكون الشموع واضحة جداً (HD)
    const w = container.clientWidth || 300;
    const h = container.clientHeight || height || 200;
    cv.width = w * window.devicePixelRatio;
    cv.height = h * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, w, h);

    // تحديد الشموع المعروضة (آخر 60 شمعة لتكون واضحة)
    let visibleCount = 60;
    let startIndex = Math.max(0, bars.length - visibleCount - offset);
    let visibleBars = bars.slice(startIndex, startIndex + visibleCount);
    if (visibleBars.length === 0) return;

    let maxP = Math.max(...visibleBars.map(b => b.h));
    let minP = Math.min(...visibleBars.map(b => b.l));
    let pad = (maxP - minP) * 0.1;
    maxP += pad; minP -= pad;
    let rng = maxP - minP || 1;

    let barW = w / visibleCount;
    const getY = (price) => h - ((price - minP) / rng) * h;

    // رسم شبكة خفيفة بالخلفية
    ctx.strokeStyle = '#1F2637';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
        let y = i * (h / 4);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // رسم الشموع اليابانية
    visibleBars.forEach((b, i) => {
        let x = i * barW + barW / 2;
        let yH = getY(b.h);
        let yL = getY(b.l);
        let yO = getY(b.o);
        let yC = getY(b.c);

        let isBull = b.c >= b.o;
        let color = isBull ? '#22C55E' : '#EF4444'; // أخضر للربح وأحمر للخسارة

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1.5;

        // رسم الذيول
        ctx.beginPath();
        ctx.moveTo(x, yH);
        ctx.lineTo(x, yL);
        ctx.stroke();

        // رسم جسم الشمعة
        let bodyY = Math.min(yO, yC);
        let bodyH = Math.max(Math.abs(yO - yC), 2); // أقل سمك 2 بكسل
        ctx.fillRect(x - barW * 0.35, bodyY, barW * 0.7, bodyH);
    });
    
    // رسم خط السعر الحالي (الذهبي المتقطع)
    let lastBar = visibleBars[visibleBars.length - 1];
    let lastY = getY(lastBar.c);
    ctx.strokeStyle = '#F0B90B';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, lastY);
    ctx.lineTo(w, lastY);
    ctx.stroke();
    ctx.setLineDash([]);
}
