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
