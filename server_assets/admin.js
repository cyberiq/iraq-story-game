const adminStatus = document.getElementById("adminStatus");
const companyForm = document.getElementById("companyForm");
const companyId = document.getElementById("companyId");
const companySlug = document.getElementById("companySlug");
const companyNameAr = document.getElementById("companyNameAr");
const companyNameEn = document.getElementById("companyNameEn");
const companyReset = document.getElementById("companyReset");

const gameForm = document.getElementById("gameForm");
const gameId = document.getElementById("gameId");
const gameCompany = document.getElementById("gameCompany");
const gameNameAr = document.getElementById("gameNameAr");
const gameNameEn = document.getElementById("gameNameEn");
const gameGenre = document.getElementById("gameGenre");
const gameProductType = document.getElementById("gameProductType");
const gameYear = document.getElementById("gameYear");
const gamePrice = document.getElementById("gamePrice");
const gameCurrency = document.getElementById("gameCurrency");
const gameImage = document.getElementById("gameImage");
const gameImageUrl = document.getElementById("gameImageUrl");
const gameImageHint = document.getElementById("gameImageHint");
const gameImagePreview = document.getElementById("gameImagePreview");
const productSubtypeLabel = document.getElementById('productSubtypeLabel');
const gameProductDetail = document.getElementById('gameProductDetail');
const gameDescription = document.getElementById("gameDescription");
const gameReset = document.getElementById("gameReset");
const logoutBtn = document.getElementById("logoutBtn");

const adminCatalog = document.getElementById("adminCatalog");
const couponForm = document.getElementById('couponForm');
const couponCode = document.getElementById('couponCode');
const couponPercent = document.getElementById('couponPercent');
const couponList = document.getElementById('couponList');
const todayOffersForm = document.getElementById('todayOffersForm');
const offerGameSelect = document.getElementById('offerGameSelect');
const offerTitle = document.getElementById('offerTitle');
const offerPrice = document.getElementById('offerPrice');
const offerPercent = document.getElementById('offerPercent');
const todayOffersList = document.getElementById('todayOffersList');

const fallbackAdminCompanies = [
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
      }
    ]
  }
];

function setStatus(message) {
  adminStatus.textContent = message;
}

let currentGameImageUrl = "";

// Default exchange rate: 1 USD = 1300 IQD (change as needed)
const EXCHANGE_RATE = 1300;
let lastSelectedCurrency = 'IQD';

function normalizeSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: options.credentials || 'same-origin',
    ...options
  });

  if (response.status === 401) {
    // session likely expired — redirect to login
    try { window.location.href = '/login'; } catch (e) {}
    throw new Error('Unauthorized');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error || `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

async function checkAuth() {
  const payload = await fetchJson("/api/auth/status");
  if (!payload.authenticated) {
    window.location.href = "/login";
    return false;
  }

  return true;
}

function fillCompaniesSelect(companies) {
  gameCompany.innerHTML = "";
  companies.forEach((company) => {
    const option = document.createElement("option");
    option.value = company.id;
    option.textContent = `${company.name_ar} / ${company.name_en}`;
    gameCompany.appendChild(option);
  });

  if (offerGameSelect) {
    offerGameSelect.innerHTML = '<option value="">-- اختر لعبة --</option>';
    companies.forEach((company) => {
      const option = document.createElement('option');
      option.value = company.id;
      option.textContent = `${company.name_ar} / ${company.name_en}`;
      offerGameSelect.appendChild(option);
    });
  }
}

// Helper: format price for display according to currency
function formatForCurrency(valueNum, currency) {
  const n = Number(valueNum || 0) || 0;
  if (currency === 'USD') return n.toFixed(2);
  return Math.round(n).toLocaleString('en-US');
}

// When currency selection changes, convert the displayed price using EXCHANGE_RATE
if (gameCurrency) {
  gameCurrency.addEventListener('change', () => {
    try {
      const newCurr = String(gameCurrency.value || 'IQD');
      let raw = String(gamePrice.value || '').replace(/[^0-9.,]/g, '');
      // remove thousands separators (commas) before parsing
      raw = raw.replace(/,/g, '');
      let num = parseFloat(raw);
      if (!isFinite(num)) num = 0;

      console.debug('[admin] currency change', { lastSelectedCurrency, newCurr, raw, num });

      if (lastSelectedCurrency === newCurr) {
        lastSelectedCurrency = newCurr;
        return;
      }

      let converted = num;
      if (lastSelectedCurrency === 'IQD' && newCurr === 'USD') {
        converted = +(num / EXCHANGE_RATE);
      } else if (lastSelectedCurrency === 'USD' && newCurr === 'IQD') {
        converted = +(num * EXCHANGE_RATE);
      }

      // Update display
      if (newCurr === 'USD') {
        gamePrice.value = converted.toFixed(2);
      } else {
        gamePrice.value = Math.round(converted).toLocaleString('en-US');
      }

      lastSelectedCurrency = newCurr;
    } catch (e) {
      // ignore
    }
  });
}

// Helper: format price for display according to currency
function clearCompanyForm() {
  companyId.value = "";
  companySlug.value = "";
  companyNameAr.value = "";
  companyNameEn.value = "";
}

function clearGameForm() {
  gameId.value = "";
  gameNameAr.value = "";
  gameNameEn.value = "";
  gameGenre.value = "";
  gameProductType.value = "game";
  gameYear.value = "";
  gamePrice.value = "0";
  gameCurrency.value = "IQD";
  gameImage.value = "";
  gameImageUrl.value = "";
  currentGameImageUrl = "";
  gameImageHint.textContent = "";
  if (gameImagePreview) {
    gameImagePreview.src = "";
    gameImagePreview.style.display = "none";
  }
  gameDescription.value = "";
  if (productSubtypeLabel) productSubtypeLabel.style.display = 'none';
  if (gameProductDetail) gameProductDetail.value = '';
  lastSelectedCurrency = 'IQD';
}

function renderAdminCatalog(companies) {
  adminCatalog.innerHTML = "";

  if (!companies.length) {
    adminCatalog.textContent = "لا توجد بيانات.";
    return;
  }

  companies.forEach((company) => {
    const companyBlock = document.createElement("div");
    companyBlock.className = "admin-company-block";

    const header = document.createElement("div");
    header.className = "admin-company-header";

    const h3 = document.createElement('h3');
    h3.textContent = `${company.name_ar} / ${company.name_en}`;
    const p = document.createElement('p');
    p.textContent = company.slug;

    const headerActions = document.createElement('div');
    headerActions.className = 'inline-actions';
    const editCompanyBtn = document.createElement('button');
    editCompanyBtn.type = 'button';
    editCompanyBtn.className = 'btn-secondary';
    editCompanyBtn.setAttribute('data-edit-company', String(company.id));
    editCompanyBtn.textContent = 'تعديل الشركة';
    const deleteCompanyBtn = document.createElement('button');
    deleteCompanyBtn.type = 'button';
    deleteCompanyBtn.className = 'btn-danger';
    deleteCompanyBtn.setAttribute('data-delete-company', String(company.id));
    deleteCompanyBtn.textContent = 'حذف الشركة';

    headerActions.appendChild(editCompanyBtn);
    headerActions.appendChild(deleteCompanyBtn);

    header.appendChild(h3);
    header.appendChild(p);
    header.appendChild(headerActions);

    const games = document.createElement("div");
    games.className = "admin-games-list";

    company.games.forEach((game) => {
      const item = document.createElement("div");
      item.className = "admin-game-item";

      const title = document.createElement('strong');
      title.textContent = `${game.name_ar} / ${game.name_en}`;

      const meta = document.createElement('span');
      const currency = game.currency || "IQD";
      const rawPrice = Number(game.price ?? 0);
      const priceLabel = rawPrice > 0
        ? (currency === 'USD'
            ? `${rawPrice.toFixed(2)} $`
            : `${rawPrice.toLocaleString('en-US')} د.ع`)
        : "مجانية";
      meta.textContent = `${game.genre} - ${game.release_year} • ${priceLabel}`;

      const actions = document.createElement('div');
      actions.className = 'inline-actions';
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn-secondary';
      editBtn.setAttribute('data-edit-game', String(game.id));
      editBtn.textContent = 'تعديل اللعبة';
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-danger';
      delBtn.setAttribute('data-delete-game', String(game.id));
      delBtn.textContent = 'حذف اللعبة';

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      item.appendChild(title);
      item.appendChild(meta);
      item.appendChild(actions);

      games.appendChild(item);
    });

    companyBlock.appendChild(header);
    companyBlock.appendChild(games);
    adminCatalog.appendChild(companyBlock);
  });
}

async function loadData() {
  setStatus("جاري تحميل بيانات الإدارة...");

  try {
    const [companiesPayload, catalogPayload] = await Promise.all([
      fetchJson("/api/companies"),
      fetchJson("/api/catalog")
    ]);

    const companies = companiesPayload.companies || [];
    fillCompaniesSelect(companies);
    renderAdminCatalog(catalogPayload.companies || []);
    bindEditButtons(companies, catalogPayload.companies || []);

    setStatus("تم تحميل البيانات.");
    await loadCoupons();
    await loadTodayOffers();
  } catch (error) {
    console.error(error);

    const message = String(error.message || "");
    if (message.includes("Database unavailable")) {
      fillCompaniesSelect(fallbackAdminCompanies);
      renderAdminCatalog(fallbackAdminCompanies);
      bindEditButtons(fallbackAdminCompanies, fallbackAdminCompanies);
      setStatus("وضع تجريبي: قاعدة البيانات غير متاحة، تم تحميل شركات محلية مؤقتة.");
      return;
    }

    setStatus(`خطأ: ${error.message}`);
  }
}

async function loadCoupons() {
  try {
    const payload = await fetchJson('/api/coupons');
    const coupons = payload.coupons || [];
    couponList.innerHTML = '';
    if (!coupons.length) {
      couponList.textContent = 'لا توجد كوبونات.';
      return;
    }

    coupons.forEach((c) => {
      const row = document.createElement('div');
      row.className = 'coupon-row';

      const strong = document.createElement('strong');
      strong.textContent = c.code;

      const text = document.createTextNode(` — ${c.percent}% `);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-danger';
      delBtn.setAttribute('data-delete-coupon', String(c.code));
      delBtn.textContent = 'حذف';

      row.appendChild(strong);
      row.appendChild(text);
      row.appendChild(delBtn);
      couponList.appendChild(row);
    });

    const delBtns = couponList.querySelectorAll('[data-delete-coupon]');
    delBtns.forEach((b) => b.addEventListener('click', async () => {
      const code = b.getAttribute('data-delete-coupon');
      if (!confirm('حذف الكوبون؟')) return;
      try {
        await fetchJson(`/api/coupons/${encodeURIComponent(code)}`, { method: 'DELETE' });
        setStatus('تم حذف الكوبون.');
        await loadCoupons();
      } catch (err) {
        setStatus(`خطأ: ${err.message}`);
      }
    }));
  } catch (err) {
    console.error(err);
    couponList.textContent = 'خطأ في تحميل الكوبونات.';
  }
}

couponForm && couponForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const payload = { code: couponCode.value.trim(), percent: Number(couponPercent.value) };
    await fetchJson('/api/coupons', { method: 'POST', body: JSON.stringify(payload) });
    couponCode.value = '';
    couponPercent.value = '10';
    setStatus('تم إضافة الكوبون.');
    await loadCoupons();
  } catch (err) {
    setStatus(`خطأ: ${err.message}`);
  }
});

async function loadTodayOffers() {
  try {
    const payload = await fetchJson('/api/today-offers');
    const offers = payload.offers || [];
    if (!todayOffersList) return;
    todayOffersList.innerHTML = '';

    if (!offers.length) {
      todayOffersList.textContent = 'لا توجد عروض اليوم.';
      return;
    }

    offers.forEach((offer) => {
      const row = document.createElement('div');
      row.className = 'coupon-row';
      const strong = document.createElement('strong');
      strong.textContent = offer.title || 'عرض اليوم';
      const text = document.createTextNode(` — ${offer.percent ? `${offer.percent}% خصم` : `${Number(offer.price || 0).toLocaleString('en-US')} د.ع`} `);
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-danger';
      delBtn.setAttribute('data-delete-offer', String(offer.id));
      delBtn.textContent = 'حذف';
      row.appendChild(strong);
      row.appendChild(text);
      row.appendChild(delBtn);
      todayOffersList.appendChild(row);
    });

    todayOffersList.querySelectorAll('[data-delete-offer]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.getAttribute('data-delete-offer'));
        if (!confirm('حذف العرض؟')) return;
        try {
          await fetchJson(`/api/today-offers/${id}`, { method: 'DELETE' });
          setStatus('تم حذف العرض.');
          await loadTodayOffers();
        } catch (err) {
          setStatus(`خطأ: ${err.message}`);
        }
      });
    });
  } catch (err) {
    console.error(err);
    if (todayOffersList) todayOffersList.textContent = 'خطأ في تحميل العروض.';
  }
}

if (todayOffersForm) {
  todayOffersForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const gameId = Number(offerGameSelect.value || 0);
    const price = Number(offerPrice.value || 0);
    const percent = Number(offerPercent.value || 0);
    if (!gameId || (!price && !percent)) {
      setStatus('اختر لعبة وادخل سعر العرض أو نسبة الخصم.');
      return;
    }

    try {
      const payload = {
        game_id: gameId,
        title: offerTitle.value.trim() || 'عرض اليوم',
        price,
        percent
      };
      await fetchJson('/api/today-offers', { method: 'POST', body: JSON.stringify(payload) });
      setStatus('تم حفظ العرض بنجاح.');
      offerTitle.value = '';
      offerPrice.value = '';
      offerPercent.value = '';
      if (offerGameSelect) offerGameSelect.value = '';
      await loadTodayOffers();
    } catch (err) {
      setStatus(`خطأ: ${err.message}`);
    }
  });
}

function bindEditButtons(companies, catalogCompanies) {
  const companyButtons = document.querySelectorAll("[data-edit-company]");
  companyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.getAttribute("data-edit-company"));
      const company = companies.find((entry) => entry.id === id);
      if (!company) {
        return;
      }

      companyId.value = company.id;
      companySlug.value = company.slug;
      companyNameAr.value = company.name_ar;
      companyNameEn.value = company.name_en;
      setStatus(`وضع تعديل الشركة: ${company.name_en}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  const gameButtons = document.querySelectorAll("[data-edit-game]");
  gameButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.getAttribute("data-edit-game"));
      let selected = null;
      let selectedCompany = null;

      for (const company of catalogCompanies) {
        const game = company.games.find((entry) => entry.id === id);
        if (game) {
          selected = game;
          selectedCompany = company;
          break;
        }
      }

      if (!selected || !selectedCompany) {
        return;
      }

      gameId.value = selected.id;
      gameCompany.value = selectedCompany.id;
      gameNameAr.value = selected.name_ar;
      gameNameEn.value = selected.name_en;
      gameGenre.value = selected.genre;
      gameProductType.value = selected.product_type || 'game';
      gameYear.value = selected.release_year;
      // Populate price respecting currency: show two decimals for USD, integer with thousands for IQD
      const selPriceNum = Number(selected.price ?? 0) || 0;
      if ((selected.currency || 'IQD') === 'USD') {
        gamePrice.value = selPriceNum.toFixed(2);
      } else {
        gamePrice.value = selPriceNum.toLocaleString('en-US');
      }
      gameCurrency.value = selected.currency || "IQD";
      lastSelectedCurrency = gameCurrency.value || 'IQD';
      currentGameImageUrl = selected.cover_image_url || "";
      gameImage.value = "";
      gameImageUrl.value = "";
      // populate subtype/detail if present
      if (gameProductDetail) {
        gameProductDetail.value = selected.product_subtype || '';
        productSubtypeLabel.style.display = selected.product_type === 'account' ? 'block' : 'none';
      }
      gameImageHint.textContent = currentGameImageUrl
        ? `الصورة الحالية: ${currentGameImageUrl}`
        : "لا توجد صورة حالية";
      if (gameImagePreview) {
        gameImagePreview.src = currentGameImageUrl || "";
        gameImagePreview.style.display = currentGameImageUrl ? "block" : "none";
      }
      gameDescription.value = selected.description || "";
      setStatus(`وضع تعديل اللعبة: ${selected.name_en}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  const deleteCompanyButtons = document.querySelectorAll("[data-delete-company]");
  deleteCompanyButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.getAttribute("data-delete-company"));
      const confirmed = window.confirm("تأكيد حذف الشركة وكل ألعابها؟");
      if (!confirmed) {
        return;
      }

      try {
        await fetchJson(`/api/companies/${id}`, { method: "DELETE" });
        setStatus("تم حذف الشركة بنجاح.");
        await loadData();
      } catch (error) {
        console.error(error);
        setStatus(`خطأ: ${error.message}`);
      }
    });
  });

  const deleteGameButtons = document.querySelectorAll("[data-delete-game]");
  deleteGameButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.getAttribute("data-delete-game"));
      const confirmed = window.confirm("تأكيد حذف اللعبة؟");
      if (!confirmed) {
        return;
      }

      try {
        await fetchJson(`/api/games/${id}`, { method: "DELETE" });
        setStatus("تم حذف اللعبة بنجاح.");
        await loadData();
      } catch (error) {
        console.error(error);
        setStatus(`خطأ: ${error.message}`);
      }
    });
  });
}

companyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    slug: normalizeSlug(companySlug.value),
    name_ar: companyNameAr.value.trim(),
    name_en: companyNameEn.value.trim()
  };

  try {
    if (companyId.value) {
      await fetchJson(`/api/companies/${companyId.value}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setStatus("تم تعديل الشركة بنجاح.");
    } else {
      await fetchJson("/api/companies", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setStatus("تمت إضافة الشركة بنجاح.");
    }

    clearCompanyForm();
    await loadData();
  } catch (error) {
    console.error(error);
    setStatus(`خطأ: ${error.message}`);
  }
});

gameForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData();
  formData.append("company_id", String(Number(gameCompany.value)));
  formData.append("name_ar", gameNameAr.value.trim());
  formData.append("name_en", gameNameEn.value.trim());
  formData.append("genre", gameGenre.value.trim());
  formData.append("release_year", String(Number(gameYear.value)));
  // Normalize price: allow digits, comma, dot. Convert comma to dot for decimals.
  let priceRaw = String(gamePrice.value || '').replace(/[^0-9.,]/g, '');
  // remove thousands separators so parseFloat works correctly
  priceRaw = priceRaw.replace(/,/g, '');
  let parsedPrice = parseFloat(priceRaw);
  if (!isFinite(parsedPrice)) parsedPrice = 0;

  // Determine currency: for non-game product types default to IQD, otherwise use selected currency
  const pType = String(gameProductType.value || 'game');
  const selectedCurrency = pType !== 'game' ? 'IQD' : (gameCurrency.value || 'IQD');

  console.debug('[admin] submit price parse', { priceRaw, parsedPrice, selectedCurrency, pType });

  if (selectedCurrency === 'USD') {
    // Preserve two decimals for USD
    formData.append('price', String(Number(parsedPrice).toFixed(2)));
    formData.append('currency', 'USD');
  } else {
    // IQD: store whole number
    formData.append('price', String(Math.round(parsedPrice)));
    formData.append('currency', 'IQD');
  }
  formData.append("product_type", gameProductType.value || 'game');
  formData.append("description", gameDescription.value.trim());

  if (gameImage.files && gameImage.files[0]) {
    formData.append("image", gameImage.files[0]);
  }

  // If no file uploaded but a direct URL provided, include it
  if ((!gameImage.files || !gameImage.files[0]) && gameImageUrl && gameImageUrl.value.trim()) {
    formData.append("cover_image_url", gameImageUrl.value.trim());
  }

  // Basic URL validation on client-side: only allow http(s) and image extensions
  if (gameImageUrl && gameImageUrl.value.trim()) {
    const urlVal = gameImageUrl.value.trim();
    try {
      const parsed = new URL(urlVal);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol');
      }
      // Verify image loads (client-side) before submitting to avoid server HEAD rejections or hotlink blocking
      const ok = await new Promise((resolve) => {
        const tester = new Image();
        let settled = false;
        const tidy = () => { if (!settled) settled = true; };
        tester.onload = () => { tidy(); resolve(true); };
        tester.onerror = () => { tidy(); resolve(false); };
        // timeout fallback
        setTimeout(() => { if (!settled) { settled = true; resolve(false); } }, 4000);
        tester.src = urlVal;
      });

      if (!ok) {
        setStatus('رابط الصورة غير صالح أو لا يشير لصيغة صورة مدعومة.');
        return;
      }
    } catch (e) {
      setStatus('رابط الصورة غير صالح. استخدم رابط يبدأ بـ http أو https.');
      return;
    }
  }

  if (currentGameImageUrl) {
    formData.append("current_cover_image_url", currentGameImageUrl);
  }
  // attach product subtype/detail when present
  if (gameProductDetail && gameProductDetail.value.trim()) {
    formData.append('product_subtype', gameProductDetail.value.trim());
  }

  try {
    if (gameId.value) {
      const response = await fetch(`/api/games/${gameId.value}`, {
        method: "PUT",
        body: formData
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Request failed: ${response.status}`);
      }
      setStatus("تم تعديل اللعبة بنجاح.");
    } else {
      const response = await fetch("/api/games", {
        method: "POST",
        body: formData
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Request failed: ${response.status}`);
      }
      setStatus("تمت إضافة اللعبة بنجاح.");
    }

    clearGameForm();
    await loadData();
  } catch (error) {
    console.error(error);
    setStatus(`خطأ: ${error.message}`);
  }
});

