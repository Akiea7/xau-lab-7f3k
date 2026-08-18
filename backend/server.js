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
let marketConnection = null;
let currentPrice = 0;
let currentBalance = 0;

async function initMetaApi() {
    try {
        console.log(`⏳ جاري الاتصال بـ MetaApi للحساب ${accountId}...`);
        const metaApi = new MetaApi(token);
        const account = await metaApi.metatraderAccountApi.getAccount(accountId);

        if (account.state !== 'DEPLOYED') {
            console.log('⏳ جاري نشر الحساب بالبروكر...');
            await account.deploy();
        }

        console.log('⏳ بانتظار استقرار الاتصال...');
        await account.waitConnected().catch(() => {});

        const rpcConnection = account.getRPCConnection();
        await rpcConnection.connect();

        marketConnection = account.getStreamingConnection();
        await marketConnection.connect();
        await marketConnection.waitSynchronized().catch(() => {});

        console.log(`📈 جاري الاشتراك بأسعار ${symbol}...`);
        await marketConnection.subscribeToMarketData(symbol).catch(() => {});

        const info = await rpcConnection.getAccountInformation();
        currentBalance = info.balance;

        marketConnection.addSynchronizationListener({
            onSymbolPriceUpdated: (idx, price) => {
                if (price.symbol === symbol) {
                    currentPrice = price.bid;
                    const msg = JSON.stringify({ type: 'tick', price: currentPrice });
                    clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
                }
            }
        });

        console.log('✅ تم الربط بنجاح وبدء بث الأسعار!');
    } catch (err) {
        console.error('❌ خطأ في الاتصال:', err.message);
    }
}

// تشغيل الاتصال فور تشغيل السيرفر
initMetaApi();

wss.on('connection', (ws) => {
    clients.push(ws);
    console.log('📱 واجهة جديدة اتصلت بالسيرفر');
    
    ws.send(JSON.stringify({ type: 'status', msg: '✅ متصل (LIVE)' }));
    if (currentBalance) ws.send(JSON.stringify({ type: 'balance', balance: currentBalance }));
    if (currentPrice) ws.send(JSON.stringify({ type: 'tick', price: currentPrice }));

    ws.on('message', async (message) => {
        try {
            const req = JSON.parse(message);
            if (req.type === 'execute_trade' && marketConnection) {
                let result = req.action === 'BUY'
                    ? await marketConnection.createMarketBuyOrder(symbol, req.lots || 0.01, req.sl, req.tp)
                    : await marketConnection.createMarketSellOrder(symbol, req.lots || 0.01, req.sl, req.tp);
                ws.send(JSON.stringify({ type: 'trade_result', success: true, result }));
            }
        } catch (err) {
            ws.send(JSON.stringify({ type: 'trade_result', success: false, error: err.message }));
        }
    });

    ws.on('close', () => { clients = clients.filter(c => c !== ws); });
});
