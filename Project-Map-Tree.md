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
