# 🔍 Project Decisions & Architecture Constraints

This document defines all key decisions made in the Iraq Game Store project. **DO NOT invent details or guess implementation specifics that aren't documented here.** If you encounter a feature request that conflicts with these decisions, flag it explicitly.

---

## 📦 Data & Content Model

### Product Types (Valid Values ONLY)
- **game** - Standard games and video games
- **subscription** - Recurring/monthly services (PlayStation Plus, Xbox Game Pass, ChatGPT Plus, etc.)
- **REJECTED**: Digital books, music, movies, courses (use games/subscriptions only)

### Company Structure
- Companies are containers for products
- Each company has an `id`, `slug`, `name_ar`, `name_en`, and list of games/products
- Companies are rendered as cards with a company name, icon/emoji, and count of items
- **No sub-categories within companies** - all items are flat lists per company

### Product Fields (Required)
```json
{
  "id": "unique integer",
  "name_ar": "Arabic name",
  "name_en": "English name",
  "product_type": "game|subscription",
  "genre": "Category/Type",
  "release_year": "number",
  "price": "number (price in currency)",
  "currency": "IQD|USD",
  "description": "Text",
  "cover_image_url": "URL"
}
```

### Languages Supported
- **Arabic (ar)** - Right-to-left (RTL), default language
- **English (en)** - Left-to-right (LTR)
- **Toggle via UI button** - "AR / EN" button in header
- **Persistence** - Language choice stored in `localStorage` as `iraqGameLanguage`
- **No database translation** - all text stored as `name_ar` and `name_en` fields

---

## 🛒 Cart & Checkout Flow

### Cart Storage
- **Location**: `localStorage` key `iraqGameCart`
- **Format**: JSON array of `{ id, qty, name, price }`
- **Persistence**: Across page reloads
- **Max Items**: No limit (UX decision: show all items in panel)

### Cart Operations
1. **Add to Cart**
   - Updates `cart` array in memory
   - Increments `qty` if item already exists
   - Saves to `localStorage`
   - Updates cart count badge immediately
   
2. **View Cart**
   - Click "السلة" button in header
   - Opens floating panel showing all items
   - Displays item name + quantity + price

3. **Checkout Flow**
   - Click "إتمام الطلب" button
   - Saves cart + discount info to `localStorage` under `iraqGameCheckoutReview`
   - Redirects to `/checkout-review.html`
   - User fills customer form (name, phone, email, notes)
   - Click "إتمام الشراء عبر WhatsApp" button
   - Opens WhatsApp with formatted message
   - Clears cart and review data from `localStorage`

### Coupon/Discount System
- **Storage**: `iraqGameCoupon` (code), `iraqGameDiscountPercent` (number 0-100)
- **Validation**: `/api/coupons/validate` endpoint
- **Application**: Discount shown on checkout-review page
- **WhatsApp Message**: Includes original price, discount amount, and final total

---

## 🎨 Category Filtering

### Valid Categories (Client-Side Matching)
```javascript
{
  'all': 'Show all companies',
  'games': 'Filter to product_type === "game"',
  'subscriptions': 'Filter to product_type === "subscription"',
  'playstation': 'Client-side: matches product_name or genre containing "PlayStation|PS"',
  'xbox': 'Client-side: matches product_name or genre containing "Xbox|XB"',
  'deals': 'Show products from today-offers.json only'
}
```

### API Filtering Rule
- **Server supports only**: `product_type=all|game|subscription`
- **Client-side handles**: `playstation`, `xbox`, `deals` (NO server filtering)
- **Implementation**: 
  - Send only valid `product_type` values to `/api/catalog`
  - For non-server categories, fetch full catalog and filter in browser using `filterCompaniesByCategory()`

---

## 📢 Today's Offers

### Data Structure
- **File**: `data/today-offers.json` (runtime, not in version control)
- **Format**: 
```json
{
  "offers": [
    {
      "id": "uuid",
      "title": "Custom offer name (e.g., 'سوبر بلص')",
      "product_type": "game|subscription|all",
      "percent": "discount percentage",
      "price": "alternative price (optional)",
      "createdAt": "timestamp"
    }
  ]
}
```

