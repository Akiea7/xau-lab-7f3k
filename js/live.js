export function initLiveConnection(onStatus, onTick, onBalance) {
    const ws = new WebSocket('ws://127.0.0.1:3000');
    ws.onopen = () => console.log('✅ تم الاتصال بسيرفر Termux المحلي');
    ws.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.type === 'status') onStatus(data.msg);
            else if (data.type === 'tick') {
                // تمرير كائن يحتوي على bid و ask (وإذا كان قديماً نمرر السعر مباشرة)
                onTick(data.bid && data.ask ? data : data.price);
            }
            else if (data.type === 'balance') onBalance(data.balance);
        } catch (err) {}
    };
    ws.onclose = () => onStatus('❌ السيرفر المحلي مغلق');
    ws.onerror = () => onStatus('❌ فشل الاتصال بالسيرفر');
    return ws;
}
