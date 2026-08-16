# iraq story game

موقع يعرض شركات الألعاب وبطاقات الألعاب الخاصة بها مع البحث والفرز.

## التقنيات

- HTML5 + JavaScript
- Node.js + Express
- MariaDB
- Capacitor JS

## المتطلبات

- Node.js 18+
- MariaDB Server

## الإعداد

1. انسخ ملف البيئة:

```bash
cp .env.example .env
```

2. عدل معلومات MariaDB في ملف `.env` إذا لزم.

3. شغل MariaDB، ثم شغل السيرفر:

```bash
npm run dev
```

عند التشغيل، السيرفر يحاول إنشاء قاعدة البيانات `game_catalog` والجداول تلقائيًا ثم يضيف بيانات أولية.

## تشغيل الموقع

بعد تشغيل السيرفر:

- الواجهة: `http://localhost:3000`
- API: `http://localhost:3000/api/catalog`
- لوحة الإدارة: `http://localhost:3000/admin`
- تسجيل الدخول للإدارة: `http://localhost:3000/login`

## أوامر Capacitor

```bash
npm run cap:sync
npm run cap:open:android
npm run cap:open:ios
```

ملاحظة: قبل فتح Android أو iOS تأكد من إضافة المنصة أول مرة:

```bash
npx cap add android
npx cap add ios
```

## ميزات المشروع

- عرض بطاقات الشركات (مثل Activision و PUBG و Yalla وغيرها)
- عرض الألعاب داخل كل شركة
- صفحة تفاصيل مستقلة لكل لعبة
- لوحة إدارة محمية بتسجيل دخول لإضافة/تعديل/حذف الشركات والألعاب
- رفع صور الألعاب من الجهاز (بدل رابط URL)
- عرض صور ألعاب حقيقية مع fallback تلقائي
- بحث باسم الشركة أو اللعبة (عربي/إنجليزي)
- فرز الألعاب حسب الاسم أو سنة الإصدار أو الشركة
- الصفحة الرئيسية تعرض بيانات احتياطية محلية إذا تعذر الوصول لـ API

## النشر على Render

1. ارفع المشروع إلى GitHub.
2. في Render أنشئ `Web Service` جديد من نفس الريبو.
3. الإعدادات:

- Build Command: `npm install`
- Start Command: `npm start`
- Environment: `Node`

4. أضف متغيرات البيئة في Render:

- `PORT` (اختياري، Render يمرر تلقائيًا)
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

5. اربط بقاعدة MariaDB خارجية (Render لا يوفر MariaDB مُدار بشكل افتراضي في كل الخطط، لذلك غالبًا ستستخدم مزود خارجي).

## بيانات الدخول الافتراضية للإدارة

- Username: `admin`
- Password: `admin`

غير القيم من `.env` في بيئتك المحلية ومن Render قبل الإنتاج.
