# 🗺️ Iraq Story Game - Project Map & Architecture

## 1) Runtime Layout Overview

```text
┌───────────────────────────────────────────────────────────────┐
│                    Iraq Story Game Project                    │
└───────────────────────────────────────────────────────────────┘

      Browser / Mobile app
              │
              ▼
    Node.js + Express server (server.js)
              │
      ┌───────┼───────────────────────────────────────┐
      │       │                                       │
      ▼       ▼                                       ▼
  Public web app  Admin routes + APIs              Data layer
  (public/*)      (protected routes)                (db.js + JSON files)
      │       │                                      │
      │       ├──── auth/session/security            │
      │       ├──── catalog/companies/games         │
      │       ├──── coupons/offers                  │
      │       └──── uploads/media                  │
      │
      ▼
  SQLite / PostgreSQL / JSON fallback
```

---

## 2) Repository Structure

```text
.
├── android/                        # Capacitor Android project
├── artifacts/                     # build or report artifacts
├── data/                          # runtime JSON data files
│   ├── admin-settings.json
│   ├── coupons.json
│   ├── fallback-data.json
│   └── today-offers.json
├── public/                        # storefront and static pages
│   ├── 403.html
│   ├── 404.html
│   ├── admin.html
│   ├── app.js
│   ├── cart.html
│   ├── cart.js
│   ├── change-password.html
│   ├── change-password.js
│   ├── contact.html
│   ├── game.html
│   ├── game.js
│   ├── index.html
│   ├── login.html
│   ├── login.js
│   ├── styles.css
│   ├── uploads/                  # uploaded product images
│   └── ...
├── scripts/                       # deployment and migration scripts
│   ├── deploy.sh
│   ├── import-fallback-to-db.js
│   ├── migrate-sqlite-to-postgres.js
│   ├── reset-render-db.sql
│   ├── rollback.sh
│   ├── seed-postgres.js
│   └── visual-test.js
├── server_assets/                 # server-served admin logic
│   └── admin.js
├── sql/                           # SQL setup scripts
│   └── init.sql
├── .env.example                   # env template (if present in project)
├── capacitor.config.json
├── cookie.txt
├── db.js                          # database layer and catalog logic
├── Decisions.md
├── ecosystem.config.js
├── package.json
├── Project-Map-Tree.md
├── README.md
├── server.js                      # Express app entry point
└── ...
```

---

## 3) Major Runtime Components

### Public storefront
This part is served by `public/` and delivered through static routes in `server.js`:
- `/` and `/index.html`
- `/game`
- `/contact`
- `/cart`
- `/login`

The main storefront logic is centered around:
- `public/app.js` → catalog rendering, cart flow, search/filter logic, language switching
- `public/game.js` → single-game details page logic
- `public/styles.css` → dark theme, responsive layout, RTL styling

### Admin panel
Admin pages are protected and served from:
- `/admin`
- `/admin.html`
- `/change-password.html`
- `/admin/password`

The admin UI logic is in:
- `server_assets/admin.js`

This file manages:
- company CRUD
- game CRUD with image upload support
- coupon management
- offer management
- admin password updates
- auth status checks

### Backend API layer
The route logic lives in `server.js` and includes:
- auth: `/api/auth/login`, `/api/auth/logout`, `/api/auth/status`, `/api/auth/change-password`
- catalog: `/api/catalog`, `/api/games/:id`, `/api/companies`
- coupons: `/api/coupons`, `/api/coupons/:code`, `/api/coupons/validate`
- offers: `/api/today-offers`
- upload handling via `multer`
- static file protection and admin guard middleware

### Database and fallback layer
The database layer is in `db.js` and contains:
- database initialization
- seed data definitions
- catalog queries
- company/game CRUD functions
- coupon validation and creation helpers
- PostgreSQL and SQLite compatibility logic

If database setup fails, the app falls back to JSON-based data stored under `data/`.

---

## 4) Request Flow Examples

### Storefront catalog request
```text
User requests /
        ↓
public/index.html loads
        ↓
public/app.js fetches /api/catalog
        ↓
server.js routes request
        ↓
db.js or fallback-data.json returns catalog data
        ↓
renderCatalog() populates cards and game lists
```

### Admin login flow
```text
User opens /login
        ↓
POST /api/auth/login
        ↓
server.js validates session credentials
        ↓
req.session.isAdmin = true
        ↓
UI redirects to /admin
```

