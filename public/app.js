const searchInput = document.getElementById("searchInput");
const searchSuggestions = document.getElementById('searchSuggestions');
const catalogContainer = document.getElementById("catalog");
const statusNode = document.getElementById("status");
const categoryButtons = document.querySelectorAll('.category-pill');
const offersStrip = document.getElementById('todayOffers');
const languageToggle = document.getElementById('languageToggle');
const cartButton = document.getElementById('cartButton');
const cartCount = document.getElementById('cartCount');

const companyTemplate = document.getElementById("companyTemplate");
const gameTemplate = document.getElementById("gameTemplate");

const STORAGE_NS = (() => {
  try {
    const existing = sessionStorage.getItem('iraqGameSessionNs');
    if (existing) return existing;
    const created = `iraqGame_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    sessionStorage.setItem('iraqGameSessionNs', created);
    return created;
  } catch (error) {
    console.warn('sessionStorage unavailable, falling back to single-session namespace');
    return 'iraqGame_default';
  }
})();

window.__IRAQ_GAME_SESSION_NS__ = STORAGE_NS;

function readStorageJson(key, storage) {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function getSessionValue(key, fallback) {
  const candidates = [
    `${STORAGE_NS}:${key}`,
    key,
    `iraqGameCart`
  ];

  for (const candidate of candidates) {
    const rawSession = readStorageJson(candidate, sessionStorage);
    if (rawSession !== null) return rawSession;
    const rawLocal = readStorageJson(candidate, localStorage);
    if (rawLocal !== null) return rawLocal;
  }

  return fallback;
}

function setSessionValue(key, value) {
  const storageCandidates = [
    `${STORAGE_NS}:${key}`,
    key
  ];

  for (const storageKey of storageCandidates) {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch (error) {
      console.warn('Unable to persist session state:', error);
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (error) {
      console.warn('Unable to persist cart in localStorage:', error);
    }
  }
}

function mergeCartEntries(items) {
  const merged = new Map();

  for (const item of Array.isArray(items) ? items : []) {
    if (!item || (!item.id && !item.name)) continue;
    const key = String(item.id || item.name || 'item');
    if (!merged.has(key)) {
      merged.set(key, { ...item, qty: Number(item.qty || 1) });
      continue;
    }

    const existing = merged.get(key);
    existing.qty = Number(existing.qty || 0) + Number(item.qty || 1);
    existing.price = Number(item.price || existing.price || 0);
    if (item.name) existing.name = item.name;
    if (item.product_type) existing.product_type = item.product_type;
    if (item.product_subtype) existing.product_subtype = item.product_subtype;
    if (item.cover_image_url) existing.cover_image_url = item.cover_image_url;
  }

  return Array.from(merged.values());
}

function loadCartFromStorage() {
  const sources = [
    readStorageJson(`${STORAGE_NS}:iraqGameCart`, sessionStorage),
    readStorageJson('iraqGameCart', sessionStorage),
    readStorageJson('iraqGameCart', localStorage),
    readStorageJson(`${STORAGE_NS}:iraqGameCart`, localStorage)
  ];

  const merged = [];
  for (const candidate of sources) {
    if (Array.isArray(candidate)) {
      merged.push(...candidate);
    }
  }

  return mergeCartEntries(merged);
}

async function syncCartWithLatestPrices() {
  try {
    const response = await fetch('/api/catalog');
    if (!response.ok) return;

    const payload = await response.json();
    const catalogMap = new Map();
    for (const company of payload.companies || []) {
      for (const game of company.games || []) {
        catalogMap.set(String(game.id), game);
      }
    }

    if (!catalogMap.size) return;

    const updated = cart.map((item) => {
      const latest = catalogMap.get(String(item.id));
      if (!latest) return item;
      return {
        ...item,
        price: Number(latest.price ?? item.price ?? 0),
        currency: latest.currency || item.currency || 'IQD',
        name: item.name || `${latest.name_ar || latest.name_en || ''}`
      };
    });

    if (JSON.stringify(updated) !== JSON.stringify(cart)) {
      cart = updated;
      setSessionValue('iraqGameCart', cart);
      localStorage.setItem('iraqGameCart', JSON.stringify(cart));
    }
  } catch (error) {
    console.warn('Unable to sync cart prices with latest catalog:', error);
  }
}

let debounceTimer;
let activeCategory = 'all';
let cart = loadCartFromStorage();
let language = getSessionValue('iraqGameLang', 'ar');

const localFallbackCompanies = [
  {
    id: 1,
    slug: "activision",
    name_ar: "اكتفجن",
    name_en: "Activision",
    games: [
      {
        id: 101,
        name_ar: "كول اوف ديوتي: مودرن وورفير 3",
        name_en: "Call of Duty: Modern Warfare III",
        genre: "Shooter",
        release_year: 2023,
        price: 179,
        cover_image_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/2519060/header.jpg",
        description: "جزء جديد من سلسلة Call of Duty"
      },
      {
        id: 102,
        name_ar: "كراش بانديكوت 4",
        name_en: "Crash Bandicoot 4",
        genre: "Platform",
        release_year: 2020,
        price: 89,
        cover_image_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/1378990/header.jpg",
        description: "لعبة منصات ممتعة وسريعة"
      },
      {
        id: 103,
        name_ar: "دايابلو 4",
        name_en: "Diablo IV",
        genre: "Action RPG",
        release_year: 2023,
        price: 199,
        cover_image_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/2344520/header.jpg",
        description: "تجربة أكشن RPG غامقة"
      }
    ]
  },
  {
    id: 2,
    slug: "pubg-corp",
    name_ar: "بوبجي كوربوريشن",
    name_en: "PUBG Corporation",
    games: [
      {
        id: 201,
        name_ar: "بوبجي: باتل غراوند",
        name_en: "PUBG: Battlegrounds",
        genre: "Battle Royale",
        release_year: 2017,
        price: 119,
        cover_image_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/578080/header.jpg",
        description: "لعبة باتل رويال شهيرة"
      },
      {
        id: 202,
        name_ar: "نيو ستيت موبايل",
        name_en: "New State Mobile",
        genre: "Battle Royale",
        release_year: 2021,
        price: 79,
        cover_image_url: "https://images.unsplash.com/photo-1614729939124-032f0f317cf4?auto=format&fit=crop&w=800&q=80",
        description: "نسخة موبايل حديثة"
      }
    ]
  },
  {
    id: 3,
    slug: "yalla-tech",
    name_ar: "يلا تكنولوجي",
    name_en: "Yalla Technology",
    games: [
      {
        id: 301,
        name_ar: "يلا لودو",
        name_en: "Yalla Ludo",
        genre: "Board",
        release_year: 2018,
        price: 33,
        cover_image_url: "https://images.unsplash.com/photo-1606502713237-65a5a5ed2f4e?auto=format&fit=crop&w=800&q=80",
        description: "لعبة اجتماعية أونلاين"
      },
      {
        id: 302,
        name_ar: "يلا بالوت",
        name_en: "Yalla Baloot",
        genre: "Card",
        release_year: 2021,
        price: 42,
        cover_image_url: "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=800&q=80",
        description: "تجربة أوراق لعب خليجية"
      }
    ]
  },
  {
    id: 4,
    slug: "riot",
    name_ar: "رايوت جيمز",
    name_en: "Riot Games",
    games: [
      {
        id: 401,
        name_ar: "ليغ اوف ليجندز",
        name_en: "League of Legends",
        genre: "MOBA",
        release_year: 2009,
        price: 0,
        cover_image_url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
        description: "MOBA جماعية احترافية"
      },
      {
        id: 402,
        name_ar: "فالورانت",
        name_en: "Valorant",
        genre: "Tactical Shooter",
        release_year: 2020,
        price: 0,
        cover_image_url: "https://images.unsplash.com/photo-1580327344181-c1163234e5a0?auto=format&fit=crop&w=800&q=80",
        description: "تصويب تكتيكي 5v5"
      }
    ]
  },
  {
    id: 5,
    slug: "epic-games",
    name_ar: "ايبك جيمز",
    name_en: "Epic Games",
    games: [
      {
        id: 501,
        name_ar: "فورتنايت",
        name_en: "Fortnite",
        genre: "Battle Royale",
        release_year: 2017,
        price: 0,
        cover_image_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/2878980/header.jpg",
        description: "لعبة باتل رويال سريعة"
      },
      {
        id: 502,
        name_ar: "روكيت ليغ",
        name_en: "Rocket League",
        genre: "Sports",
        release_year: 2015,
        price: 79,
        cover_image_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/252950/header.jpg",
        description: "كرة قدم بالسيارات"
      }
    ]
  },
  {
    id: 6,
    slug: "call-of-duty",
    name_ar: "كول أوف ديوتي",
    name_en: "Call of Duty",
    games: [
      {
        id: 601,
        name_ar: "كول اوف ديوتي (نداء الواجب)",
        name_en: "Call of Duty",
        genre: "Shooter",
        release_year: 2003,
        price: 59,
        currency: "IQD",
        cover_image_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/2620/header.jpg",
        description: "تدور أحداث اللعبة في الحرب العالمية الثانية عبر ثلاثة جنود مختلفين."
      },
      {
        id: 602,
        name_ar: "كول اوف ديوتي 4: المودرن وورفير",
        name_en: "Call of Duty 4: Modern Warfare",
        genre: "Shooter",
        release_year: 2007,
        price: 89,
        currency: "IQD",
        cover_image_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/7940/header.jpg",
        description: "نقلة نوعية إلى الحروب الحديثة مع قصة عن الإرهاب الدولي."
      },
      {
        id: 603,
        name_ar: "كول اوف ديوتي: مودرن وارفير 2",
        name_en: "Call of Duty: Modern Warfare 2",
        genre: "Shooter",
        release_year: 2009,
        price: 96,
        currency: "IQD",
        cover_image_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/10190/header.jpg",
        description: "تدور القصة حول فرقة المهام 141 ومواجهة التهديد الإرهابي العالمي."
      },
      {
        id: 604,
        name_ar: "كول اوف ديوتي: مودرن وارفير 3",
        name_en: "Call of Duty: Modern Warfare III",
        genre: "Shooter",
        release_year: 2023,
        price: 179,
        currency: "IQD",
        cover_image_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/2519060/header.jpg",
        description: "جزء جديد من السلسلة مع طور قصة وطور جماعي سريع."
      }
    ]
  },
  {
    id: 7,
    slug: "battlefield",
    name_ar: "باتلفيلد",
    name_en: "Battlefield",
    games: [
      {
        id: 701,
        name_ar: "باتلفيلد 1942",
        name_en: "Battlefield 1942",
        genre: "Shooter",
        release_year: 2002,
        price: 59,
        currency: "IQD",
        cover_image_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/1659900/header.jpg",
        description: "الجزء الأول من السلسلة في الحرب العالمية الثانية مع أسلوب جماعي واسع."
      },
      {
        id: 702,
        name_ar: "باتلفيلد 2",
        name_en: "Battlefield 2",
        genre: "Shooter",
        release_year: 2005,
        price: 68,
        currency: "IQD",
        cover_image_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/15320/header.jpg",
        description: "نقلة نوعية للحروب الحديثة مع القائد والكتائب."
      },
      {
        id: 703,
        name_ar: "باتلفيلد 3",
        name_en: "Battlefield 3",
        genre: "Shooter",
        release_year: 2011,
        price: 94,
        currency: "IQD",
        cover_image_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/1238840/header.jpg",
        description: "مغامرة حربية حديثة ورسومات انطباعية ومباريات جماعية ضخمة."
      },
      {
        id: 704,
        name_ar: "باتلفيلد 1",
        name_en: "Battlefield 1",
        genre: "Shooter",
        release_year: 2016,
        price: 110,
        currency: "IQD",
        cover_image_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/1238820/header.jpg",
        description: "تجربة رائعة عن الحرب العالمية الأولى بأسلوب سينمائي."
      }
    ]
  },
  {
    id: 8,
    slug: "gaming-platforms",
    name_ar: "منصات الألعاب",
    name_en: "Gaming Platforms",
    games: [
      {
        id: 801,
        name_ar: "PlayStation Plus Essential",
        name_en: "PlayStation Plus Essential",
        product_type: "subscription",
        genre: "Platform",
        release_year: 2024,
        price: 19.99,
        currency: "USD",
        cover_image_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80",
        description: "اشتراك أساسي يمنح الوصول إلى الألعاب الشهرية والخصومات واللعب الجماعي على بلايستيشن."
      },
      {
        id: 802,
        name_ar: "PlayStation Plus Extra",
        name_en: "PlayStation Plus Extra",
        product_type: "subscription",
        genre: "Platform",
        release_year: 2024,
        price: 29.99,
        currency: "USD",
        cover_image_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80",
        description: "يشمل مكتبة واسعة من الألعاب وفئات إضافية مع خدمات بلايستيشن Plus."
      },
      {
        id: 803,
        name_ar: "PlayStation Plus Premium",
        name_en: "PlayStation Plus Premium",
        product_type: "subscription",
        genre: "Platform",
        release_year: 2024,
        price: 39.99,
        currency: "USD",
        cover_image_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80",
        description: "خطة متقدمة مع ألعاب كلاسيكية وتجارب إضافية وخصائص Premium."
      },
      {
        id: 804,
        name_ar: "Xbox Game Pass Core",
        name_en: "Xbox Game Pass Core",
        product_type: "subscription",
        genre: "Platform",
        release_year: 2024,
        price: 9.99,
        currency: "USD",
        cover_image_url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80",
        description: "اشتراك أساسي للعب الجماعي عبر Xbox مع بعض المزايا الأساسية."
      },
      {
        id: 805,
        name_ar: "Xbox Game Pass Ultimate",
        name_en: "Xbox Game Pass Ultimate",
        product_type: "subscription",
        genre: "Platform",
        release_year: 2024,
        price: 19.99,
        currency: "USD",
        cover_image_url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80",
        description: "خطة شاملة لتجربة Xbox وPC وCloud مع EA Play."
      },
      {
        id: 806,
        name_ar: "Steam EA Play",
        name_en: "Steam EA Play",
        product_type: "subscription",
        genre: "Platform",
        release_year: 2024,
        price: 5.99,
        currency: "USD",
        cover_image_url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
        description: "اشتراك EA Play داخل Steam يمنح وصولاً إلى ألعاب EA المختارة."
      }
    ]
  },
  {
    id: 9,
    slug: "digital-subscriptions",
    name_ar: "الاشتراكات الرقمية",
    name_en: "Digital Subscriptions",
    games: [
      {
        id: 901,
        name_ar: "ChatGPT Plus",
        name_en: "ChatGPT Plus",
        product_type: "subscription",
        genre: "AI",
        release_year: 2024,
        price: 20,
        currency: "USD",
        cover_image_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80",
        description: "خطة OpenAI التي تعطي وصولاً إلى النماذج الحديثة ومزايا إنتاجية محسّنة."
      },
      {
        id: 902,
        name_ar: "Claude Pro",
        name_en: "Claude Pro",
        product_type: "subscription",
        genre: "AI",
        release_year: 2024,
        price: 20,
        currency: "USD",
        cover_image_url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80",
        description: "اشتراك Anthropic لدعم نماذج Claude مع حدود أعلى ومعالجة نصوص وطويلة."
      },
      {
        id: 903,
        name_ar: "Google Gemini Advanced",
        name_en: "Google Gemini Advanced",
        product_type: "subscription",
        genre: "AI",
        release_year: 2024,
        price: 19.99,
        currency: "USD",
        cover_image_url: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=800&q=80",
        description: "اشتراك Google One AI Premium مع Gemini Advanced والتخزين والتكامل مع خدمات Google."
      },
      {
        id: 904,
        name_ar: "Midjourney Basic",
        name_en: "Midjourney Basic",
        product_type: "subscription",
        genre: "AI",
        release_year: 2024,
        price: 10,
        currency: "USD",
        cover_image_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
        description: "خطة أساسية لإنشاء الصور بالذكاء الاصطناعي من خلال Midjourney."
      },
      {
        id: 905,
        name_ar: "Midjourney Standard",
        name_en: "Midjourney Standard",
        product_type: "subscription",
        genre: "AI",
        release_year: 2024,
        price: 30,
        currency: "USD",
        cover_image_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
        description: "خطة قياسية مناسبة للمستخدمين المكثفين مع سعة إنتاج أعلى."
      },
      {
        id: 906,
        name_ar: "Midjourney Pro",
        name_en: "Midjourney Pro",
        product_type: "subscription",
        genre: "AI",
        release_year: 2024,
        price: 60,
        currency: "USD",
        cover_image_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
        description: "خطة احترافية مع ميزات إنتاج أكبر وسرعة أعلى وقدرات متقدمة."
      }
    ]
  }
];

function fallbackImage(gameName) {
  const encoded = encodeURIComponent(gameName || "video game");
  return `https://source.unsplash.com/800x450/?${encoded},game`;
}

function setStatus(message) {
  if (statusNode) {
    statusNode.textContent = message;
  }
}

function formatPrice(value, currency = "IQD") {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "مجانية";
  }

  const normalizedCurrency = String(currency || "IQD").toUpperCase();
  const label = normalizedCurrency === "USD" ? "$" : "د.ع";
  return `${numericValue.toLocaleString('en-US')} ${label}`;
}

const companyBrandMap = {
  activision: { icon: "🎮", accent: "#ffca7a", soft: "rgba(255, 202, 122, 0.18)", border: "rgba(255, 202, 122, 0.32)", glow: "rgba(255, 202, 122, 0.22)", panel: "linear-gradient(180deg, rgba(46, 34, 18, 0.96), rgba(19, 23, 30, 0.98))" },
  "yalla-tech": { icon: "📱", accent: "#7dd3fc", soft: "rgba(125, 211, 252, 0.18)", border: "rgba(125, 211, 252, 0.28)", glow: "rgba(125, 211, 252, 0.20)", panel: "linear-gradient(180deg, rgba(18, 35, 47, 0.96), rgba(17, 22, 30, 0.98))" },
  battlefield: { icon: "⚔️", accent: "#ff7f6b", soft: "rgba(255, 127, 107, 0.18)", border: "rgba(255, 127, 107, 0.28)", glow: "rgba(255, 127, 107, 0.22)", panel: "linear-gradient(180deg, rgba(52, 27, 23, 0.96), rgba(18, 22, 30, 0.98))" },
  "medal-of-honor": { icon: "🏅", accent: "#c4b5fd", soft: "rgba(196, 181, 253, 0.18)", border: "rgba(196, 181, 253, 0.32)", glow: "rgba(196, 181, 253, 0.22)", panel: "linear-gradient(180deg, rgba(36, 30, 58, 0.96), rgba(17, 22, 31, 0.98))" },
  "god-of-war": { icon: "🗡️", accent: "#fda4af", soft: "rgba(253, 164, 175, 0.18)", border: "rgba(253, 164, 175, 0.28)", glow: "rgba(253, 164, 175, 0.20)", panel: "linear-gradient(180deg, rgba(50, 25, 32, 0.96), rgba(17, 24, 30, 0.98))" },
  "gaming-platforms": { icon: "🕹️", accent: "#86efac", soft: "rgba(134, 239, 172, 0.18)", border: "rgba(134, 239, 172, 0.28)", glow: "rgba(134, 239, 172, 0.22)", panel: "linear-gradient(180deg, rgba(19, 41, 28, 0.96), rgba(17, 22, 30, 0.98))" },
  "digital-subscriptions": { icon: "⚡", accent: "#a5b4fc", soft: "rgba(165, 180, 252, 0.18)", border: "rgba(165, 180, 252, 0.28)", glow: "rgba(165, 180, 252, 0.20)", panel: "linear-gradient(180deg, rgba(23, 28, 58, 0.96), rgba(17, 22, 30, 0.98))" },
  riot: { icon: "🔥", accent: "#f97316", soft: "rgba(249, 115, 22, 0.18)", border: "rgba(249, 115, 22, 0.32)", glow: "rgba(249, 115, 22, 0.20)", panel: "linear-gradient(180deg, rgba(51, 30, 15, 0.96), rgba(17, 23, 31, 0.98))" },
  epic: { icon: "🚀", accent: "#22d3ee", soft: "rgba(34, 211, 238, 0.18)", border: "rgba(34, 211, 238, 0.28)", glow: "rgba(34, 211, 238, 0.20)", panel: "linear-gradient(180deg, rgba(15, 39, 47, 0.96), rgba(17, 22, 30, 0.98))" },
  default: { icon: "🎯", accent: "#f3c98b", soft: "rgba(243, 201, 139, 0.18)", border: "rgba(243, 201, 139, 0.28)", glow: "rgba(243, 201, 139, 0.20)", panel: "linear-gradient(180deg, rgba(41, 30, 20, 0.96), rgba(17, 22, 30, 0.98))" }
};

function getCompanyBrand(company) {
  const key = String(company?.slug || "").toLowerCase();
  const fallbackKey = String(company?.name_en || "").toLowerCase();
  const brand = companyBrandMap[key] || companyBrandMap[fallbackKey] || companyBrandMap.default;
  return brand;
}

function createGameNode(game) {
  const node = gameTemplate.content.firstElementChild.cloneNode(true);
  const gameCover = node.querySelector(".game-cover");
  const gameName = node.querySelector(".game-name");
  const gameMeta = node.querySelector(".game-meta");
  const gamePrice = node.querySelector(".game-price");
  const detailsLink = node.querySelector(".details-link");
  const addToCartBtn = node.querySelector(".add-to-cart");

  node.dataset.gameId = String(game.id);
  gameCover.src = game.cover_image_url || fallbackImage(game.name_en);
  gameCover.alt = `${game.name_ar} / ${game.name_en}`;
  gameCover.addEventListener("error", () => {
    gameCover.src = fallbackImage(game.name_en);
  });

  gameName.textContent = `${game.name_ar} / ${game.name_en}`;
  gameMeta.textContent = `${game.genre} - ${game.release_year}`;
  gamePrice.textContent = formatPrice(game.price ?? game.price_num ?? 0, game.currency || "IQD");
  detailsLink.textContent = language === 'en' ? 'Buy now' : 'اشتر الآن';
  detailsLink.href = `/game?id=${game.id}`;
  addToCartBtn.textContent = language === 'en' ? 'Add to cart' : 'إضافة للسلة';
  addToCartBtn.addEventListener('click', () => {
    const nextCart = [...cart];
    const index = nextCart.findIndex((item) => Number(item.id) === Number(game.id));
    if (index >= 0) {
      nextCart[index].qty += 1;
    } else {
      nextCart.push({
        id: game.id,
        qty: 1,
        name: `${game.name_ar} / ${game.name_en}`,
        price: Number(game.price || 0),
        product_type: String(game.product_type || 'game'),
        product_subtype: String(game.product_subtype || ''),
        company: game.company || null,
        cover_image_url: game.cover_image_url || ''
      });
    }
    cart = nextCart;
    setSessionValue('iraqGameCart', cart);
    localStorage.setItem('iraqGameCart', JSON.stringify(cart));
    renderCart();
    // animate a flying image to the cart if widget is available
    try { if (window.animateAddToCart) window.animateAddToCart(gameCover); } catch (e) {}
    // immediately show cart panel so user sees feedback
    showCart();
  });

  return node;
}

function createCompanyNode(company) {
  const node = companyTemplate.content.firstElementChild.cloneNode(true);
  const name = node.querySelector(".company-name");
  const slug = node.querySelector(".company-slug");
  const icon = node.querySelector(".company-icon");
  const badge = node.querySelector(".company-pill");
  const gamesList = node.querySelector(".games-list");
  const brand = getCompanyBrand(company);

  name.textContent = `${company.name_ar} / ${company.name_en}`;
  slug.textContent = company.slug;
  icon.textContent = brand.icon;
  icon.style.background = `linear-gradient(135deg, ${brand.accent}, rgba(255,255,255,0.12))`;
  icon.style.boxShadow = `0 12px 28px ${brand.glow}`;
  node.style.background = brand.panel;
  node.style.borderColor = brand.border;
  node.style.boxShadow = `0 18px 36px ${brand.glow}`;
  badge.textContent = `${company.games.length} ألعاب`;
  badge.style.color = brand.accent;
  badge.style.borderColor = `${brand.accent}90`;
  badge.style.background = brand.soft;

  company.games.forEach((game) => {
    // attach parent company info to game so cart items include company/product_type
    game.company = { id: company.id, slug: company.slug, name_ar: company.name_ar, name_en: company.name_en };
    const gameNode = createGameNode(game);
    gameNode.style.borderColor = `${brand.accent}33`;
    gameNode.style.boxShadow = `inset 0 0 0 1px ${brand.soft}`;
    gamesList.appendChild(gameNode);
  });

  return node;
}

function getCategoryMatches(game, category) {
  const name = `${game.name_ar || ''} ${game.name_en || ''}`.toLowerCase();
  const productType = String(game.product_type || '').toLowerCase();
  const genre = String(game.genre || '').toLowerCase();

  switch (category) {
    case 'games':
      return !productType || productType === 'game';
    case 'subscriptions':
      return productType.includes('subscription') || productType.includes('sub') || genre.includes('ai') || genre.includes('platform');
    case 'services':
      return productType === 'service' || productType.includes('social') || name.includes('متابع') || name.includes('اعجاب') || name.includes('مشاهد');
    case 'playstation':
      return name.includes('playstation') || name.includes('ps ') || name.includes('sony');
    case 'xbox':
      return name.includes('xbox') || name.includes('game pass') || name.includes('xbox game');
    case 'deals':
      return Number(game.price ?? 0) > 0 && (Number(game.price) < 80 || productType.includes('subscription'));
    default:
      return true;
  }
}

function filterCompaniesByCategory(companies, category) {
  if (!category || category === 'all') {
    return companies;
  }

  return companies
    .map((company) => ({
      ...company,
      games: (company.games || []).filter((game) => getCategoryMatches(game, category))
    }))
    .filter((company) => company.games.length > 0);
}

function renderCatalog(companies) {
  catalogContainer.innerHTML = "";

  const filteredCompanies = filterCompaniesByCategory(companies, activeCategory);

  if (!filteredCompanies.length) {
    // render a full-page friendly no-results state using the 404 style
    catalogContainer.innerHTML = `
      <section class="page_404">
        <div class="container">
          <div class="four_zero_four_bg">
            <h1 class="text-center">لا توجد نتائج</h1>
          </div>
          <div class="contant_box_404">
            <h3 class="h2">لم يتم العثور على عناصر مطابقة</h3>
            <p>حاول تغيير مصطلح البحث أو اختيار تصنيف آخر.</p>
            <a href="/" class="link_404">العودة للرئيسية</a>
          </div>
        </div>
      </section>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();
  filteredCompanies.forEach((company) => {
    company.games.forEach((game) => {
      const node = createGameNode(game);
      const meta = node.querySelector('.game-meta');
      if (meta) {
        const companyLabel = company.name_ar || company.name_en || 'Game';
        const genreLabel = game.genre || 'Game';
        meta.textContent = `${companyLabel} · ${genreLabel}`;
      }
      fragment.appendChild(node);
    });
  });
  catalogContainer.appendChild(fragment);
}

function sortGamesInCompanies(companies, sort) {
  const sortedCompanies = companies.map((company) => ({
    ...company,
    games: [...company.games]
  }));

  for (const company of sortedCompanies) {
    company.games.sort((a, b) => {
      if (sort === "name_desc") {
        return String(b.name_en).localeCompare(String(a.name_en));
      }

      if (sort === "year_asc") {
        return Number(a.release_year) - Number(b.release_year);
      }

      if (sort === "year_desc") {
        return Number(b.release_year) - Number(a.release_year);
      }

      return String(a.name_en).localeCompare(String(b.name_en));
    });
  }

  if (sort === "company_asc") {
    sortedCompanies.sort((a, b) => String(a.name_en).localeCompare(String(b.name_en)));
  }

  return sortedCompanies;
}

function filterCompanies(companies, search) {
  const term = search.trim().toLowerCase();
  if (!term) {
    return companies;
  }

  const output = [];
  for (const company of companies) {
    const companyMatch =
      String(company.name_ar).toLowerCase().includes(term) ||
      String(company.name_en).toLowerCase().includes(term);

    const games = company.games.filter(
      (game) =>
        String(game.name_ar).toLowerCase().includes(term) ||
        String(game.name_en).toLowerCase().includes(term)
    );

    if (companyMatch || games.length) {
      output.push({
        ...company,
        games: companyMatch ? company.games : games
      });
    }
  }

  return output;
}

async function fetchFallbackCatalog(search, sort) {
  const filtered = filterCompanies(localFallbackCompanies, search);
  return sortGamesInCompanies(filtered, sort);
}

async function fetchCatalog() {
  const search = searchInput.value.trim();
  const sort = 'name_asc'; // sorting disabled in UI; use default server-side ordering
  const params = new URLSearchParams({ search, sort });

  setStatus("جاري تحميل البيانات...");

  try {
    const response = await fetch(`/api/catalog?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const payload = await response.json();
    const companies = payload.companies || [];

    const gameCount = companies.reduce((sum, company) => sum + company.games.length, 0);
    setStatus(`عدد الشركات: ${companies.length} - عدد الألعاب: ${gameCount}`);
    renderCatalog(companies);
  } catch (error) {
    console.error(error);
    try {
      const companies = await fetchFallbackCatalog(search, sort);
      const gameCount = companies.reduce((sum, company) => sum + company.games.length, 0);
      setStatus(`وضع العرض المحلي: ${companies.length} شركة - ${gameCount} لعبة`);
      renderCatalog(companies);
    } catch (fallbackError) {
      console.error(fallbackError);
      setStatus("تعذر تحميل البيانات حاليًا.");
      renderCatalog([]);
    }
  }
}

function onSearchInput() {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    fetchCatalog();
    fetchSuggestions();
  }, 260);
}

