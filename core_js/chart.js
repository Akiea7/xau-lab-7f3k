/**
 * 📈 محرك الرسم البياني الاحترافي (XAU Precision Chart)
 * يدعم رسم الشموع، المؤشرات (EMAs)، وخطوط الصفقات المفتوحة (SL/TP)
 */
export function drawCandles(canvas, data, indicators, maxVisible = 100, offset = 0, signals = [], openTrade = null, hover = null) {
    if (!canvas || !data || data.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    
    // ضبط أبعاد الـ Canvas ليتجاوب مع حجم الشاشة
    const container = canvas.parentElement;
    const W = canvas.width = container.clientWidth || window.innerWidth - 40;
    const H = canvas.height = 350; // ارتفاع ثابت ومناسب للموبايل

    ctx.clearRect(0, 0, W, H);

    // 1. اقتطاع البيانات المرئية فقط (حسب الـ maxVisible والـ offset)
    const end = Math.max(0, data.length - 1 - offset);
    const start = Math.max(0, end - maxVisible + 1);
    const visibleData = data.slice(start, end + 1);
    const visibleInd = indicators ? indicators.slice(start, end + 1) : [];

    if (visibleData.length === 0) return;

    // 2. حساب أعلى وأقل سعر لضبط مقياس الرسم (Y-Scale)
    let minPrice = Infinity, maxPrice = -Infinity;
    visibleData.forEach(b => { 
        if (b.l < minPrice) minPrice = b.l; 
        if (b.h > maxPrice) maxPrice = b.h; 
    });
    
    // تضمين خطوط الصفقة المفتوحة في المقياس حتى لا تخرج خارج الشاشة
    if (openTrade) {
        if (openTrade.sl < minPrice) minPrice = openTrade.sl;
        if (openTrade.tp > maxPrice) maxPrice = openTrade.tp;
        const entry = openTrade.actualEntry || openTrade.entry;
        if (entry < minPrice) minPrice = entry;
        if (entry > maxPrice) maxPrice = entry;
    }

    const padding = (maxPrice - minPrice) * 0.1 || 1; // هامش علوي وسفلي 10%
    minPrice -= padding; 
    maxPrice += padding;
    const priceRange = maxPrice - minPrice;

    // دوال تحويل السعر والوقت إلى إحداثيات (X, Y)
    const getY = (price) => H - ((price - minPrice) / priceRange) * H;
    const spacing = W / maxVisible;
    const candleWidth = Math.max(1, spacing * 0.7);

    // 3. رسم المؤشرات (EMA 21 و EMA 50)
    if (visibleInd.length > 0) {
        const drawLine = (key, color) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            let started = false;
            for (let i = 0; i < visibleInd.length; i++) {
                const val = visibleInd[i][key];
                if (val !== null && val !== undefined) {
                    const x = i * spacing + (spacing / 2);
                    const y = getY(val);
                    if (!started) { ctx.moveTo(x, y); started = true; }
                    else { ctx.lineTo(x, y); }
                }
            }
            ctx.stroke();
        };
        drawLine('e21', '#38BDF8'); // EMA 21 أزرق فاتح
        drawLine('e50', '#A855F7'); // EMA 50 بنفسجي
    }

    // 4. رسم الشموع اليابانية (Candlesticks)
    for (let i = 0; i < visibleData.length; i++) {
        const b = visibleData[i];
        const x = i * spacing + (spacing / 2);
        const yH = getY(b.h), yL = getY(b.l), yO = getY(b.o), yC = getY(b.c);
        const isBull = b.c >= b.o;
        const color = isBull ? '#22C55E' : '#EF4444'; // أخضر أو أحمر

        // رسم الذيل (Wick)
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yH);
        ctx.lineTo(x, yL);
        ctx.stroke();

        // رسم الجسم (Body)
        const bodyY = Math.min(yO, yC);
        const bodyH = Math.max(Math.abs(yO - yC), 1); // ضمان ظهور جسم حتى لو فتح وأغلق بنفس السعر
        ctx.fillStyle = color;
        ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyH);
    }

    // 5. رسم خطوط الصفقات المفتوحة (إن وجدت)
    if (openTrade) {
        const drawLevel = (price, color, label) => {
            const y = getY(price);
            
            // رسم الخط المنقط
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
            ctx.setLineDash([]); // إعادة الضبط
            
            // رسم النص التوضيحي (Label)
            ctx.fillStyle = color;
            ctx.font = 'bold 10px Arial';
            ctx.fillText(`${label}: ${price.toFixed(2)}`, 5, y - 5);
        };
        
        const entryPrice = openTrade.actualEntry || openTrade.entry;
        drawLevel(entryPrice, '#F0B90B', 'ENTRY'); // ذهبي للدخول
        drawLevel(openTrade.sl, '#EF4444', 'SL');   // أحمر للوقف
        drawLevel(openTrade.tp, '#22C55E', 'TP');   // أخضر للهدف
    }

    // 6. رسم خط السعر الحالي (Current Price Line)
    const lastBar = visibleData[visibleData.length - 1];
    const lastY = getY(lastBar.c);
    
    ctx.strokeStyle = '#F0B90B';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(0, lastY);
    ctx.lineTo(W, lastY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // مربع السعر على اليمين
    ctx.fillStyle = '#F0B90B';
    ctx.fillRect(W - 55, lastY - 10, 55, 20);
    ctx.fillStyle = '#080B12';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(lastBar.c.toFixed(2), W - 50, lastY + 4);
}
