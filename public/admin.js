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
const gameYear = document.getElementById("gameYear");
const gamePrice = document.getElementById("gamePrice");
const gameImage = document.getElementById("gameImage");
const gameImageHint = document.getElementById("gameImageHint");
const gameDescription = document.getElementById("gameDescription");
const gameReset = document.getElementById("gameReset");
const logoutBtn = document.getElementById("logoutBtn");

const adminCatalog = document.getElementById("adminCatalog");

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
    ...options
  });

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
}

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
  gameYear.value = "";
  gamePrice.value = "0";
  gameImage.value = "";
  currentGameImageUrl = "";
  gameImageHint.textContent = "";
  gameDescription.value = "";
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
    header.innerHTML = `
      <h3>${company.name_ar} / ${company.name_en}</h3>
      <p>${company.slug}</p>
      <div class="inline-actions">
        <button type="button" class="btn-secondary" data-edit-company="${company.id}">تعديل الشركة</button>
        <button type="button" class="btn-danger" data-delete-company="${company.id}">حذف الشركة</button>
      </div>
    `;

    const games = document.createElement("div");
    games.className = "admin-games-list";

    company.games.forEach((game) => {
      const item = document.createElement("div");
      item.className = "admin-game-item";
      const priceLabel = Number(game.price ?? 0) > 0 ? `${Number(game.price ?? 0)} ر.س` : "مجانية";
      item.innerHTML = `
        <strong>${game.name_ar} / ${game.name_en}</strong>
        <span>${game.genre} - ${game.release_year} • ${priceLabel}</span>
        <div class="inline-actions">
          <button type="button" class="btn-secondary" data-edit-game="${game.id}">تعديل اللعبة</button>
          <button type="button" class="btn-danger" data-delete-game="${game.id}">حذف اللعبة</button>
        </div>
      `;
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
      gameYear.value = selected.release_year;
      gamePrice.value = Number(selected.price ?? 0);
      currentGameImageUrl = selected.cover_image_url || "";
      gameImage.value = "";
      gameImageHint.textContent = currentGameImageUrl
        ? `الصورة الحالية: ${currentGameImageUrl}`
        : "لا توجد صورة حالية";
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
  formData.append("price", String(Number(gamePrice.value || 0)));
  formData.append("description", gameDescription.value.trim());

  if (gameImage.files && gameImage.files[0]) {
    formData.append("image", gameImage.files[0]);
  }

  if (currentGameImageUrl) {
    formData.append("current_cover_image_url", currentGameImageUrl);
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