companyReset.addEventListener("click", () => {
  clearCompanyForm();
  setStatus("تم تفريغ نموذج الشركة.");
});

gameReset.addEventListener("click", () => {
  clearGameForm();
  setStatus("تم تفريغ نموذج اللعبة.");
});

// Live preview handlers: file change and URL input
if (gameImage) {
  gameImage.addEventListener('change', () => {
    const f = gameImage.files && gameImage.files[0];
    if (f && gameImagePreview) {
      const reader = new FileReader();
      reader.onload = (e) => {
        gameImagePreview.src = e.target.result;
        gameImagePreview.style.display = 'block';
      };
      reader.readAsDataURL(f);
    } else if (gameImagePreview) {
      // if no file, try URL field or current
      gameImagePreview.src = (gameImageUrl && gameImageUrl.value.trim()) || currentGameImageUrl || '';
      gameImagePreview.style.display = gameImagePreview.src ? 'block' : 'none';
    }
  });
}

if (gameImageUrl) {
  gameImageUrl.addEventListener('input', () => {
    const v = gameImageUrl.value.trim();
    if (v && gameImagePreview) {
      gameImagePreview.onload = () => {
        gameImagePreview.style.display = 'block';
        setStatus('');
      };
      gameImagePreview.onerror = () => {
        gameImagePreview.style.display = 'none';
        setStatus('رابط الصورة غير صالح أو لا يشير لصيغة صورة مدعومة.');
      };
      gameImagePreview.src = v;
    } else if (gameImagePreview) {
      gameImagePreview.src = currentGameImageUrl || '';
      gameImagePreview.style.display = currentGameImageUrl ? 'block' : 'none';
    }
  });
}