### Admin Panel (Today's Offers)
- Form with fields:
  - Custom Title (text input)
  - Product Type (dropdown: game, subscription, all)
  - Discount Percent (number input)
  - (Optional) Select existing product as reference
- **Edit**: Click on an offer to load into form
- **Delete**: Remove button beside each offer
- **Save**: POST to `/api/today-offers`
- **Empty State**: If no offers, show nothing (not "Best offers" label)

---

## 💳 Admin Panel & Authentication

### Admin Auth
- **Location**: Express session-based
- **Default Credentials**: username=`admin`, password=`admin` (env configurable)
- **Session Key**: `express-session` middleware
- **Protected Routes**: Any endpoint with `requireAdmin` middleware

### Admin Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin` | Admin dashboard HTML |
| POST | `/api/auth/login` | Login (sets session) |
| POST | `/api/auth/logout` | Logout (clears session) |
| GET | `/api/auth/status` | Check auth status |
| POST | `/api/auth/change-password` | Change admin password |
| GET/POST/DELETE | `/api/coupons` | Manage coupons |
| GET/POST/DELETE | `/api/today-offers` | Manage today's offers |
| GET | `/api/admin/settings` | Read WhatsApp number & config |
| POST | `/api/admin/settings` | Update settings |

### Settings Storage
- **File**: `data/admin-settings.json`
- **Keys**:
  - `whatsappNumber`: Phone number for WhatsApp integration (format: +964xxxxxxxxx)
  - `storeName`: Store name (optional, for future use)
  - `currency`: Default currency (IQD|USD)

---

## 📡 API Endpoints Reference

### Catalog & Product Endpoints
| Endpoint | Method | Query Params | Purpose |
|----------|--------|--------------|---------|
| `/api/catalog` | GET | `search`, `sort`, `product_type` | Fetch companies & games |
| `/api/games/:id` | GET | - | Get single game details |
| `/api/companies` | GET | - | List all companies (admin) |

### Today's Offers Endpoints
| Endpoint | Method | Body | Purpose |
|----------|--------|------|---------|
| `/api/today-offers` | GET | - | Fetch all offers |
| `/api/today-offers` | POST | `{ title, product_type, percent, price }` | Create/update offer |
| `/api/today-offers/:id` | DELETE | - | Delete offer |

### Checkout Endpoint
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/checkout-review` | GET | Serve checkout review page (static HTML) |

### Authentication Endpoints
| Endpoint | Method | Body | Purpose |
|----------|--------|------|---------|
| `/api/auth/login` | POST | `{ username, password }` | Login |
| `/api/auth/logout` | POST | - | Logout |
| `/api/auth/status` | GET | - | Check if logged in |

### Coupon Endpoints
| Endpoint | Method | Body | Purpose |
|----------|--------|------|---------|
| `/api/coupons` | GET | - | List all coupons (admin) |
| `/api/coupons` | POST | `{ code, percent, maxUses }` | Create coupon |
| `/api/coupons/:code` | DELETE | - | Delete coupon |
| `/api/coupons/validate` | POST | `{ code }` | Validate & apply coupon |

---

## 🌐 Frontend Routes

| Path | Purpose | Auth Required |
|------|---------|----------------|
| `/` | Main storefront | No |
| `/index.html` | Main storefront (explicit) | No |
| `/admin` | Admin dashboard | Yes |
| `/admin.html` | Admin dashboard (explicit) | Yes |
| `/checkout-review.html` | Order review page | No |
| `/game?id=:id` | Game detail page | No |
| `/login.html` | Login page | No |
| `/change-password.html` | Change password page | Yes |

---

## 🔧 Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Session**: `express-session`
- **Database**: SQLite (fallback) + PostgreSQL (production-ready via `db.js`)
- **File-based Config**: JSON files in `data/` directory

### Frontend
- **HTML5** (no build step)
- **Vanilla JavaScript** (no frameworks)
- **CSS3** (dark theme, premium app-store style)
- **localStorage** for client-side state

### Styling Philosophy
- **Dark theme**: `#1a1a2e` background, `#00d4ff` accent
- **Premium look**: Similar to Steam/PlayStation Store
- **Responsive**: Mobile-first approach
- **RTL Support**: Full Arabic support with `dir="rtl"`