function updateCategoryButtons() {
  categoryButtons.forEach((button) => {
    const isActive = button.dataset.filter === activeCategory;
    button.classList.toggle('active', isActive);
  });
}

if (categoryButtons.length) {
  categoryButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeCategory = button.dataset.filter || 'all';
      updateCategoryButtons();
      fetchCatalog();
    });
  });
}

if (searchInput) {
  searchInput.addEventListener("input", onSearchInput);
}

async function fetchSuggestions() {
  const term = searchInput.value.trim();
  if (!term) {
    searchSuggestions.innerHTML = '';
    return;
  }

  try {
    const params = new URLSearchParams({ search: term, sort: 'name_asc' });
    const response = await fetch(`/api/catalog?${params.toString()}`);
    if (!response.ok) return;
    const payload = await response.json();
    const companies = payload.companies || [];
    const set = new Set();
    searchSuggestions.innerHTML = '';
    for (const company of companies) {
      set.add(company.name_ar);
      set.add(company.name_en);
      for (const g of company.games || []) {
        set.add(g.name_ar);
        set.add(g.name_en);
      }
    }

    for (const s of Array.from(set).slice(0, 20)) {
      const opt = document.createElement('option');
      opt.value = s;
      searchSuggestions.appendChild(opt);
    }
  } catch (err) {
    // ignore
  }
}

