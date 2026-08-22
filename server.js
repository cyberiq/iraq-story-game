require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const multer = require("multer");

const {
  seedData,
  initDatabase,
  getCatalog,
  getGameDetailsById,
  getCompaniesList,
  createCompany,
  updateCompany,
  createGame,
  updateGame,
  deleteCompany,
  deleteGame
  ,getCoupons, createCoupon, deleteCoupon, validateCoupon
} = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const SESSION_SECRET = process.env.SESSION_SECRET || "iraq-story-game-session-secret";
const fallbackDataPath = path.join(__dirname, "data", "fallback-data.json");
const adminSettingsPath = path.join(__dirname, "data", "admin-settings.json");
const couponsPath = path.join(__dirname, "data", "coupons.json");
const todayOffersPath = path.join(__dirname, "data", "today-offers.json");
let databaseReady = false;

function ensureDataFiles() {
  const dataDir = path.dirname(fallbackDataPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(fallbackDataPath)) {
    fs.writeFileSync(fallbackDataPath, JSON.stringify(seedData.map((company, companyIndex) => ({
      id: companyIndex + 1,
      slug: company.slug,
      name_ar: company.name_ar,
      name_en: company.name_en,
      games: company.games.map((game, gameIndex) => ({
        id: (companyIndex + 1) * 100 + gameIndex + 1,
          ...game,
          product_type: game.product_type || 'game',
          currency: game.currency || "IQD"
      }))
    })), null, 2));
  }

  if (!fs.existsSync(adminSettingsPath)) {
    fs.writeFileSync(adminSettingsPath, JSON.stringify({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD
    }, null, 2));
  }
  if (!fs.existsSync(couponsPath)) {
    fs.writeFileSync(couponsPath, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(todayOffersPath)) {
    fs.writeFileSync(todayOffersPath, JSON.stringify([], null, 2));
  }
}

function readJsonFile(filePath, fallbackValue) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return content ? JSON.parse(content) : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

let runtimeAdminSettings = {
  ...{
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
    whatsapp_number: '77133777783'
  },
  ...readJsonFile(adminSettingsPath, {
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
    whatsapp_number: '77133777783'
  })
};

if (!runtimeAdminSettings.whatsapp_number) {
  runtimeAdminSettings.whatsapp_number = '77133777783';
  saveAdminSettings();
}

function saveAdminSettings() {
  writeJsonFile(adminSettingsPath, runtimeAdminSettings);
}

let runtimeCoupons = readJsonFile(couponsPath, []);
let runtimeTodayOffers = readJsonFile(todayOffersPath, []);

function saveCouponsFile() {
  writeJsonFile(couponsPath, runtimeCoupons);
}

function saveTodayOffersFile() {
  writeJsonFile(todayOffersPath, runtimeTodayOffers);
}

const uploadsDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename(req, file, cb) {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeExt = extension || ".jpg";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter(req, file, cb) {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }

    cb(null, true);
  }
});

app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: String(process.env.NODE_ENV || '').toLowerCase() === 'production',
      maxAge: 1000 * 60 * 60 * 12
    }
  })
);
// If running behind a proxy/load balancer in production, trust first proxy for secure cookies
if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
  app.set('trust proxy', 1);
}

// Protect sensitive admin static files: only allow when session is admin
// Serve admin assets through guarded routes to prevent accidental public access or cache bypass
app.get('/admin', (req, res) => {
  if (!req.session || req.session.isAdmin !== true) return res.redirect('/login');
  return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin.html', (req, res) => {
  if (!req.session || req.session.isAdmin !== true) return res.redirect('/login');
  return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin.js', (req, res) => {
  if (!req.session || req.session.isAdmin !== true) return res.status(401).json({ error: 'Unauthorized' });
  return res.sendFile(path.join(__dirname, 'server_assets', 'admin.js'));
});

// new secured path for admin JS assets
app.get('/admin-assets/admin.js', (req, res) => {
  if (!req.session || req.session.isAdmin !== true) return res.status(401).json({ error: 'Unauthorized' });
  return res.sendFile(path.join(__dirname, 'server_assets', 'admin.js'));
});

app.get('/change-password.html', (req, res) => {
  if (!req.session || req.session.isAdmin !== true) return res.redirect('/login');
  return res.sendFile(path.join(__dirname, 'public', 'change-password.html'));
});

