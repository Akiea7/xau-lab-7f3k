/**
 * 📡 جسر الاتصال المباشر (Live Connection)
 * يستقبل الأسعار الحقيقية من السيرفر المحلي عبر WebSocket
 */
export function initLiveConnection(onStatus, onTick, onBalance) {
    const ws = new WebSocket('ws://127.0.0.1:3000');

    ws.onopen = () => {
        console.log('✅ تم الاتصال بسيرفر Termux المحلي');
    };

    ws.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.type === 'status') onStatus(data.msg);
            else if (data.type === 'tick') onTick(data.price);
            else if (data.type === 'balance') onBalance(data.balance);
        } catch (err) {
            console.error('[WS PARSE ERROR]', err);
        }
    };

    ws.onclose = () => onStatus('❌ السيرفر المحلي مغلق (شغل Termux بـ 98)');
    ws.onerror = () => onStatus('❌ فشل الاتصال بالسيرفر');
    
    return ws;
}