### Product create/update flow
```text
Admin opens /admin
        ↓
server_assets/admin.js loads company list
        ↓
Submit form
        ↓
POST /api/games or PUT /api/games/:id
        ↓
server.js validates admin session and body
        ↓
db.js creates or updates product record
        ↓
UI refreshes data list
```

### Cart checkout flow
```text
User adds item to cart
        ↓
localStorage key iraqGameCart updated
        ↓
User clicks checkout
        ↓
checkout review page reads saved cart + discount data
        ↓
WhatsApp message created and opened
        ↓
localStorage cleared after order submission
```

---

## 5) Important Files and Responsibilities

```text
server.js
  ├── Express app setup
  ├── session + security middleware
  ├── admin route guards
  ├── API endpoints
  ├── image upload handling
  └── server startup and shutdown

db.js
  ├── seed data
  ├── DB initialization
  ├── catalog queries
  ├── company/game CRUD
  ├── coupon logic
  └── PostgreSQL/SQLite compatibility

public/app.js
  ├── catalog loading
  ├── cart logic
  ├── search/filter behavior
  ├── deal rendering
  └── storefront interactions

server_assets/admin.js
  ├── admin auth checks
  ├── coupon list/save/delete
  ├── offer list/save/delete
  ├── company/game forms + actions
  └── admin UI behavior

public/uploads/
  └── images uploaded by admin for product covers

data/
  ├── fallback-data.json
  ├── admin-settings.json
  ├── coupons.json
  └── today-offers.json
```

---

## 6) Deployment Notes

The app is designed to run as a Node service behind a reverse proxy or host platform. In production:
- the server binds to `0.0.0.0`
- environment variables are important for auth and session security
- PM2 and similar process managers should run the app from the project root or with the correct `--cwd`
- JSON data files inside `data/` remain part of the runtime state and must not be ignored during deployment

---

## 7) Architectural Rule

When making changes, preserve this layered split:
- static public pages remain in `public/`
- server logic remains in `server.js`
- DB and data access remain in `db.js`
- admin UI logic stays in `server_assets/admin.js`
- runtime data files stay under `data/`

This separation keeps the app predictable and prevents the storefront logic, admin logic, and database layer from mixing responsibilities.

---

## 8) Current Status Snapshot

The app currently includes:
- catalog browsing and filtering
- single game page
- cart and checkout review flow
- admin authentication and protected UI
- daily offers and coupon system
- image upload for game covers
- fallback JSON mode for resilience
- Android packaging support via Capacitor

This map should be updated any time major routes, files, or architecture patterns change.
        │
        ├─ server.js checks coupon validity
        ├─ Reads data/coupons.json
        ├─ Validates code + usage count
        │
        └─ Returns: { valid: true, percent: X }
            │
            └─ app.js stores to localStorage
               ├─ 'iraqGameCoupon' = code
               └─ 'iraqGameDiscountPercent' = percent
                   │
                   └─ Checkout review shows discount

          ---

          ## 🔁 Data Synchronization & Persistence Modes

          There are two runtime persistence modes the server can run in:

          - **Database mode (recommended for production):** `server.js` attempts to initialize the SQLite/Postgres database via `initDatabase()` from `db.js`. When this succeeds `databaseReady` becomes `true` and all catalog/coupons/companies are read from the database tables.
          - **Fallback (file) mode:** If the DB init fails or if you explicitly set `SKIP_DB=true` in the environment, the server runs in fallback mode and reads/writes runtime state to JSON files under the `data/` folder (e.g. `data/fallback-data.json`, `data/coupons.json`).

          Why you see different companies/records at times:

          - If the server is running in **database mode**, it will not read from `data/fallback-data.json` at runtime — it queries the DB instead. Any edits made via the admin UI that write to the JSON files will not appear until that JSON data is imported into the DB or the server is restarted in fallback mode.
          - If the server is running in **fallback mode**, edits to the JSON files are authoritative and immediately visible.

          Recommended workflows to avoid confusion:

          1. If you want the DB to be the single source of truth, import the JSON fallback data into the DB. A helper script exists at `scripts/import-fallback-to-db.js` to copy `data/fallback-data.json` into the `data/database.sqlite` (or to Postgres via `db.js` functions). Run it from the project root:

          ```bash
          # from project root
          node scripts/import-fallback-to-db.js
          ```

          2. If you prefer to work with JSON files during development, set `SKIP_DB=true` when starting the server so runtime will use `data/*.json` directly:

          ```bash
          SKIP_DB=true node server.js
          ```

          3. After any import or DB update, restart the server so `databaseReady` and the connection reflect the new state.

          Files/locations to check when a mismatch occurs:
          - `data/fallback-data.json` — fallback catalog used in file mode
          - `data/database.sqlite` — local SQLite DB used in DB mode
          - `scripts/import-fallback-to-db.js` — import tool that copies fallback JSON into DB

          Record the chosen workflow in `Decisions.md` so all contributors follow the same steps.