if (gameProductType) {
  gameProductType.addEventListener('change', () => {
    const v = String(gameProductType.value || '');
    if (productSubtypeLabel) {
      productSubtypeLabel.style.display = v === 'account' ? 'block' : 'none';
    }
    // If product type is not a normal game, force IQD currency and update display
    if (v !== 'game') {
      const prev = lastSelectedCurrency;
      gameCurrency.value = 'IQD';
      // convert current displayed price to IQD if previous was USD
      let raw = String(gamePrice.value || '').replace(/[^0-9.,]/g, '');
      // remove thousands separators
      raw = raw.replace(/,/g, '');
      let num = parseFloat(raw);
      if (!isFinite(num)) num = 0;
      if (prev === 'USD') {
        num = +(num * EXCHANGE_RATE);
      }
      gamePrice.value = Math.round(num).toLocaleString('en-US');
      lastSelectedCurrency = 'IQD';
    }
  });
}

logoutBtn.addEventListener("click", async () => {
  try {
    await fetchJson("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  } catch (error) {
    console.error(error);
    setStatus(`خطأ: ${error.message}`);
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const ok = await checkAuth();
    if (!ok) {
      return;
    }

    await loadData();
  } catch (error) {
    console.error(error);
    setStatus(`خطأ: ${error.message}`);
  }
});