app.get('/change-password.js', (req, res) => {
  if (!req.session || req.session.isAdmin !== true) return res.status(401).json({ error: 'Unauthorized' });
  return res.sendFile(path.join(__dirname, 'public', 'change-password.js'));
});
app.use(express.static(path.join(__dirname, "public"), { index: false }));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin === true) {
    return next();
  }

  return res.status(401).json({ error: "Unauthorized" });
}

let fallbackCompanyState = [];

function loadFallbackState() {
  ensureDataFiles();
  const saved = readJsonFile(fallbackDataPath, []);
  if (Array.isArray(saved) && saved.length) {
    return JSON.parse(JSON.stringify(saved));
  }

  return JSON.parse(JSON.stringify(seedData.map((company, companyIndex) => ({
    id: companyIndex + 1,
    slug: company.slug,
    name_ar: company.name_ar,
    name_en: company.name_en,
    games: company.games.map((game, gameIndex) => ({
      id: (companyIndex + 1) * 100 + gameIndex + 1,
      ...game,
      currency: game.currency || "IQD"
    }))
  }))));
}

function saveFallbackState() {
  ensureDataFiles();
  writeJsonFile(fallbackDataPath, JSON.parse(JSON.stringify(fallbackCompanyState)));
}

fallbackCompanyState = loadFallbackState();

function nextFallbackCompanyId() {
  return fallbackCompanyState.reduce((maxId, company) => Math.max(maxId, Number(company.id || 0)), 0) + 1;
}

function nextFallbackGameId() {
  return fallbackCompanyState.reduce((maxId, company) => {
    const companyMax = (company.games || []).reduce((innerMax, game) => Math.max(innerMax, Number(game.id || 0)), 0);
    return Math.max(maxId, companyMax);
  }, 0) + 1;
}

function findFallbackCompanyById(id) {
  return fallbackCompanyState.find((company) => Number(company.id) === Number(id));
}

function findFallbackGameById(id) {
  for (const company of fallbackCompanyState) {
    const game = (company.games || []).find((entry) => Number(entry.id) === Number(id));
    if (game) {
      return { company, game };
    }
  }
  return null;
}

function fallbackCompaniesList() {
  return fallbackCompanyState.map((company) => ({
    id: company.id,
    slug: company.slug,
    name_ar: company.name_ar,
    name_en: company.name_en
  }));
}

function fallbackCatalog() {
  return fallbackCompanyState.map((company) => ({
    id: company.id,
    slug: company.slug,
    name_ar: company.name_ar,
    name_en: company.name_en,
    games: (company.games || []).map((game) => ({
      id: game.id,
      product_type: game.product_type || 'game',
      name_ar: game.name_ar,
      name_en: game.name_en,
      genre: game.genre,
      release_year: game.release_year,
      cover_image_url: game.cover_image_url,
      description: game.description,
      price: game.price ?? 0,
      currency: game.currency || "IQD"
    }))
  }));
}

function fallbackGameById(id) {
  const companies = fallbackCatalog();
  for (const company of companies) {
    const game = company.games.find((entry) => Number(entry.id) === Number(id));
    if (game) {
      return {
        id: game.id,
        product_type: game.product_type || 'game',
        name_ar: game.name_ar,
        name_en: game.name_en,
        genre: game.genre,
        release_year: game.release_year,
        cover_image_url: game.cover_image_url,
        description: game.description,
        price: game.price,
        currency: game.currency || "IQD",
        company: {
          id: company.id,
          slug: company.slug,
          name_ar: company.name_ar,
          name_en: company.name_en
        }
      };
    }
  }
  return null;
}

function isValidImageUrlCandidate(u) {
  if (!u || typeof u !== 'string') return false;
  try {
    const parsed = new URL(u);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    // basic extension check
    const extMatch = /\.(jpe?g|png|gif|webp|bmp|svg)(\?.*)?$/i.test(parsed.pathname + (parsed.search || ''));
    if (extMatch) return true;

    // If no extension, attempt a HEAD request to verify Content-Type without downloading body
    // Avoid long waits — use a short timeout
    const http = parsed.protocol === 'https:' ? require('https') : require('http');
    return new Promise((resolve) => {
      let finished = false;
      const req = http.request({
        method: 'HEAD',
        host: parsed.hostname,
        path: parsed.pathname + (parsed.search || ''),
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        timeout: 3000,
        headers: {
          'User-Agent': 'iraq-story-game/1.0 (+https://example)'
        }
      }, (res) => {
        if (finished) return;
        finished = true;
        const ct = String(res.headers['content-type'] || '').toLowerCase();
        resolve(ct.startsWith('image/'));
      });

      req.on('error', () => { if (!finished) { finished = true; resolve(false); } });
      req.on('timeout', () => { req.destroy(); if (!finished) { finished = true; resolve(false); } });
      req.end();
    });
  } catch (e) {
    return false;
  }
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "game-catalog", databaseReady });
});