---

## 🔁 تحديثات النشر والتشغيل (Recent Deployment & Fixes) — 2026-09-07

- إصلاح مشكلة 502 Bad Gateway: الخادم الآن يستمع على `0.0.0.0` و`nginx` يوجّه إلى `127.0.0.1:3000` لضمان توافق IPv4.
- تمّ إضافة/استعادة نقاط نهاية الإدارة والكتالوج التي يحتاجها واجهة `admin`:
  - `GET /api/companies` (admin)
  - `POST /api/companies`, `PUT /api/companies/:id`, `DELETE /api/companies/:id`
  - `GET /api/catalog` (public) مع دعم `search`, `sort`, `product_type`
  - `GET /api/games/:id`, `POST /api/games`, `PUT /api/games/:id`, `DELETE /api/games/:id`
- إضافة مسار مساعد: `/admin/password` يُعيد توجيه مصادقًا إلى صفحة تغيير كلمة المرور (يتطلب جلسة أدمن).
- حماية ملفات الموارد الإدارية: `admin.js`, `change-password.js` تُقدّم عبر مسارات محمية وتعيد 401 إذا لم يكن `req.session.isAdmin`.
- تحسينات أمان وتشغيل:
  - قفل محاولات تسجيل الدخول على مستوى IP: `LOGIN_MAX_ATTEMPTS` (افتراضي 5) و`LOGIN_LOCK_MS` (افتراضي 10 دقيقة).
  - إعدادات الكوكي: `HttpOnly`, `SameSite=Lax`, و`secure` في بيئة الإنتاج.
  - إعادة تشغيل pm2 يجب أن تستخدم `--cwd /var/www/iraqstorycard.tech` أو بدء العملية من مسار المشروع لإصلاح أخطاء MODULE_NOT_FOUND.

### أوامر مفيدة (على الخادم)
```bash
# إعادة تشغيل الخدمة (pm2)
sudo pm2 restart iraq-story --cwd /var/www/iraqstorycard.tech -f

# فحص الصحة محلياً
curl -si http://127.0.0.1:3000/api/health

# اختبار نقاط النهاية من الخارج
curl -si https://www.iraqstorycard.tech/api/catalog
curl -si https://www.iraqstorycard.tech/admin/password
```

### أماكن الملفات المهمة
- خادم التطبيق: `/var/www/iraqstorycard.tech/server.js`
- سكربتات ونسخة التطوير: `/home/kali/Desktop/card game/server.js` (مصدر التعديل)
- إعدادات الأدمن: `data/admin-settings.json`
- بيانات fallback: `data/fallback-data.json`
- كوبونات: `data/coupons.json`
- رفع الملفات: `public/uploads/` (ملفات الصور)

### ملاحظات تشغيل/اختبار
- بعد تسجيل الدخول كأدمن (واجهة الويب)، افتح `/admin` أو `/admin.html` لعرض وإدارة الشركات والألعاب.
- واجهة الإدارة تعتمد على أن تكون الجلسة صالحة (cookie `connect.sid` مع `credentials:'same-origin'` من الواجهة).
- إذا لم تظهر البيانات في الواجهة، تحقق ما إذا كان الخادم يعمل في وضع قاعدة بيانات (database mode) أم وضع fallback (JSON files). راجع `databaseReady` في `/api/health`.

إذا رغبت، أستطيع إضافة مقطع "How-to rollback" أو سكربت نشر آمن (pm2 ecosystem file + logrotate) لاحقًا.

---

## 🛠️ How-to rollback & نشر آمن

نُشرنا سكربتات مساعدة داخل `scripts/` لتسهيل النشر والتراجع على الخادم **من داخل مجلد المشروع** (`/var/www/iraqstorycard.tech`).

- `scripts/deploy.sh`: يسحب آخر تغييرات من الريبو، يثبت الحزم بالإعداد الإنتاجي ثم يعيد تحميل أو بدء عمليات `pm2` عبر `ecosystem.config.js`.
- `scripts/rollback.sh`: يحاول التراجع عن الكوميت الأخير (`git revert`) أو إعادة التعيين إلى `HEAD~1` إن فشل، ثم يعيد تثبيت الحزم وإعادة تحميل `pm2`.

