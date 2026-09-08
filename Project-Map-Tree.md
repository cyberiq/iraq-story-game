# 🗺️ Iraq Game Store - Project Map & Architecture

## Visual Project Structure

```
┌─────────────────────────────────────────────────────────┐
│         IRAQ GAME STORE - Architecture Overview          │
└─────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │   User Browser   │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
    ┌───▼───┐          ┌────▼─────┐        ┌────▼──────┐
    │ /      │          │ /admin   │        │ /checkout │
    │ (Main  │          │ (Admin   │        │ -review   │
    │ Store) │          │ Panel)   │        │ (Review)  │
    └───┬───┘          └────┬─────┘        └────┬──────┘
        │                   │                    │
        │◄──────────────────┼────────────────────┤
        │              Server (Node.js/Express)   │
        │◄──────────────────┼────────────────────┤
        │                   │                    │
    ┌───▼──────────────────▼──────────────────▼───┐
    │         File System (data/*.json)            │
    ├─────────────────────────────────────────────┤
    │ • fallback-data.json (companies & games)   │
    │ • admin-settings.json (WhatsApp #)         │
    │ • today-offers.json (offers list)          │
    │ • coupons.json (coupon codes)              │
    └─────────────────────────────────────────────┘
```

---

## 📦 File-by-File Architecture Map

### **Frontend Layer** (Browser)

```
public/
├── index.html ◄──────────┐
│  ├─ Header & Navigation │
│  ├─ Category Buttons    │
│  ├─ Search Bar          │
│  ├─ Catalog Container   │
│  └─ Templates (company, game)
│
├── app.js ◄──────────────── Main application logic
│  ├─ fetchCatalog() ────────► /api/catalog
│  ├─ fetchTodayOffers() ────► /api/today-offers
│  ├─ renderCatalog() ───────► Renders companies/games from API
│  ├─ renderCart() ─────────► Shows cart items
│  ├─ applyLanguage() ──────► Switches AR/EN UI text
│  ├─ toggleCart() ─────────► Open/close cart panel
│  └─ Filter logic (playstation, xbox, deals)
│
├── styles.css
│  └─ Dark theme styling (premium app-store look)
│
├── checkout-review.html ◄── Order review page
│  └─ Shows cart items + total + customer form
│
├── admin.html ◄───────────── Admin dashboard
│  ├─ Today's Offers section ─► today-offers admin
│  ├─ Coupons section ───────► coupons admin
│  ├─ WhatsApp Settings ────► admin-settings
│  └─ Password Change ──────► change password
│
├── admin.js (in server_assets/) ◄─ Admin panel logic
│  ├─ loadOffers() ──────────► GET /api/today-offers
│  ├─ saveOffer() ───────────► POST /api/today-offers
│  ├─ deleteOffer() ─────────► DELETE /api/today-offers/:id
│  └─ loadCoupons() ─────────► GET /api/coupons
│
└── game.html ◄───────────── Game detail page
   └─ Shows single game info
```

---

### **Backend Layer** (Node.js/Express)

