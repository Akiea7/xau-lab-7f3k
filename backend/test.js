require('dotenv').config();
console.log("-----------------------------------");
console.log("🔍 جاري فحص النظام والمعلومات...");
console.log("-----------------------------------");

const token = process.env.META_API_TOKEN;
const accountId = process.env.ACCOUNT_ID;

if (!token || !accountId || token.includes('هنا_خلي')) {
  console.log("❌ المشكلة: التوكن أو الآيدي ممكتوب بشكل صحيح بملف .env!");
  console.log("تأكد إنك خليت معلوماتك الحقيقية بدون مسافات.");
  process.exit();
}

console.log("✅ 1. التوكن والآيدي موجودات بالملف.");
console.log("⏳ 2. جاري فحص الاتصال بسيرفرات MetaApi...");

const MetaApi = require('metaapi.cloud-sdk').default;
const api = new MetaApi(token);

api.metatraderAccountApi.getAccount(accountId)
  .then(account => {
     console.log("✅ 3. الاتصال بحسابك ناجح 100%!");
     console.log("حالة الحساب حالياً: " + account.state);
     console.log("🎉 النظام سليم، تكدر تشغل السيرفر بـ 98 وأنت مطمن.");
     process.exit(0);
  })
  .catch(err => {
     console.log("❌ المشكلة: خطأ بالاتصال بحسابك! السبب اللي رجعته الشركة هو:");
     console.error(err.message);
     process.exit(1);
  });
