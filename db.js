const mariadb = require("mariadb");

const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "gameapp",
  password: process.env.DB_PASSWORD || "gameapp_password",
  database: process.env.DB_NAME || "game_catalog",
  connectionLimit: 8
};

const seedData = [
  {
    slug: "activision",
    name_ar: "اكتفجن",
    name_en: "Activision",
    games: [
      {
        name_ar: "كول اوف ديوتي: مودرن وورفير 3",
        name_en: "Call of Duty: Modern Warfare III",
        genre: "Shooter",
        release_year: 2023,
        price: 179,
        currency: "IQD",
        cover_image_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/2519060/header.jpg",
        description: "جزء جديد من سلسلة Call of Duty مع طور قصة وطور جماعي سريع."
      },
      {
        name_ar: "كراش بانديكوت 4",
        name_en: "Crash Bandicoot 4",
        genre: "Platform",
        release_year: 2020,
        price: 89,
        currency: "IQD",
        cover_image_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/1378990/header.jpg",
        description: "لعبة منصات كلاسيكية سريعة بإيقاع ممتع وتحديات متتالية."
      },
      {
        name_ar: "دايابلو 4",
        name_en: "Diablo IV",
        genre: "Action RPG",
        release_year: 2023,
        price: 199,
        currency: "IQD",
        cover_image_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/2344520/header.jpg",
        description: "تجربة اكشن RPG مظلمة مع عالم مفتوح وزعماء أقوياء."
      }
    ]
  },
  {
    slug: "pubg-corp",
    name_ar: "بوبجي كوربوريشن",
    name_en: "PUBG Corporation",
    games: [
      {
        name_ar: "بوبجي: باتل غراوند",
        name_en: "PUBG: Battlegrounds",
        genre: "Battle Royale",
        release_year: 2017,
        price: 119,
        currency: "IQD",
        cover_image_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/578080/header.jpg",
        description: "أشهر ألعاب الباتل رويال بتكتيك واقعي وتنوع خرائط."
      },
      {
        name_ar: "نيو ستيت موبايل",
        name_en: "New State Mobile",
        genre: "Battle Royale",
        release_year: 2021,
        price: 79,
        currency: "USD",
        cover_image_url: "https://images.unsplash.com/photo-1614729939124-032f0f317cf4?auto=format&fit=crop&w=800&q=80",
        description: "نسخة موبايل حديثة بعناصر مستقبلية وأسلوب سريع."
      }
    ]
  },
  {
    slug: "yalla-tech",
    name_ar: "يلا تكنولوجي",
    name_en: "Yalla Technology",
    games: [
      {
        name_ar: "يلا لودو",
        name_en: "Yalla Ludo",
        genre: "Board",
        release_year: 2018,
        price: 33,
        currency: "IQD",
        cover_image_url: "https://images.unsplash.com/photo-1606502713237-65a5a5ed2f4e?auto=format&fit=crop&w=800&q=80",
        description: "لعبة اجتماعية أونلاين تعتمد على لودو والدردشة الصوتية."
      },
      {
        name_ar: "يلا بالوت",
        name_en: "Yalla Baloot",
        genre: "Card",
        release_year: 2021,
        price: 42,
        currency: "IQD",
        cover_image_url: "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=800&q=80",
        description: "تجربة أوراق لعب خليجية تنافسية مع غرف أصدقاء."
      }
    ]
  },
  {
    slug: "riot",
    name_ar: "رايوت جيمز",
    name_en: "Riot Games",
    games: [
      {
        name_ar: "ليغ اوف ليجندز",
        name_en: "League of Legends",
        genre: "MOBA",
        release_year: 2009,
        price: 0,
        cover_image_url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
        description: "MOBA جماعية تعتمد على اختيار الأبطال والخطط الدقيقة."
      },
      {
        name_ar: "فالورانت",
        name_en: "Valorant",
        genre: "Tactical Shooter",
        release_year: 2020,
        price: 0,
        cover_image_url: "https://images.unsplash.com/photo-1580327344181-c1163234e5a0?auto=format&fit=crop&w=800&q=80",
        description: "تصويب تكتيكي 5v5 مع قدرات وكلاء متنوعة."
      }
    ]
  },
  {
    slug: "epic-games",
    name_ar: "ايبك جيمز",
    name_en: "Epic Games",
    games: [
      {
        name_ar: "فورتنايت",
        name_en: "Fortnite",
        genre: "Battle Royale",
        release_year: 2017,
        price: 0,
        cover_image_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/2878980/header.jpg",
        description: "لعبة باتل رويال بإيقاع سريع مع بناء ومعارك مستمرة."
      },
      {
        name_ar: "روكيت ليغ",
        name_en: "Rocket League",
        genre: "Sports",
        release_year: 2015,
        price: 79,
        cover_image_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/252950/header.jpg",
        description: "كرة قدم بالسيارات تجمع بين المهارة والسرعة."
      }
    ]
  }
];

