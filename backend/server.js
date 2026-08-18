require('dotenv').config();
const express = require('express');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const MetaApi = require('metaapi.cloud-sdk').default;

const app = express();
const port = 3000;
app.use(cors());

const server = app.listen(port, () => console.log(`🚀 السيرفر يعمل على المنفذ ${port}`));
const wss = new WebSocketServer({ server });

const token = process.env.META_API_TOKEN;
const accountId = process.env.ACCOUNT_ID;
const symbol = process.env.SYMBOL || 'XAUUSD';

let clients = [];

async function initMetaApi() {
    try {
        if (!token || !accountId) return console.log('⚠️ بانتظار إعداد ملف .env');
        const metaApi = new MetaApi(token);
        const account = await metaApi.metatraderAccountApi.getAccount(accountId);
        if (account.state !== 'DEPLOYED') await account.deploy();
        await account.waitConnected().catch(() => {});

        const rpcConnection = account.getRPCConnection();
        await rpcConnection.connect();

        const marketConnection = account.getStreamingConnection();
        await marketConnection.connect();
        await marketConnection.waitSynchronized().catch(() => {});
        await marketConnection.subscribeToMarketData(symbol).catch(() => {});

        // جلب وإرسال الرصيد الفعلي
        const info = await rpcConnection.getAccountInformation();
        const sendBalance = () => {
            const msg = JSON.stringify({ type: 'balance', balance: info.balance });
            clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
        };
        setInterval(sendBalance, 10000); // تحديث الرصيد كل 10 ثواني

        marketConnection.addSynchronizationListener({
            onSymbolPriceUpdated: (idx, price) => {
                if (price.symbol === symbol) {
                    // استخراج آمن للـ Bid والـ Ask
                    const b = price.bid || price || 0;
                    const a = price.ask || price || 0;
                    const msg = JSON.stringify({ type: 'tick', bid: b, ask: a });
                    clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
                }
            }
        });
        console.log('✅ تم الربط بنجاح وبدء بث الأسعار!');
    } catch (err) { console.error('❌ خطأ في الاتصال:', err.message); }
}
initMetaApi();

wss.on('connection', (ws) => {
    clients.push(ws);
    ws.send(JSON.stringify({ type: 'status', msg: '✅ متصل (LIVE)' }));
    ws.on('close', () => { clients = clients.filter(c => c !== ws); });
});