app.get("/api/auth/status", (req, res) => {
  const authenticated = Boolean(req.session && req.session.isAdmin === true);
  res.json({ authenticated });
});

// Simple IP-based login attempt tracking to mitigate brute-force
const loginAttemptsByIp = {};
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const normalizedUsername = String(username || "").trim();
  const normalizedPassword = String(password || "").trim();

  const ip = (req.ip || req.connection.remoteAddress || 'unknown').toString();
  const now = Date.now();
  const LOCK_DURATION_MS = Number(process.env.LOGIN_LOCK_MS || 10 * 60 * 1000); // default 10 minutes
  const MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 5);

  if (!loginAttemptsByIp[ip]) {
    loginAttemptsByIp[ip] = { attempts: 0, lockUntil: 0 };
  }

  const record = loginAttemptsByIp[ip];
  if (record.lockUntil && now < record.lockUntil) {
    const waitSec = Math.ceil((record.lockUntil - now) / 1000);
    return res.status(429).json({ error: `ممنوع مؤقتًا. حاول مرة أخرى بعد ${waitSec} ثانية.` });
  }

  if (normalizedUsername === runtimeAdminSettings.username && normalizedPassword === runtimeAdminSettings.password) {
    req.session.isAdmin = true;
    // reset IP record
    record.attempts = 0;
    record.lockUntil = 0;
    return res.json({ ok: true });
  }

  // failed attempt
  record.attempts = (record.attempts || 0) + 1;
  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockUntil = Date.now() + LOCK_DURATION_MS;
    return res.status(429).json({ error: `تجاوزت الحد الأقصى من المحاولات. المحاولة مؤمّنة لمدة ${Math.ceil(LOCK_DURATION_MS/60000)} دقيقة.` });
  }

  return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
});

app.post("/api/auth/change-password", requireAdmin, (req, res) => {
  const { currentPassword = "", newPassword = "", confirmPassword = "" } = req.body || {};
  const current = String(currentPassword).trim();
  const next = String(newPassword).trim();
  const confirm = String(confirmPassword).trim();

  if (!current || !next || !confirm) {
    return res.status(400).json({ error: "يجب إدخال كلمة المرور الحالية والجديدة وتأكيدها." });
  }

  if (next.length < 4) {
    return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل." });
  }

  if (next !== confirm) {
    return res.status(400).json({ error: "تأكيد كلمة المرور لا يطابق كلمة المرور الجديدة." });
  }

  if (current !== runtimeAdminSettings.password) {
    return res.status(400).json({ error: "كلمة المرور الحالية غير صحيحة." });
  }

  runtimeAdminSettings.password = next;
  saveAdminSettings();
  return res.json({ ok: true, message: "تم تحديث كلمة المرور بنجاح." });
});