const pool = mariadb.createPool(dbConfig);

async function ensureDatabase() {
  const adminConn = await mariadb.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password
  });

  try {
    await adminConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await adminConn.end();
  }
}

async function createSchema(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(80) NOT NULL UNIQUE,
      name_ar VARCHAR(120) NOT NULL,
      name_en VARCHAR(120) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS games (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      name_ar VARCHAR(180) NOT NULL,
      name_en VARCHAR(180) NOT NULL,
      genre VARCHAR(80) NOT NULL,
      release_year INT NOT NULL,
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      currency VARCHAR(10) NOT NULL DEFAULT 'IQD',
      cover_color VARCHAR(20) NULL,
      cover_image_url VARCHAR(600) NULL,
      description TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_games_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      INDEX idx_games_release_year (release_year),
      INDEX idx_games_name_en (name_en),
      INDEX idx_games_name_ar (name_ar)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query("ALTER TABLE games ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(600) NULL");
  await conn.query("ALTER TABLE games ADD COLUMN IF NOT EXISTS description TEXT NULL");
  await conn.query("ALTER TABLE games ADD COLUMN IF NOT EXISTS cover_color VARCHAR(20) NULL");
  await conn.query("ALTER TABLE games ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) NOT NULL DEFAULT 0");
  await conn.query("ALTER TABLE games ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'IQD'");
  await conn.query("ALTER TABLE games MODIFY COLUMN cover_color VARCHAR(20) NULL");
}

async function seedIfEmpty(conn) {
  const rows = await conn.query("SELECT COUNT(*) AS total FROM companies");
  if (rows[0].total > 0) {
    return;
  }

  for (const company of seedData) {
    const result = await conn.query(
      "INSERT INTO companies (slug, name_ar, name_en) VALUES (?, ?, ?)",
      [company.slug, company.name_ar, company.name_en]
    );

    const companyId = Number(result.insertId);
    for (const game of company.games) {
      await conn.query(
        "INSERT INTO games (company_id, name_ar, name_en, genre, release_year, price, currency, cover_color, cover_image_url, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          companyId,
          game.name_ar,
          game.name_en,
          game.genre,
          game.release_year,
          Number(game.price ?? 0),
          String(game.currency || "IQD").toUpperCase(),
          null,
          game.cover_image_url,
          game.description
        ]
      );
    }
  }
}

async function backfillImages(conn) {
  for (const company of seedData) {
    for (const game of company.games) {
      await conn.query(
        `
        UPDATE games
        SET cover_image_url = COALESCE(cover_image_url, ?),
            description = COALESCE(description, ?),
            price = COALESCE(price, ?),
            currency = COALESCE(currency, ?)
        WHERE name_en = ?
        `,
        [game.cover_image_url, game.description, Number(game.price ?? 0), String(game.currency || "IQD").toUpperCase(), game.name_en]
      );
    }
  }
}

function buildOrderBy(sort) {
  switch (sort) {
    case "name_desc":
      return "g.name_en DESC";
    case "year_asc":
      return "g.release_year ASC";
    case "year_desc":
      return "g.release_year DESC";
    case "company_asc":
      return "c.name_en ASC, g.name_en ASC";
    default:
      return "g.name_en ASC";
  }
}

async function initDatabase() {
  await ensureDatabase();
  const conn = await pool.getConnection();

  try {
    await createSchema(conn);
    await seedIfEmpty(conn);
    await backfillImages(conn);
  } finally {
    conn.release();
  }
}

async function getCatalog({ search = "", sort = "name_asc" }) {
  const conn = await pool.getConnection();
  const term = `%${search.trim()}%`;
  const orderBy = buildOrderBy(sort);

  try {
    const rows = await conn.query(
      `
      SELECT
        c.id AS company_id,
        c.slug,
        c.name_ar AS company_name_ar,
        c.name_en AS company_name_en,
        g.id AS game_id,
        g.name_ar AS game_name_ar,
        g.name_en AS game_name_en,
        g.genre,
        g.release_year,
        g.price,
        g.currency,
        g.cover_image_url,
        g.description
      FROM companies c
      JOIN games g ON g.company_id = c.id
      WHERE
        (? = '%%')
        OR c.name_ar LIKE ?
        OR c.name_en LIKE ?
        OR g.name_ar LIKE ?
        OR g.name_en LIKE ?
      ORDER BY ${orderBy}
      `,
      [term, term, term, term, term]
    );

    const companyMap = new Map();
    for (const row of rows) {
      if (!companyMap.has(row.company_id)) {
        companyMap.set(row.company_id, {
          id: row.company_id,
          slug: row.slug,
          name_ar: row.company_name_ar,
          name_en: row.company_name_en,
          games: []
        });
      }

      companyMap.get(row.company_id).games.push({
        id: row.game_id,
        name_ar: row.game_name_ar,
        name_en: row.game_name_en,
        genre: row.genre,
        release_year: row.release_year,
        price: Number(row.price ?? 0),
        currency: row.currency || "IQD",
        cover_image_url: row.cover_image_url,
        description: row.description
      });
    }

    return Array.from(companyMap.values());
  } finally {
    conn.release();
  }
}