```
server.js ◄─ Main server entry point
│
├─ Session Middleware (express-session)
│  └─ requireAdmin middleware ◄─ Protects admin routes
│
├─ Static Routes
│  ├─ GET / ─────────────► public/index.html
│  ├─ GET /admin ────────► public/admin.html (requires auth)
│  ├─ GET /*.html ──────► Serve public static files
│  └─ GET /static ──────► Serve public assets
│
├─ API Routes (RESTful)
│  │
│  ├─ Catalog & Products
│  │  ├─ GET /api/catalog ◄─────────────────┐
│  │  │  ├─ Query params: search, sort      │
│  │  │  ├─ Query params: product_type      │
│  │  │  ├─ Calls db.getCatalog()           │
│  │  │  └─ Returns: { companies: [...] }   │
│  │  │                                      │
│  │  └─ GET /api/games/:id ────────────────┤
│  │     ├─ Calls db.getGameDetailsById()   │
│  │     └─ Returns: game object            │
│  │                                         │
│  ├─ Today's Offers ◄──────────────────────┤
│  │  ├─ GET /api/today-offers             │
│  │  │  ├─ Reads data/today-offers.json    │
│  │  │  └─ Returns: { offers: [...] }     │
│  │  │                                     │
│  │  ├─ POST /api/today-offers ◄──┐       │
│  │  │  ├─ Body: { title, ...}    │       │
│  │  │  ├─ Saves to .json file    │       │
│  │  │  └─ Returns: saved offer   │       │
│  │  │                            │       │
│  │  └─ DELETE /api/today-offers/:id      │
│  │     ├─ Removes offer from .json       │
│  │     └─ Returns success msg   │       │
│  │                              │       │
│  ├─ Coupons ◄────────────────────┤       │
│  │  ├─ GET /api/coupons (admin)  │       │
│  │  ├─ POST /api/coupons (admin) │       │
│  │  └─ POST /api/coupons/validate (public)
│  │     └─ Checks coupon validity │       │
│  │                               │       │
│  ├─ Authentication ◄─────────────┤       │
│  │  ├─ POST /api/auth/login      │       │
│  │  │  ├─ Sets session cookie    │       │
│  │  │  └─ Returns: { success }   │       │
│  │  │                            │       │
│  │  ├─ POST /api/auth/logout     │       │
│  │  │  └─ Clears session         │       │
│  │  │                            │       │
│  │  ├─ GET /api/auth/status      │       │
│  │  │  └─ Returns: { loggedIn }  │       │
│  │  │                            │       │
│  │  └─ POST /api/auth/change-password ◄─┤
│  │     └─ Updates admin password │       │
│  │                               │       │
│  ├─ Settings (Admin) ◄───────────┤       │
│  │  ├─ GET /api/admin/settings  │       │
│  │  │  └─ Reads admin-settings.json      │
│  │  │                            │       │
│  │  └─ POST /api/admin/settings │       │
│  │     └─ Updates WhatsApp #    │       │
│  │                              │       │
│  └─ Checkout ◄──────────────────┘
│     └─ GET /checkout-review
│        └─ Serves static review page
│
└─ Database Layer
   │
   └─ db.js (imported)
      ├─ getCatalog(filter) ─────────────► Returns filtered companies
      ├─ getGameDetailsById(id) ─────────► Returns single game
      ├─ seedData ───────────────────────► Initial catalog
      ├─ createCoupon() / validateCoupon()
      └─ getCompaniesList() ──────────────► Returns all companies
```

---

## 🔗 Data Flow Diagrams

### **User Views Catalog**

```
User Opens / ─────► app.js loads ─────► fetchCatalog()
                                            │
                                    GET /api/catalog
                                            │
                                    db.getCatalog()
                                            │
                                    ┌───────▼──────────┐
                                    │ fallback-data   │
                                    │ or database      │
                                    └────────┬────────┘
                                            │
                                    Returns companies[]
                                            │
                                    renderCatalog()
                                            │
                                    DOM renders cards
                                            │
                                    User sees stores
```

### **User Adds to Cart**

```
Click "إضافة للسلة"
    │
    └─► addToCartBtn click listener
        │
        ├─ Update cart[] in memory
        ├─ Save to localStorage 'iraqGameCart'
        └─► renderCart()
            │
            ├─ Update cart count badge
            ├─ Create/update cart panel HTML
            └─► User sees item in cart
```

### **User Completes Order**

```
Click "إتمام الطلب"
    │
    ├─ Validate cart not empty
    ├─ Save to localStorage 'iraqGameCheckoutReview'
    └─► Redirect to /checkout-review.html
        │
        ├─ Load cart from localStorage
        ├─ Load discount from localStorage
        ├─ Show items + total
        ├─ Show customer form
        │
        └─ Click "إتمام الشراء عبر WhatsApp"
            │
            ├─ GET /api/admin/settings (get WhatsApp #)
            ├─ Build WhatsApp message from cart + discount
            ├─ Open WhatsApp web link
            └─ Clear localStorage
```

### **Admin Manages Offers**

```
Admin opens /admin
    │
    ├─ POST /api/auth/login (if not logged in)
    │
    ├─► app.js loads offers
    │   │
    │   └─► GET /api/today-offers
    │       │
    │       └─ server.js reads data/today-offers.json
    │
    ├─ Admin fills form (title, type, percent)
    │
    ├─ Click "Save"
    │   │
    │   └─► POST /api/today-offers
    │       │
    │       └─ server.js saves to data/today-offers.json
    │
    └─ Main page auto-fetches new offers via fetchTodayOffers()
```

### **User Applies Coupon**

```
User enters coupon code in cart
    │
    └─► POST /api/coupons/validate
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