```

---

## 📊 Component Dependencies Map

```
index.html
├─ Depends on: app.js, styles.css
├─ Imports from API: /api/catalog, /api/today-offers
└─ Calls: createGameNode(), renderCatalog(), filterCompaniesByCategory()

app.js (1200+ lines)
├─ Global variables: cart[], language, activeCategory
├─ Initialization: document.addEventListener('DOMContentLoaded')
├─ Main functions:
│  ├─ fetchCatalog() ──────────► /api/catalog
│  ├─ renderCatalog() ─────────► DOM update
│  ├─ fetchTodayOffers() ──────► /api/today-offers
│  ├─ renderCart() ───────────► DOM cart panel
│  ├─ toggleCart() ───────────► Show/hide panel
│  ├─ filterCompaniesByCategory() ─► Client-side filter
│  ├─ applyLanguage() ─────────► Switch AR/EN
│  ├─ createGameNode() ────────► Build game card DOM
│  ├─ createCompanyNode() ─────► Build company card DOM
│  ├─ formatPrice() ───────────► Format currency
│  └─ Event listeners:
│     ├─ categoryButtons.forEach() click
│     ├─ languageToggle.addEventListener('click')
│     ├─ cartButton.addEventListener('click')
│     ├─ searchInput.addEventListener('input')
│     └─ window.addEventListener('click')

styles.css
└─ Classes used by all HTML files:
   ├─ .store-header, .header-bar
   ├─ .category-pill, .category-bar
   ├─ .cart-panel, .cart-item
   ├─ .company-card, .game-card
   ├─ .offer-pill
   └─ Dark theme variables