async function getGameDetailsById(id) {
  const conn = await pool.getConnection();

  try {
    const rows = await conn.query(
      `
      SELECT
        g.id,
        g.name_ar,
        g.name_en,
        g.genre,
        g.release_year,
        g.price,
        g.currency,
        g.cover_image_url,
        g.description,
        c.id AS company_id,
        c.slug AS company_slug,
        c.name_ar AS company_name_ar,
        c.name_en AS company_name_en
      FROM games g
      JOIN companies c ON c.id = g.company_id
      WHERE g.id = ?
      LIMIT 1
      `,
      [Number(id)]
    );

    if (!rows.length) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      name_ar: row.name_ar,
      name_en: row.name_en,
      genre: row.genre,
      release_year: row.release_year,
      price: Number(row.price ?? 0),
      currency: row.currency || "IQD",
      cover_image_url: row.cover_image_url,
      description: row.description,
      company: {
        id: row.company_id,
        slug: row.company_slug,
        name_ar: row.company_name_ar,
        name_en: row.company_name_en
      }
    };
  } finally {
    conn.release();
  }
}

async function getCompaniesList() {
  const conn = await pool.getConnection();

  try {
    const rows = await conn.query(
      `
      SELECT id, slug, name_ar, name_en
      FROM companies
      ORDER BY name_en ASC
      `
    );

    return rows;
  } finally {
    conn.release();
  }
}

async function createCompany({ slug, name_ar, name_en }) {
  const conn = await pool.getConnection();

  try {
    const result = await conn.query(
      "INSERT INTO companies (slug, name_ar, name_en) VALUES (?, ?, ?)",
      [slug.trim(), name_ar.trim(), name_en.trim()]
    );

    return { id: Number(result.insertId) };
  } finally {
    conn.release();
  }
}

async function updateCompany(id, { slug, name_ar, name_en }) {
  const conn = await pool.getConnection();

  try {
    const result = await conn.query(
      "UPDATE companies SET slug = ?, name_ar = ?, name_en = ? WHERE id = ?",
      [slug.trim(), name_ar.trim(), name_en.trim(), Number(id)]
    );

    return Number(result.affectedRows || 0);
  } finally {
    conn.release();
  }
}

async function createGame({
  company_id,
  name_ar,
  name_en,
  genre,
  release_year,
  price,
  currency,
  cover_image_url,
  description
}) {
  const conn = await pool.getConnection();

  try {
    const result = await conn.query(
      `
      INSERT INTO games
      (company_id, name_ar, name_en, genre, release_year, price, currency, cover_color, cover_image_url, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number(company_id),
        name_ar.trim(),
        name_en.trim(),
        genre.trim(),
        Number(release_year),
        Number(price ?? 0),
        String(currency || "IQD").toUpperCase(),
        null,
        (cover_image_url || "").trim() || null,
        (description || "").trim() || null
      ]
    );

    return { id: Number(result.insertId) };
  } finally {
    conn.release();
  }
}

async function updateGame(
  id,
  { company_id, name_ar, name_en, genre, release_year, price, currency, cover_image_url, description }
) {
  const conn = await pool.getConnection();

  try {
    const result = await conn.query(
      `
      UPDATE games
      SET company_id = ?,
          name_ar = ?,
          name_en = ?,
          genre = ?,
          release_year = ?,
          price = ?,
          currency = ?,
          cover_image_url = ?,
          description = ?
      WHERE id = ?
      `,
      [
        Number(company_id),
        name_ar.trim(),
        name_en.trim(),
        genre.trim(),
        Number(release_year),
        Number(price ?? 0),
        String(currency || "IQD").toUpperCase(),
        (cover_image_url || "").trim() || null,
        (description || "").trim() || null,
        Number(id)
      ]
    );

    return Number(result.affectedRows || 0);
  } finally {
    conn.release();
  }
}

async function deleteCompany(id) {
  const conn = await pool.getConnection();

  try {
    const result = await conn.query("DELETE FROM companies WHERE id = ?", [Number(id)]);
    return Number(result.affectedRows || 0);
  } finally {
    conn.release();
  }
}

async function deleteGame(id) {
  const conn = await pool.getConnection();

  try {
    const result = await conn.query("DELETE FROM games WHERE id = ?", [Number(id)]);
    return Number(result.affectedRows || 0);
  } finally {
    conn.release();
  }
}

module.exports = {
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
};
