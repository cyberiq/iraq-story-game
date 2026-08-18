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

let runtimeAdminSettings = readJsonFile(adminSettingsPath, {
  username: ADMIN_USERNAME,
  password: ADMIN_PASSWORD
});

function saveAdminSettings() {
  writeJsonFile(adminSettingsPath, runtimeAdminSettings);
}

let runtimeCoupons = readJsonFile(couponsPath, []);

function saveCouponsFile() {
  writeJsonFile(couponsPath, runtimeCoupons);
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
      secure: false,
      maxAge: 1000 * 60 * 60 * 12
    }
  })
);
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

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "game-catalog", databaseReady });
});

app.get("/api/auth/status", (req, res) => {
  const authenticated = Boolean(req.session && req.session.isAdmin === true);
  res.json({ authenticated });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const normalizedUsername = String(username || "").trim();
  const normalizedPassword = String(password || "").trim();

  if (normalizedUsername === runtimeAdminSettings.username && normalizedPassword === runtimeAdminSettings.password) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
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
  const { company_id, product_type = 'game', name_ar, name_en, genre, release_year, price, currency = "IQD", description = "" } = req.body || {};
  const year = Number(release_year);
  const coverImagePath = req.file ? `/uploads/${req.file.filename}` : "";

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
  const { company_id, product_type = 'game', name_ar, name_en, genre, release_year, price, currency = "IQD", current_cover_image_url = "", description = "" } = req.body || {};
  const year = Number(release_year);
  const coverImagePath = req.file ? `/uploads/${req.file.filename}` : (current_cover_image_url || "");

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