```

---

## 🔄 State Management Flow

```
┌─────────────────────────────────────────────────────┐
│           Client-Side State (localStorage)           │
├─────────────────────────────────────────────────────┤
│ Key: iraqGameCart                                   │
│ Type: JSON string (parsed to array)                 │
│ Value: [{ id, qty, name, price }, ...]             │
│ Usage: Persist cart across page reloads             │
│                                                      │
│ Key: iraqGameLanguage                              │
│ Type: String (ar|en)                               │
│ Value: User's language preference                  │
│ Usage: Apply language on page load                 │
│                                                      │
│ Key: iraqGameCoupon                               │
│ Type: String                                       │
│ Value: Coupon code                                │
│ Usage: Display in checkout, send in message       │
│                                                      │
│ Key: iraqGameDiscountPercent                      │
│ Type: String (number)                             │
│ Value: Discount percentage                        │
│ Usage: Calculate final total in checkout         │
│                                                      │
│ Key: iraqGameCheckoutReview                       │
│ Type: JSON string                                 │
│ Value: { name, phone, email, notes, coupon, ... } │
│ Usage: Pre-fill checkout form                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│          Server-Side State (Express Session)         │
├─────────────────────────────────────────────────────┤
│ Key: req.session.admin                             │
│ Type: Boolean                                       │
│ Value: true if user logged in                      │
│ Usage: Protect /admin routes                       │
│                                                      │
│ Used by: requireAdmin middleware                   │
│ Stored in: express-session (cookie-based)         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│        File-Based Runtime State (data/*.json)        │
├─────────────────────────────────────────────────────┤
│ File: today-offers.json                            │
│ Format: { offers: [...] }                          │
│ Usage: Display daily offers on home page           │
│ Managed by: /api/today-offers endpoints            │
│                                                      │
│ File: admin-settings.json                          │
│ Format: { whatsappNumber, ... }                    │
│ Usage: WhatsApp link for checkout                  │
│ Managed by: /api/admin/settings endpoints          │
│                                                      │
│ File: coupons.json                                 │
│ Format: { coupons: [{code, percent}, ...] }       │
│ Usage: Validate coupon codes                       │
│ Managed by: /api/coupons endpoints                 │
│                                                      │
│ File: fallback-data.json                           │
│ Format: Full catalog structure                     │
│ Usage: Offline fallback when DB unavailable       │
│ Auto-generated from db.js seedData                 │
└─────────────────────────────────────────────────────┘
```

---

## 🔌 Integration Points (How Components Connect)

### **Frontend ↔ Backend API Calls**

| Frontend Action | API Endpoint | Method | Params | Response |
|-----------------|--------------|--------|--------|----------|
| Page Load | `/api/catalog` | GET | `search`, `sort`, `product_type` | `{ companies: [...] }` |
| Category Click | `/api/catalog` | GET | `product_type=game\|subscription` | `{ companies: [...] }` |
| Search Input | `/api/catalog` | GET | `search=query` | `{ companies: [...] }` |
| Offer Banner | `/api/today-offers` | GET | - | `{ offers: [...] }` |
| Coupon Entry | `/api/coupons/validate` | POST | `{ code }` | `{ valid, percent }` |
| Checkout Init | `/api/admin/settings` | GET | - | `{ whatsappNumber }` |
| Admin Login | `/api/auth/login` | POST | `{ username, password }` | `{ success }` |
| Admin Logout | `/api/auth/logout` | POST | - | `{ success }` |
| Save Offer | `/api/today-offers` | POST | `{ title, ... }` | Saved offer object |
| Delete Offer | `/api/today-offers/:id` | DELETE | - | `{ success }` |

---

## 📍 Critical Paths (No Shortcuts!)

### **Path 1: Add to Cart → Checkout**
```
index.html 
  └─ app.js (addToCartBtn listener)
    └─ localStorage 'iraqGameCart'
      └─ checkout-review.html
        └─ /api/admin/settings (fetch WhatsApp #)
          └─ WhatsApp web link
```
**Critical**: All 5 points must work or checkout fails

### **Path 2: Admin Modifies Today's Offers**
```
admin.html 
  └─ app.js (loadOffers)
    └─ GET /api/today-offers (server reads file)
      └─ User edits, clicks Save
        └─ POST /api/today-offers (server writes file)
          └─ index.html fetchTodayOffers() picks up new offers
            └─ Offer banner updates
```
**Critical**: File I/O must be reliable, offer list must refresh

### **Path 3: User Filters by Category**
```
index.html (click category button)
  └─ app.js (categoryButtons click handler)
    └─ activeCategory = 'playstation'
      └─ fetchCatalog() GET /api/catalog
        └─ filterCompaniesByCategory() (client-side for playstation)
          └─ renderCatalog() with filtered results
```
**Critical**: Must use correct category mapping (no invalid server queries)

---

## 🎯 How to Navigate This Codebase

1. **Understanding a feature?** → Look at `Decisions.md` first for constraints
2. **Tracing a bug?** → Start in `app.js`, check data flow diagram
3. **Adding a new API?** → Add route in `server.js`, document in `Decisions.md`
4. **Adding a new field?** → Update schema in `Decisions.md` Product Fields section
5. **Making layout changes?** → Modify `public/index.html` + `public/styles.css`
6. **Changing filters?** → Update Category Filtering section in `Decisions.md`

---

**Last Updated**: 2026-08-25  
**For questions**: Refer to Decisions.md for design rationale

---

## 🔁 تغييرات ونقاط سريعة (Recent changes) — 2026-09-07

- تمّت إضافة نقاط نهاية إدارية وعمليات CRUD للكتالوج حتى يعمل `server_assets/admin.js` بشكل صحيح:
  - `GET /api/companies`, `POST /api/companies`, `PUT/DELETE /api/companies/:id`
  - `GET /api/catalog` (يدعم `search`, `sort`, `product_type`)
  - `GET /api/games/:id`, `POST/PUT/DELETE /api/games/:id`
- أضيفت مسارات محمية: `/admin-assets/admin.js`, `/change-password.js` و`/admin/password` (alias).
- ملحوظة تشغيل: استخدم `pm2 restart iraq-story --cwd /var/www/iraqstorycard.tech -f` عند نشر تغييرات `server.js`.

### أماكن سريعة للبحث عن الأخطاء
- سجل العمليات و الأخطاء (pm2): `/root/.pm2/logs/iraq-story-out.log` و`/root/.pm2/logs/iraq-story-error.log`
- ملف الخادم المنشور: `/var/www/iraqstorycard.tech/server.js`
- ملفات البيانات: `data/*.json` (`fallback-data.json`, `admin-settings.json`, `coupons.json`, `today-offers.json`)
- واجهة الادمن العميلة: `server_assets/admin.js` و`public/admin.html`

أضفت هذه المعلومات هنا حتى تصبح الخريطة مرجعية سريعة عند العودة للتدقيق أو استرجاع تغييرات سابقة.