function getLineTotalForItem(item) {
  const qty = Number(item?.qty || 1);
  const unitPrice = Number(item?.price || 0);
  const isService = String(item?.product_type || '').toLowerCase() === 'service';
  return isService ? unitPrice * (qty / 1000) : unitPrice * qty;
}

function renderCart() {
  void syncCartWithLatestPrices();
  const count = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  if (cartCount) cartCount.textContent = String(count);

  const cartPanel = document.getElementById('cartPanel');
  if (!cartPanel) {
    const panel = document.createElement('div');
    panel.id = 'cartPanel';
    panel.className = 'cart-panel hidden';
    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h3 style="margin: 0;">السلة</h3>
        <button type="button" id="clearCartBtn" style="background: #ff6b6b; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">إفراغ السلة</button>
      </div>
      <div class="cart-items"></div>
      <div style="display: flex; gap: 10px; margin-top: 15px;">
        <button type="button" id="completeOrderBtn" class="details-link" style="flex: 1; width: auto;">إتمام الطلب</button>
      </div>
    `;
    document.body.appendChild(panel);
    
    document.getElementById('completeOrderBtn').addEventListener('click', () => {
      if (cart.length === 0) {
        alert(language === 'en' ? 'Your cart is empty!' : 'السلة فارغة!');
        return;
      }
      setSessionValue('iraqGameCheckoutReview', {
        name: '',
        phone: '',
        email: '',
        notes: '',
        coupon: getSessionValue('iraqGameCoupon', ''),
        discountPercent: Number(getSessionValue('iraqGameDiscountPercent', 0))
      });
      window.location.href = '/checkout-review.html';
    });

    document.getElementById('clearCartBtn').addEventListener('click', () => {
      if (cart.length === 0) {
        alert(language === 'en' ? 'Your cart is already empty!' : 'السلة فارغة بالفعل!');
        return;
      }
      if (confirm(language === 'en' ? 'Are you sure you want to clear the cart?' : 'هل تأكد من إفراغ السلة؟')) {
        cart = [];
        setSessionValue('iraqGameCart', cart);
        localStorage.setItem('iraqGameCart', JSON.stringify(cart));
        renderCart();
      }
    });
  }

  const panel = document.getElementById('cartPanel');
  const itemsWrap = panel.querySelector('.cart-items');
  if (!itemsWrap) return;

  if (!cart.length) {
    itemsWrap.innerHTML = `
      <div style="padding: 18px 12px; text-align: center; color: #a9b2d0; border: 1px dashed rgba(255,255,255,0.12); border-radius: 12px; background: rgba(255,255,255,0.02);">
        سلة التسوق فارغة
      </div>
    `;
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + getLineTotalForItem(item), 0);
  const discountPercent = Number(getSessionValue('iraqGameDiscountPercent', 0));
  const discount = Math.round(subtotal * (discountPercent / 100));
  const total = Math.max(0, subtotal - discount);

  itemsWrap.innerHTML = `
    <div style="padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 12px;">
      ${cart.map((item, idx) => {
        const qty = Number(item.qty || 1);
        const unitPrice = Number(item.price || 0);
        const isService = String(item.product_type || '').toLowerCase() === 'service';
        const lineTotal = getLineTotalForItem(item);
        const summaryText = isService
          ? `${qty.toLocaleString('en-US')} × ${unitPrice.toLocaleString('en-US')} = ${lineTotal.toLocaleString('en-US')} د.ع`
          : `${qty} × ${unitPrice.toLocaleString('en-US')} د.ع`;

        return `
        <div style="display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px dashed rgba(255,255,255,0.08);">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 13px; font-weight: 700; line-height: 1.5; color: #f5f7ff;">${item.name}</div>
            <div style="font-size: 12px; color: #8ad8ff; margin-top: 2px;">${isService ? `كل 1000 وحدة = ${unitPrice.toLocaleString('en-US')} د.ع` : `${summaryText}`} </div>
            ${isService ? `<div style="font-size: 11px; color: #cfe7ff; margin-top: 4px;">المجموع: ${summaryText}</div>` : ''}
          </div>
          <div style="font-size: 12px; color: #f2c66b; font-weight: 700; min-width: 70px; text-align: left;">${lineTotal.toLocaleString('en-US')} د.ع</div>
          <button type="button" class="delete-item-btn" data-index="${idx}" style="background: rgba(255, 108, 120, 0.12); color: #ffb6c0; border: 1px solid rgba(255, 108, 120, 0.2); padding: 6px 8px; border-radius: 8px; cursor: pointer; font-size: 11px;">حذف</button>
        </div>
      `;
      }).join('')}
    </div>

    <div style="display: grid; gap: 8px; font-size: 12.5px; color: #dfe5ff;">
      <div style="display: flex; justify-content: space-between; gap: 10px;">
        <span>المجموع</span>
        <span>${subtotal.toLocaleString('en-US')} د.ع</span>
      </div>
      <div style="display: flex; justify-content: space-between; gap: 10px;">
        <span>الخصم</span>
        <span>-${discount.toLocaleString('en-US')} د.ع</span>
      </div>
      <div style="display: flex; justify-content: space-between; gap: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); font-weight: 800; color: #f7d782; font-size: 13px;">
        <span>الإجمالي</span>
        <span>${total.toLocaleString('en-US')} د.ع</span>
      </div>
    </div>
  `;

  // Add delete handlers for each item
  panel.querySelectorAll('.delete-item-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.target.dataset.index);
      cart = cart.filter((_, i) => i !== idx);
      setSessionValue('iraqGameCart', cart);
      renderCart();
    });
  });
}

function toggleCart() {
  const panel = document.getElementById('cartPanel');
  if (!panel) return;
  panel.classList.toggle('hidden');
}

// Show cart panel (used to give instant feedback when adding an item)
function showCart() {
  const panel = document.getElementById('cartPanel');
  if (!panel) return;
  panel.classList.remove('hidden');
  panel.style.transition = 'transform 0.18s ease, box-shadow 0.18s ease';
  panel.style.transform = 'translateY(-6px)';
  setTimeout(() => {
    panel.style.transform = '';
  }, 220);
}

async function fetchTodayOffers() {
  try {
    const response = await fetch('/api/today-offers');
    if (!response.ok) return;
    const payload = await response.json();
    const offers = (payload.offers || []).filter((offer) => offer.active !== false);

    if (!offersStrip) return;
    if (!offers.length) {
      offersStrip.innerHTML = '<span class="offer-pill">أفضل العروض</span>';
      return;
    }

    offersStrip.innerHTML = offers.slice(0, 5).map((offer) => {
      const title = offer.title || 'عرض اليوم';
      const detail = Number(offer.percent || 0)
        ? `${Number(offer.percent)}% خصم`
        : `${Number(offer.price || 0).toLocaleString('en-US')} د.ع`;
      return `<span class="offer-pill">${title}: ${detail}</span>`;
    }).join('');
  } catch (error) {
    console.error(error);
  }
}

function applyLanguage() {
  const isEnglish = language === 'en';
  document.documentElement.lang = isEnglish ? 'en' : 'ar';
  document.documentElement.dir = isEnglish ? 'ltr' : 'rtl';

  if (languageToggle) {
    languageToggle.textContent = isEnglish ? 'EN / AR' : 'AR / EN';
  }

  const brandName = document.querySelector('.brand-wrap span');
  if (brandName) {
    brandName.textContent = isEnglish ? 'Iraq Game' : 'متجر العراق';
  }

  const searchPlaceholder = isEnglish ? 'Search for a game or company...' : 'ابحث عن لعبة أو شركة...';
  const searchInputEl = document.getElementById('searchInput');
  if (searchInputEl) searchInputEl.placeholder = searchPlaceholder;

  const categoryLabels = {
    all: isEnglish ? 'All games' : 'كل الألعاب',
    games: isEnglish ? 'Games' : 'ألعاب',
    subscriptions: isEnglish ? 'Subscriptions' : 'اشتراكات',
    playstation: isEnglish ? 'PlayStation' : 'بلايستيشن',
    xbox: isEnglish ? 'Xbox' : 'إكس بوكس',
    deals: isEnglish ? 'Today deals' : 'عروض اليوم'
  };

  categoryButtons.forEach((button) => {
    const key = button.dataset.filter || 'all';
    button.textContent = categoryLabels[key] || button.textContent;
  });

  if (cartButton) {
    const cartText = isEnglish ? 'Cart' : 'السلة';
    const count = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    cartButton.innerHTML = `${cartText} <span id="cartCount">${count}</span>`;
  }

  const heroKicker = document.querySelector('.hero-kicker');
  if (heroKicker) heroKicker.textContent = isEnglish ? 'Game catalog' : 'كل الألعاب';
  const heroTitle = document.querySelector('.market-hero h1');
  if (heroTitle) heroTitle.textContent = isEnglish ? 'All Games' : 'كل الألعاب';
  const heroSubtitle = document.querySelector('.hero-subtitle');
  if (heroSubtitle) heroSubtitle.textContent = isEnglish ? 'Browse the full catalog of games and subscriptions in one clean storefront.' : 'تصفح جميع الألعاب والاشتراكات في واجهة متجر واحدة واضحة وسهلة.';

  renderCart();
}

languageToggle.addEventListener('click', () => {
  language = language === 'ar' ? 'en' : 'ar';
  setSessionValue('iraqGameLang', language);
  applyLanguage();
  fetchCatalog();
});

cartButton.addEventListener('click', toggleCart);

window.addEventListener('click', (event) => {
  const panel = document.getElementById('cartPanel');
  if (!panel) return;
  if (panel.classList.contains('hidden')) return;
  if (!panel.contains(event.target) && event.target !== cartButton) {
    panel.classList.add('hidden');
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  if (cartButton) {
    cartButton.addEventListener('click', toggleCart);
  }

  renderCart();
  applyLanguage();
  await fetchTodayOffers();
  fetchCatalog();
});
