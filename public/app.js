const searchInput = document.getElementById("searchInput");
const searchSuggestions = document.getElementById('searchSuggestions');
const catalogContainer = document.getElementById("catalog");
const statusNode = document.getElementById("status");

const companyTemplate = document.getElementById("companyTemplate");
const gameTemplate = document.getElementById("gameTemplate");

let debounceTimer;

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
  }
];

function fallbackImage(gameName) {
  const encoded = encodeURIComponent(gameName || "video game");
  return `https://source.unsplash.com/800x450/?${encoded},game`;
}

function setStatus(message) {
  statusNode.textContent = message;
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

function createGameNode(game) {
  const node = gameTemplate.content.firstElementChild.cloneNode(true);
  const gameCover = node.querySelector(".game-cover");
  const gameName = node.querySelector(".game-name");
  const gameMeta = node.querySelector(".game-meta");
  const gamePrice = node.querySelector(".game-price");
  const detailsLink = node.querySelector(".details-link");

  gameCover.src = game.cover_image_url || fallbackImage(game.name_en);
  gameCover.alt = `${game.name_ar} / ${game.name_en}`;
  gameCover.addEventListener("error", () => {
    gameCover.src = fallbackImage(game.name_en);
  });

  gameName.textContent = `${game.name_ar} / ${game.name_en}`;
  gameMeta.textContent = `${game.genre} - ${game.release_year}`;
  gamePrice.textContent = formatPrice(game.price ?? game.price_num ?? 0, game.currency || "IQD");
  detailsLink.href = `/game?id=${game.id}`;

  return node;
}

function createCompanyNode(company) {
  const node = companyTemplate.content.firstElementChild.cloneNode(true);
  const name = node.querySelector(".company-name");
  const slug = node.querySelector(".company-slug");
  const gamesList = node.querySelector(".games-list");

  name.textContent = `${company.name_ar} / ${company.name_en}`;
  slug.textContent = company.slug;

  company.games.forEach((game) => {
    gamesList.appendChild(createGameNode(game));
  });

  return node;
}

function renderCatalog(companies) {
  catalogContainer.innerHTML = "";

  if (!companies.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "لا توجد نتائج. جرب كلمة بحث أخرى.";
    catalogContainer.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  companies.forEach((company) => fragment.appendChild(createCompanyNode(company)));
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

searchInput.addEventListener("input", onSearchInput);

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

document.addEventListener("DOMContentLoaded", fetchCatalog);
