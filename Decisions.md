# 🔍 Project Decisions & Architecture Constraints

This document records the implementation decisions that are actually used by the Iraq Story Game project as of 2026-09-09. It is the source of truth for architecture and behavior. If a feature request conflicts with this document, it must be called out explicitly.

---

## 1) Project Scope

This project is a storefront and admin panel for selling game products and related digital offers. It is implemented as a Node.js + Express application with static HTML pages, server-side API routes, and a JSON fallback dataset used when the database is unavailable.

The project currently supports:
- public storefront browsing
- search and sorting of company/game catalog
- cart and checkout flow via localStorage
- coupon validation
- admin login and protected routes
- game/company CRUD for the admin dashboard
- image upload support for products
- runtime data fallback files under `data/`
- Android wrap via Capacitor

---

## 2) Data Model

### 2.1 Company Model
Each company is a container for games and has the following primary fields:
- `id` — numeric unique identifier
- `slug` — URL-safe slug
- `name_ar` — Arabic display name
- `name_en` — English display name
- `games` — array of game objects

Company records are stored in:
- database tables when DB is initialized
- fallback JSON data in `data/fallback-data.json`

### 2.2 Game Model
Supported game fields in the runtime implementation include:
```json
{
  "id": 101,
  "company_id": 1,
  "product_type": "game",
  "product_subtype": null,
  "name_ar": "اسم اللعبة",
  "name_en": "Game Name",
  "genre": "Shooter",
  "release_year": 2023,
  "price": 179,
  "currency": "IQD",
  "cover_image_url": "/uploads/filename.jpg",
  "description": "وصف اللعبة"
}
```

Notes:
- `product_type` is treated as `game` in the current app, but the code supports other values and keeps the field nullable/optional in payloads.
- `product_subtype` is accepted by admin create/update endpoints but is not the primary catalog filter in the public UI.
- `cover_image_url` may be a remote URL or a local uploaded file path.

### 2.3 Supported Catalog Types
The implemented code supports the catalog values used in practice:
- `game`
- `subscription` (allowed by schema and fallback data handling)
- legacy/optional values may still exist in existing data, but public storefront logic generally expects game-oriented entries

The public filter logic uses `product_type` values as part of API requests, but it also performs client-side filtering for `playstation`, `xbox`, and `deals` in the browser when needed.

---

## 3) Storage Architecture

### 3.1 Primary Runtime Data Sources
The application selects its data layer based on environment and database startup:
- SQLite is the default local/fallback store
- PostgreSQL support is available via `pg` and `db.js`
- JSON files in `data/` are used for fallback and runtime admin settings

### 3.2 Runtime Files
The app writes/reads the following files during runtime:
- `data/fallback-data.json` — fallback catalog
- `data/admin-settings.json` — admin credentials/settings
- `data/coupons.json` — coupon records
- `data/today-offers.json` — offer records
- `public/uploads/` — uploaded product images

Important: these files are runtime state, not just static fixtures.

---

## 4) Authentication and Admin Protection

### 4.1 Admin Identity Model
- Authentication is session-based using `express-session`
- Session cookie name: `igs_session`
- Session flag: `req.session.isAdmin === true`
- Default admin credentials are:
  - username: `admin`
  - password: `admin`
