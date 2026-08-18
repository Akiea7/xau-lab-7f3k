export function initLiveConnection(onStatus, onTick, onBalance) {
    const ws = new WebSocket('ws://127.0.0.1:3000');
    ws.onopen = () => console.log('✅ متصل بالسيرفر');
    ws.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.type === 'status') onStatus(data.msg);
            else if (data.type === 'tick') onTick(data);
            else if (data.type === 'balance') onBalance(data.balance);
        } catch (err) {}
    };
    ws.onclose = () => onStatus('❌ السيرفر مغلق');
    ws.onerror = () => onStatus('❌ فشل الاتصال');
    return ws;
}