app.post("/api/auth/logout", (req, res) => {
  if (!req.session) {
    return res.json({ ok: true });
  }

  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

app.get('/api/contact-settings', (req, res) => {
  const whatsappNumber = String(runtimeAdminSettings.whatsapp_number || '77133777783').replace(/\D/g, '');
  return res.json({ whatsapp_number: whatsappNumber });
});

app.get('/api/admin/settings', requireAdmin, (req, res) => {
  return res.json({
    username: runtimeAdminSettings.username,
    whatsapp_number: String(runtimeAdminSettings.whatsapp_number || '77133777783').replace(/\D/g, '')
  });
});

app.post('/api/admin/settings', requireAdmin, (req, res) => {
  const { whatsapp_number } = req.body || {};
  const cleaned = String(whatsapp_number || '').replace(/\D/g, '');

  if (!cleaned) {
    return res.status(400).json({ error: 'رقم الواتساب مطلوب.' });
  }

  runtimeAdminSettings.whatsapp_number = cleaned;
  saveAdminSettings();
  return res.json({ ok: true, whatsapp_number: cleaned });
});

// Coupons - admin management
app.get('/api/coupons', requireAdmin, async (req, res) => {
  if (!databaseReady) {
    return res.json({ coupons: runtimeCoupons });
  }

  try {
    const coupons = await getCoupons();
    res.json({ coupons });
  } catch (error) {
    console.error('Failed to fetch coupons', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/coupons', requireAdmin, async (req, res) => {
  const { code, percent } = req.body || {};
  if (!code || !Number.isFinite(Number(percent))) {
    return res.status(400).json({ error: 'code and percent are required' });
  }

  if (!databaseReady) {
    const exists = runtimeCoupons.find((c) => c.code === String(code).trim());
    if (exists) return res.status(409).json({ error: 'Coupon already exists' });
    runtimeCoupons.unshift({ code: String(code).trim(), percent: Number(percent), active: 1 });
    saveCouponsFile();
    return res.status(201).json({ code: String(code).trim() });
  }

  try {
    const created = await createCoupon({ code, percent: Number(percent) });
    res.status(201).json(created);
  } catch (error) {
    console.error('Failed to create coupon', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/coupons/:code', requireAdmin, async (req, res) => {
  const code = String(req.params.code || '').trim();
  if (!code) return res.status(400).json({ error: 'Invalid code' });
  if (!databaseReady) {
    const idx = runtimeCoupons.findIndex((c) => c.code === code);
    if (idx === -1) return res.status(404).json({ error: 'Coupon not found' });
    runtimeCoupons.splice(idx, 1);
    saveCouponsFile();
    return res.json({ deleted: true });
  }

  try {
    const affected = await deleteCoupon(code);
    if (!affected) return res.status(404).json({ error: 'Coupon not found' });
    res.json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete coupon', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public validate coupon
app.post('/api/coupons/validate', async (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'code is required' });

  if (!databaseReady) {
    const found = runtimeCoupons.find((c) => c.code === String(code).trim() && Number(c.active || 0) === 1);
    if (!found) return res.status(404).json({ error: 'Coupon not found' });
    return res.json({ ok: true, percent: Number(found.percent || 0) });
  }

  try {
    const valid = await validateCoupon(code);
    if (!valid) return res.status(404).json({ error: 'Coupon not found' });
    res.json({ ok: true, percent: valid.percent });
  } catch (error) {
    console.error('Failed to validate coupon', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/today-offers', async (req, res) => {
  try {
    res.json({ offers: runtimeTodayOffers });
  } catch (error) {
    console.error('Failed to read today offers', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/today-offers', requireAdmin, async (req, res) => {
  const { id, game_id, price, percent, title, product_name } = req.body || {};
  const editId = Number(id ?? 0);
  const gameId = Number(game_id ?? 0);
  const offerPrice = Number(price ?? 0);
  const offerPercent = Number(percent ?? 0);
  const payloadTitle = String(title || product_name || 'عرض اليوم').trim();
  const payloadProductName = String(product_name || '').trim();

  if ((!gameId && !payloadProductName && !payloadTitle) || (!offerPrice && !offerPercent)) {
    return res.status(400).json({ error: 'اكتب اسم المنتج أو اختر منتج ثم أدخل سعر العرض أو نسبة الخصم.' });
  }

  const normalizedTitle = payloadTitle || payloadProductName || 'عرض اليوم';
  const normalizedProductName = payloadProductName || normalizedTitle;

  if (editId) {
    const existingIndex = runtimeTodayOffers.findIndex((entry) => Number(entry.id) === editId);
    if (existingIndex === -1) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    runtimeTodayOffers[existingIndex] = {
      ...runtimeTodayOffers[existingIndex],
      game_id: gameId || runtimeTodayOffers[existingIndex].game_id || null,
      title: normalizedTitle,
      product_name: normalizedProductName,
      price: Number.isFinite(offerPrice) ? offerPrice : runtimeTodayOffers[existingIndex].price || 0,
      percent: Number.isFinite(offerPercent) ? offerPercent : runtimeTodayOffers[existingIndex].percent || 0,
      active: true
    };

    saveTodayOffersFile();
    return res.json({ offer: runtimeTodayOffers[existingIndex] });
  }

  const offer = {
    id: Date.now(),
    game_id: gameId || null,
    title: normalizedTitle,
    product_name: normalizedProductName,
    price: Number.isFinite(offerPrice) ? offerPrice : 0,
    percent: Number.isFinite(offerPercent) ? offerPercent : 0,
    active: true
  };

  runtimeTodayOffers = [offer, ...runtimeTodayOffers.filter((entry) => Number(entry.game_id || 0) !== gameId)];
  saveTodayOffersFile();
  return res.status(201).json({ offer });
});

app.delete('/api/today-offers/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id ?? 0);
  if (!id) return res.status(400).json({ error: 'Invalid offer id' });

  const before = runtimeTodayOffers.length;
  runtimeTodayOffers = runtimeTodayOffers.filter((entry) => Number(entry.id) !== id);
  if (runtimeTodayOffers.length === before) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  saveTodayOffersFile();
  return res.json({ deleted: true });
});

app.get("/api/catalog", async (req, res) => {
  if (!databaseReady) {
    const { search = "", sort = "name_asc", product_type = "all" } = req.query;
    const companies = fallbackCatalog();
    const term = String(search || "").trim().toLowerCase();
    const filtered = !term
      ? companies
      : companies.filter((company) => {
          const companyMatch =
            company.name_ar.toLowerCase().includes(term) || company.name_en.toLowerCase().includes(term);
          const games = company.games.filter(
            (game) =>
              game.name_ar.toLowerCase().includes(term) || game.name_en.toLowerCase().includes(term)
          );
          return companyMatch || games.length;
        });

    const typeFiltered = (product_type && product_type !== 'all') ? filtered.map((company) => ({
      ...company,
      games: (company.games || []).filter((g) => String(g.product_type || 'game') === String(product_type))
    })).filter((c) => (c.games || []).length > 0) : filtered;

    const sorted = [...typeFiltered];
    sorted.forEach((company) => {
      company.games.sort((a, b) => {
        switch (sort) {
          case "name_desc":
            return String(b.name_en).localeCompare(String(a.name_en));
          case "year_asc":
            return Number(a.release_year) - Number(b.release_year);
          case "year_desc":
            return Number(b.release_year) - Number(a.release_year);
          case "company_asc":
            return String(company.name_en).localeCompare(String(company.name_en));
          default:
            return String(a.name_en).localeCompare(String(b.name_en));
        }
      });
    });

    if (sort === "company_asc") {
      sorted.sort((a, b) => String(a.name_en).localeCompare(String(b.name_en)));
    }

    return res.json({ companies: sorted });
  }

  try {
    const { search = "", sort = "name_asc", product_type = "all" } = req.query;
    let companies = await getCatalog({ search, sort });
    if (product_type && product_type !== 'all') {
      companies = companies.map((company) => ({
        ...company,
        games: (company.games || []).filter((g) => String(g.product_type || 'game') === String(product_type))
      })).filter((c) => (c.games || []).length > 0);
    }
    res.json({ companies });
  } catch (error) {
    console.error("Failed to fetch catalog", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/games/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid game id" });
  }

  if (!databaseReady) {
    const game = fallbackGameById(id);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }
    return res.json({ game });
  }

  try {
    const game = await getGameDetailsById(id);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    res.json({ game });
  } catch (error) {
    console.error("Failed to fetch game details", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/companies", async (req, res) => {
  if (!databaseReady) {
    return res.json({ companies: fallbackCompaniesList() });
  }

  try {
    const companies = await getCompaniesList();
    res.json({ companies });
  } catch (error) {
    console.error("Failed to fetch companies", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/companies", requireAdmin, async (req, res) => {
  const { slug, name_ar, name_en } = req.body || {};

  if (!slug || !name_ar || !name_en) {
    return res.status(400).json({ error: "slug, name_ar, name_en are required" });
  }

  if (!databaseReady) {
    const normalizedSlug = String(slug).trim();
    const duplicate = fallbackCompanyState.some((company) => company.slug === normalizedSlug);
    if (duplicate) {
      return res.status(409).json({ error: "Company slug already exists" });
    }

    const created = {
      id: nextFallbackCompanyId(),
      slug: normalizedSlug,
      name_ar: String(name_ar).trim(),
      name_en: String(name_en).trim(),
      games: []
    };

    fallbackCompanyState.push(created);
    return res.status(201).json({ id: created.id, slug: created.slug });
  }

  try {
    const created = await createCompany({ slug, name_ar, name_en });
    res.status(201).json(created);
  } catch (error) {
    console.error("Failed to create company", error);
    if (error && error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Company slug already exists" });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/companies/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { slug, name_ar, name_en } = req.body || {};

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid company id" });
  }

  if (!slug || !name_ar || !name_en) {
    return res.status(400).json({ error: "slug, name_ar, name_en are required" });
  }

  if (!databaseReady) {
    const company = findFallbackCompanyById(id);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    company.slug = String(slug).trim();
    company.name_ar = String(name_ar).trim();
    company.name_en = String(name_en).trim();
    return res.json({ updated: true });
  }

  try {
    const affected = await updateCompany(id, { slug, name_ar, name_en });
    if (!affected) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json({ updated: true });
  } catch (error) {
    console.error("Failed to update company", error);
    if (error && error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Company slug already exists" });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/companies/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid company id" });
  }

  if (!databaseReady) {
    const index = fallbackCompanyState.findIndex((company) => Number(company.id) === id);
    if (index === -1) {
      return res.status(404).json({ error: "Company not found" });
    }

    fallbackCompanyState.splice(index, 1);
    return res.json({ deleted: true });
  }

  try {
    const affected = await deleteCompany(id);
    if (!affected) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json({ deleted: true });
  } catch (error) {
    console.error("Failed to delete company", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/games", requireAdmin, upload.single("image"), async (req, res) => {
  const { company_id, product_type = 'game', product_subtype = '', name_ar, name_en, genre, release_year, price, currency = "IQD", description = "" } = req.body || {};
  const year = Number(release_year);
  const coverImagePath = req.file ? `/uploads/${req.file.filename}` : (req.body.cover_image_url ? String(req.body.cover_image_url).trim() : "");

  // If a cover image URL was provided (and no file), validate it
  if (!req.file && coverImagePath) {
    try {
      const valid = await Promise.resolve(isValidImageUrlCandidate(coverImagePath));
      if (!valid) {
        return res.status(400).json({ error: 'رابط الصورة غير صالح أو لا يشير لصيغة صورة مدعومة.' });
      }
    } catch (err) {
      return res.status(400).json({ error: 'رابط الصورة غير صالح أو لا يشير لصيغة صورة مدعومة.' });
    }
  }

  if (!company_id || !name_ar || !name_en || !genre || !Number.isInteger(year)) {
    return res.status(400).json({
      error: "company_id, name_ar, name_en, genre, release_year are required"
    });
  }

  if (!databaseReady) {
    const company = findFallbackCompanyById(company_id);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const game = {
      id: nextFallbackGameId(),
      product_type: String(product_type || 'game'),
      product_subtype: String(product_subtype || ''),
      name_ar: String(name_ar).trim(),
      name_en: String(name_en).trim(),
      genre: String(genre).trim(),
      release_year: year,
      price: Number(req.body.price ?? 0),
      currency: String(currency || "IQD").toUpperCase(),
      cover_image_url: coverImagePath || "",
      description: String(description).trim(),
    };

    company.games.push(game);
    saveFallbackState();
    return res.status(201).json({ id: game.id });
  }

  try {
    const created = await createGame({
      company_id,
      product_type: String(product_type || 'game'),
      product_subtype: String(product_subtype || ''),
      name_ar,
      name_en,
      genre,
      release_year: year,
      price: Number(price ?? 0),
      currency: String(currency || "IQD").toUpperCase(),
      cover_image_url: coverImagePath,
      description
    });

    res.status(201).json(created);
  } catch (error) {
    console.error("Failed to create game", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/games/:id", requireAdmin, upload.single("image"), async (req, res) => {
  const id = Number(req.params.id);
  const { company_id, product_type = 'game', product_subtype = '', name_ar, name_en, genre, release_year, price, currency = "IQD", current_cover_image_url = "", description = "" } = req.body || {};
  const year = Number(release_year);
  const coverImagePath = req.file ? `/uploads/${req.file.filename}` : (req.body.cover_image_url ? String(req.body.cover_image_url).trim() : (current_cover_image_url || ""));

  // If a cover image URL was provided (and no file), validate it
  if (!req.file && coverImagePath && String(coverImagePath || '').startsWith('http')) {
    try {
      const valid = await Promise.resolve(isValidImageUrlCandidate(coverImagePath));
      if (!valid) {
        return res.status(400).json({ error: 'رابط الصورة غير صالح أو لا يشير لصيغة صورة مدعومة.' });
      }
    } catch (err) {
      return res.status(400).json({ error: 'رابط الصورة غير صالح أو لا يشير لصيغة صورة مدعومة.' });
    }
  }

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid game id" });
  }

  if (!company_id || !name_ar || !name_en || !genre || !Number.isInteger(year)) {
    return res.status(400).json({
      error: "company_id, name_ar, name_en, genre, release_year are required"
    });
  }

  if (!databaseReady) {
    const found = findFallbackGameById(id);
    if (!found) {
      return res.status(404).json({ error: "Game not found" });
    }

    const { company } = found;
    const game = found.game;

    const targetCompany = findFallbackCompanyById(company_id);
    if (!targetCompany) {
      return res.status(404).json({ error: "Company not found" });
    }

    const nextGame = {
      ...game,
      product_type: String(product_type || game.product_type || 'game'),
      product_subtype: String(product_subtype || game.product_subtype || ''),
      name_ar: String(name_ar).trim(),
      name_en: String(name_en).trim(),
      genre: String(genre).trim(),
      release_year: year,
      cover_image_url: coverImagePath || game.cover_image_url || "",
      description: String(description).trim(),
      price: Number(price ?? game.price ?? 0),
      currency: String(currency || game.currency || "IQD").toUpperCase()
    };

    if (company.id !== targetCompany.id) {
      const sourceIndex = company.games.findIndex((entry) => Number(entry.id) === Number(id));
      if (sourceIndex >= 0) {
        company.games.splice(sourceIndex, 1);
      }
      targetCompany.games.push(nextGame);
    } else {
      const sourceIndex = company.games.findIndex((entry) => Number(entry.id) === Number(id));
      if (sourceIndex >= 0) {
        company.games[sourceIndex] = nextGame;
      }
    }

    saveFallbackState();
    return res.json({ updated: true });
  }

  try {
    const affected = await updateGame(id, {
      company_id,
      product_type: String(product_type || 'game'),
      product_subtype: String(product_subtype || ''),
      name_ar,
      name_en,
      genre,
      release_year: year,
      price: Number(price ?? 0),
      currency: String(currency || "IQD").toUpperCase(),
      cover_image_url: coverImagePath,
      description
    });

    if (!affected) {
      return res.status(404).json({ error: "Game not found" });
    }

    res.json({ updated: true });
  } catch (error) {
    console.error("Failed to update game", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/games/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid game id" });
  }

  if (!databaseReady) {
    const found = findFallbackGameById(id);
    if (!found) {
      return res.status(404).json({ error: "Game not found" });
    }

    const company = found.company;
    const index = company.games.findIndex((entry) => Number(entry.id) === Number(id));
    if (index === -1) {
      return res.status(404).json({ error: "Game not found" });
    }

    company.games.splice(index, 1);
    saveFallbackState();
    return res.json({ deleted: true });
  }

  try {
    const affected = await deleteGame(id);
    if (!affected) {
      return res.status(404).json({ error: "Game not found" });
    }

    res.json({ deleted: true });
  } catch (error) {
    console.error("Failed to delete game", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.use((error, req, res, next) => {
  if (error && error.message === "Only image files are allowed") {
    return res.status(400).json({ error: "Please upload a valid image file" });
  }

  if (error && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "Image size must be 5MB or less" });
  }

  return next(error);
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/admin", (req, res) => {
  if (!req.session || req.session.isAdmin !== true) {
    return res.redirect("/login");
  }

  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/admin/password", (req, res) => {
  if (!req.session || req.session.isAdmin !== true) {
    return res.redirect("/login");
  }

  res.sendFile(path.join(__dirname, "public", "change-password.html"));
});

app.get("/game", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "game.html"));
});

app.get("/contact", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "contact.html"));
});

app.get('/checkout-review', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'checkout-review.html'));
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API route not found" });
  }

  if (req.path.includes(".")) {
    return res.status(404).send("Not Found");
  }

  return res.sendFile(path.join(__dirname, "public", "index.html"));
});

(async () => {
  const skipDatabase = String(process.env.SKIP_DB || "").toLowerCase() === "true";

  if (skipDatabase) {
    databaseReady = false;
    console.log("Database disabled via SKIP_DB=true, running in fallback mode.");
  } else {
    try {
      await initDatabase();
      databaseReady = true;
    } catch (error) {
      databaseReady = false;
      console.error("Database is not ready yet, server will continue with limited functionality.", error);
    }
  }

  ensureDataFiles();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
})();