التشغيل (على الخادم، من مجلد المشروع):
```bash
# افتراضي: اذهب إلى مسار المشروع
cd /var/www/iraqstorycard.tech

# تنفيذ نشر
sudo ./scripts/deploy.sh

# تنفيذ تراجع
sudo ./scripts/rollback.sh
```

ملاحظة أمان: هذه سكربتات بسيطة ومصممة لتشغيل في بيئة تحكم فيها بالخادم. إذا أردت، أستطيع تحويلها إلى خطوات أكثر أمناً (تحقق من العلامة الرقمية للتغييرات، حفظ نسخة احتياطية من الملفات الحساسة، استخدام CI/CD).

---

## ⚙️ Environment & Configuration

### Environment Variables
- `PORT` - Server port (default: 3000)
- `ADMIN_USERNAME` - Admin login username (default: admin)
- `ADMIN_PASSWORD` - Admin login password (default: admin)
- `SESSION_SECRET` - Express session secret key
- `NODE_ENV` - `development` or `production`

### Data Files (Do NOT version control)
- `data/admin-settings.json` - Runtime config
- `data/today-offers.json` - Runtime offers
- `data/fallback-data.json` - Offline catalog (auto-generated)
- `data/coupons.json` - Coupon list

### Persistence Mode & Sync (Important)

- The server can run in two modes: **database mode** (preferred for production) and **fallback (JSON) mode** used for development or when the DB isn't available.
- Control mode with environment variable: `SKIP_DB=true` forces fallback (JSON) mode. When `SKIP_DB` is not set, `server.js` attempts to initialize the DB via `initDatabase()` and sets `databaseReady=true` on success.
- If the server is in database mode, it will serve data from the DB and ignore live changes in `data/fallback-data.json`. This causes the appearance of different companies when the admin edits JSON files but the server is running against the DB.

Recommendation / Workflow:

1. Decide which runtime you'll use consistently (DB or JSON). Document that decision in this file and in `Project-Map-Tree.md`.
2. To make JSON edits visible in DB mode, run the import script `node scripts/import-fallback-to-db.js` to copy `data/fallback-data.json` into the DB, then restart the server.
3. For quick development edits, start the server with `SKIP_DB=true`:

```bash
SKIP_DB=true node server.js
```

4. After any import or DB migration, restart the server to pick up the updated DB content.

Utility script:
- `scripts/import-fallback-to-db.js` — imports `data/fallback-data.json` into the configured DB (SQLite by default). Use it when you want the DB to reflect the JSON edits.

This section explains the cause of mismatched data and the safe steps to keep DB and JSON in sync.

---

## 🚫 REJECTED / NOT IMPLEMENTED

### Feature Requests That Will NOT Be Added
- **Multi-user accounts** - Admin only, single password
- **Inventory tracking** - No stock management
- **Payment integration** - WhatsApp checkout only (no Stripe/PayPal)
- **Email notifications** - WhatsApp only
- **Product recommendations** - No AI/ML
- **Wishlist/Favorites** - Cart-only approach
- **Product reviews/ratings** - Not supported
- **Multiple currencies in cart** - Mixed IQD/USD carts NOT supported
- **Bulk admin upload** - Manual entry via admin panel only
- **Google OAuth login** - Admin login only
- **Dark mode toggle** - Always dark theme
- **Product variants** - Single price per product
- **Affiliate system** - Not supported
- **Customer accounts** - Checkout guest-only approach

---

## 📋 Future Considerations (Not Yet Implemented)

- [ ] Multi-language admin panel (currently English-only in admin)
- [ ] Product image upload (currently URL-only)
- [ ] Advanced analytics
- [ ] Scheduled offers (time-limited offers)
- [ ] Product tags/metadata
- [ ] Gift cards
- [ ] Referral system

---

**Last Updated**: 2026-08-25  
**Version**: 1.0  
**Maintained by**: AI Assistant + User Requirements