- Values may be overridden by environment variables `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `SESSION_SECRET`

### 4.2 Protection Rules
The server enforces admin restrictions using `requireAdmin` and route guards:
- `/admin`
- `/admin.html`
- `/change-password.html`
- `/admin.js`
- `/admin-assets/admin.js`
- `/admin/password`

Unauthenticated access to protected admin resources returns a 404 or 401 depending on route type.

### 4.3 Security Hardening Already Implemented
- `helmet` middleware enabled with CSP relaxed to avoid breaking the app
- rate limiting on `/api` and `/api/auth/login`
- IP-based login lockout with `LOGIN_MAX_ATTEMPTS` and `LOGIN_LOCK_MS`
- CSRF token handling for mutating requests via `/api/csrf-token`
- session cookies use `httpOnly`, `sameSite: 'lax'`, and `secure` in production

---

## 5) Catalog and Search Behavior

### 5.1 Public Catalog Endpoint
Public API endpoint:
- `GET /api/catalog`

Supported query parameters:
- `search`
- `sort`
- `product_type`

Behavior:
- if the database is ready, data comes from the DB layer
- if DB is not ready, fallback catalog is served from `data/fallback-data.json`
- `product_type` may be used as a server-side filter when values are valid
- additional non-server filters such as `playstation`, `xbox`, and `deals` are handled client-side by the browser

### 5.2 Search Strategy
Search works against catalog fields such as:
- company name in Arabic/English
- game name in Arabic/English
- genre
- maybe product type and other text fields depending on DB implementation

---

## 6) Cart and Checkout

### 6.1 Cart Storage
- client-side cart stored in `localStorage`
- key used by the app: `iraqGameCart`
- stored structure is effectively a list of cart entries with item id, quantity, name, and price

### 6.2 Checkout Review
The app saves checkout-related data into localStorage before redirecting to the review page. This includes cart and discount data and then constructs a WhatsApp message for customer purchase confirmation.

### 6.3 Coupon Validation
- coupon validation endpoint: `POST /api/coupons/validate`
- the server checks the supplied code against the active coupons list
- coupon percentage is returned and used during checkout review

---

## 7) Today's Offers and Promotions

### 7.1 Data Model
The runtime current offer structure is:
```json
{
  "id": "offer-...",
  "title": "عرض اليوم",
  "product_type": "game",
  "percent": 20,
  "price": 0,
  "active": true,
  "created_at": "2026-09-09T00:00:00.000Z"
}
```

### 7.2 Endpoints
- `GET /api/today-offers`
- `POST /api/today-offers` (admin only)
- `DELETE /api/today-offers/:id` (admin only)

### 7.3 Access Rule
- Admin users can fetch active and inactive items
- Public users see only active offers

---

## 8) Admin CRUD Operations

The current implementation exposes the following admin API operations:

### 8.1 Companies
- `GET /api/companies`
- `POST /api/companies`
- `PUT /api/companies/:id`
- `DELETE /api/companies/:id`

### 8.2 Games
- `GET /api/games/:id`
- `POST /api/games`
- `PUT /api/games/:id`
- `DELETE /api/games/:id`

### 8.3 Coupons
- `GET /api/coupons`
- `POST /api/coupons`
- `DELETE /api/coupons/:code`
- `POST /api/coupons/validate`

### 8.4 Settings
The server includes settings handling for admin configuration and is intended to support WhatsApp settings and store metadata stored in JSON.

---

## 9) Frontend Structure

### 9.1 Public UI
Frontend pages served from `public/`:
- `/` and `/index.html`
- `/game`
- `/checkout-review.html`
- `/login`
- `/contact`
- `/cart`

### 9.2 Admin UI
Admin pages and assets:
- `/admin`
- `/admin.html`
- `/change-password.html`
- `/admin.js` or `/admin-assets/admin.js`

The admin dashboard is driven by `server_assets/admin.js` and uses the authenticated session to fetch and modify backend state.

---

## 10) Technology Stack

### Backend
- Node.js
- Express.js
- express-session
- express-rate-limit
- csrf
- multer
- helmet
- PostgreSQL client support (`pg`)
- SQLite support via `sql.js`

### Frontend
- static HTML
- plain JavaScript
- CSS styling in `public/styles.css`
- localStorage for cart and language state

### Mobile Packaging
- Capacitor Android/iOS integration via `@capacitor/android`, `@capacitor/cli`, and the Android project under `/android`

---

## 11) Deployment and Runtime Constraints

### 11.1 Production Runtime
The production deployment requires the app to run correctly from its project directory and to bind to `0.0.0.0` for compatibility with reverse proxies or container networking.

Important operational rule:
- when restarting with PM2 or similar process managers, the app must be started from the project directory or with `--cwd` configured so Node resolves modules correctly

### 11.2 Common Deployment Considerations
- `PORT` may be supplied by the environment
- `SESSION_SECRET` must be set in production
- admin credentials should be changed from default values in non-local environments
- `NODE_ENV=production` enables production cookie settings

### 11.3 Current Verified Runtime Notes
- server startup checks DB initialization and falls back gracefully when DB initialization fails
- public pages still load even when database access is unavailable
- fallback JSON files keep the storefront operational in degraded mode

---

## 12) Current Rules for Future Changes

1. Do not assume a feature exists unless it is implemented in the server or frontend code.
2. When changing the data model, update both the database logic and the JSON fallback logic.
3. Protected admin files must remain behind session checks.
4. Any new API route should be documented in the server contract and mirrored in the frontend if it is used by the UI.
5. Any change to auth, session, or permission logic must preserve the currently enforced admin guard.
6. When editing the app for deployment, keep the startup path and PM2/CWD behavior consistent with production requirements.

---

## 13) Recent Production Notes (2026-09-09)

- session-based admin access remains the primary security mechanism
- admin pages are protected by guarded route handlers instead of relying only on static HTML checks
- CSRF protection is now applied to relevant mutating endpoints without breaking the app’s public/static access pattern
- the server keeps a graceful fallback to local JSON data when DB initialization is unavailable
- login throttling and session hardening have been added to reduce brute-force abuse and insecure session behavior

This document should be updated whenever architecture changes are introduced so the repo stays aligned with the real implementation.
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
