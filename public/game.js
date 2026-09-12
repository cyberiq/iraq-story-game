const statusNode = document.getElementById("detailStatus");
const cardNode = document.getElementById("detailCard");
const imageNode = document.getElementById("detailImage");
const nameNode = document.getElementById("detailName");
const companyNode = document.getElementById("detailCompany");
const metaNode = document.getElementById("detailMeta");
const descriptionNode = document.getElementById("detailDescription");
const priceNode = document.getElementById("detailPrice");
const couponInput = document.getElementById('couponInput');
const applyCouponBtn = document.getElementById('applyCouponBtn');
const discountInfo = document.getElementById('discountInfo');
const buyBtn = document.getElementById('buyBtn');
const serviceQuantityWrap = document.getElementById('serviceQuantityWrap');
const serviceQuantityInput = document.getElementById('serviceQuantity');
const serviceQuantityMeta = document.getElementById('serviceQuantityMeta');
const servicePriceSummary = document.getElementById('servicePriceSummary');
let currentGame = null;
let activeCoupon = null;

async function getCsrfToken() {
  const response = await fetch('/api/csrf-token', { credentials: 'same-origin' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.csrfToken) {
    throw new Error('فشل في تهيئة حماية الطلبات');
  }
  return payload.csrfToken;
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

function getRequestedServiceQuantity() {
  if (!serviceQuantityInput) return 1000;
  const raw = Number(serviceQuantityInput.value || 0);
  return Number.isFinite(raw) && raw > 0 ? raw : 1000;
}

function getEffectivePriceForItem(game, quantityOverride = null) {
  const basePrice = Number(game?.price ?? 0);
  const quantity = Number(quantityOverride ?? getRequestedServiceQuantity());
  if (String(game?.product_type || '').toLowerCase() === 'service') {
    return Math.round(basePrice * (quantity / 1000));
  }
  return Math.round(basePrice);
}

function fallbackImage(gameName) {
  const encoded = encodeURIComponent(gameName || "video game");
  return `https://source.unsplash.com/1280x720/?${encoded},game`;
}

function setStatus(message) {
  statusNode.textContent = message;
}

function getGameIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("id"));
}

async function loadGameDetails() {
  const gameId = getGameIdFromQuery();
  if (!Number.isInteger(gameId) || gameId <= 0) {
    window.location.replace('/404.html');
    return;
  }

  setStatus("جاري تحميل تفاصيل اللعبة...");

  try {
    const response = await fetch(`/api/games/${gameId}`);
    if (!response.ok) {
      if (response.status === 404) {
        window.location.replace('/404.html');
        return;
      }

      throw new Error(`Request failed: ${response.status}`);
    }

    const payload = await response.json();
    const game = payload.game;

    imageNode.src = game.cover_image_url || fallbackImage(game.name_en);
    imageNode.alt = `${game.name_ar} / ${game.name_en}`;
    imageNode.addEventListener("error", () => {
      imageNode.src = fallbackImage(game.name_en);
    });

    const isService = String(game.product_type || '').toLowerCase() === 'service';
    const baseQuantity = Math.max(1000, Number(game?.quantity || 1000));

    nameNode.textContent = `${game.name_ar} / ${game.name_en}`;
    companyNode.textContent = `الشركة: ${game.company.name_ar} / ${game.company.name_en}`;
    metaNode.textContent = `النوع: ${game.genre || (game.product_subtype || 'خدمة')} - سنة الإصدار: ${game.release_year || '—'}`;
    descriptionNode.textContent = game.description || "لا يوجد وصف متاح لهذه الخدمة حاليًا.";

    if (serviceQuantityWrap) {
      serviceQuantityWrap.style.display = isService ? 'block' : 'none';
    }
    if (serviceQuantityInput) {
      serviceQuantityInput.value = String(baseQuantity);
      serviceQuantityInput.min = '1000';
      serviceQuantityInput.step = '1000';
    }
    if (serviceQuantityMeta) {
      serviceQuantityMeta.textContent = isService ? 'وحدة (يتم حساب السعر على أساس كل 1000 وحدة)' : 'وحدة';
    }
    if (servicePriceSummary) {
      servicePriceSummary.textContent = isService
        ? `السعر: ${formatPrice(Number(game.price ?? 0), game.currency || 'IQD')} لكل 1000 وحدة`
        : '';
    }

    const renderServiceSummary = () => {
      if (!isService || !serviceQuantityInput || !servicePriceSummary) return;
      const quantity = getRequestedServiceQuantity();
      const total = getEffectivePriceForItem(game, quantity);
      servicePriceSummary.textContent = `المجموع: ${quantity.toLocaleString('en-US')} وحدة × ${formatPrice(Number(game.price ?? 0), game.currency || 'IQD')} لكل 1000 = ${formatPrice(total, game.currency || 'IQD')}`;
    };

    if (isService && serviceQuantityInput) {
      serviceQuantityInput.oninput = renderServiceSummary;
      renderServiceSummary();
    }

    const quantityForDisplay = isService ? getRequestedServiceQuantity() : 1;
    const displayPrice = isService ? getEffectivePriceForItem(game, quantityForDisplay) : Number(game.price ?? 0);
    priceNode.textContent = formatPrice(displayPrice, game.currency || "IQD");
    activeCoupon = null;
    discountInfo.textContent = '';
    couponInput.value = '';
    currentGame = game;

    applyCouponBtn.addEventListener('click', async () => {
      const code = (couponInput.value || '').trim();
      if (!code) {
        discountInfo.textContent = 'أدخل رمز كوبون.';
        return;
      }

      try {
        const csrfToken = await getCsrfToken();
        const res = await fetch('/api/coupons/validate', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({ code })
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          discountInfo.textContent = payload.error || 'الكوبون غير صالح.';
          activeCoupon = null;
          return;
        }

        const payload = await res.json();
        activeCoupon = payload;
        const percent = Number(payload.percent || 0);
        const discounted = Number(game.price || 0) * (1 - percent / 100);
        discountInfo.textContent = `تم تطبيق الكوبون: ${percent}% — السعر بعد الخصم: ${formatPrice(Math.round(discounted), game.currency)}`;
      } catch (err) {
        console.error(err);
        discountInfo.textContent = 'خطأ في التحقق من الكوبون.';
      }
    });

    buyBtn.addEventListener('click', async () => {
      if (!currentGame) return;

      const code = (couponInput.value || '').trim();
      const isServiceItem = String(currentGame.product_type || '').toLowerCase() === 'service';
      const quantity = isServiceItem ? getRequestedServiceQuantity() : 1;
      const basePrice = Number(currentGame.price || 0);
      const priceValue = isServiceItem ? Math.round(basePrice * (quantity / 1000)) : basePrice;
      let finalPrice = priceValue;
      if (activeCoupon && Number(activeCoupon.percent || 0) > 0) {
        finalPrice = Math.round(priceValue * (1 - Number(activeCoupon.percent) / 100));
      }

      const displayPrice = formatPrice(finalPrice, currentGame.currency || 'IQD');
      const serviceText = isServiceItem ? `\nالكمية: ${quantity.toLocaleString('en-US')} ${currentGame.product_subtype || 'وحدة'}\nالسعر المحسوب: ${displayPrice}` : `\nالسعر: ${displayPrice}`;
      const message = `أرغب بشراء: ${currentGame.name_ar} / ${currentGame.name_en} (ID:${currentGame.id})${serviceText}\nرمز الكوبون: ${code || 'لا يوجد'}`;
      const waNumber = '7713377783';
      const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
      const opened = window.open(waUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        window.location.href = waUrl;
      }
    });

    cardNode.classList.remove("hidden");
    setStatus("");
  } catch (error) {
    console.error(error);
    setStatus("تعذر تحميل التفاصيل. حاول مرة أخرى.");
  }
}

document.addEventListener("DOMContentLoaded", loadGameDetails);

/* Purchase theme overlay builder ------------------------------------------------- */
function showPurchaseTheme(game, finalPrice, couponCode, couponObj) {
  // Prevent multiple overlays
  if (document.getElementById('purchase-theme-backdrop')) return;

  const backdrop = document.createElement('div');
  backdrop.id = 'purchase-theme-backdrop';
  backdrop.className = 'admin-inline-confirm-backdrop';
  backdrop.style.zIndex = 99999;

  const wrapper = document.createElement('div');
  wrapper.className = 'purchase-theme';
  wrapper.innerHTML = `
    <div class="scene-bg" aria-hidden="true"></div>
    <div class="scene-dim" aria-hidden="true"></div>
    <main class="detail-wrap" dir="rtl">
      <div class="detail-topbar">
        <a class="btn-secondary" href="/">عودة للرئيسية</a>
      </div>
      <a class="contact-manager" href="/contact" aria-label="صفحة تواصل">
        <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/whatsapp.svg" alt="wa" />
        تواصل مع المدير
      </a>
      <section id="detailStatusTheme" class="status" aria-live="polite"></section>
      <article id="detailCardTheme" class="detail-card">
        <img id="detailImageTheme" class="detail-image" alt="غلاف اللعبة" src="${game.cover_image_url || ''}" />
        <div class="detail-content">
          <h1 id="detailNameTheme">${game.name_ar} / ${game.name_en}</h1>
          <p id="detailCompanyTheme" class="detail-company">الشركة: ${game.company.name_ar} / ${game.company.name_en}</p>
          <p id="detailMetaTheme" class="detail-meta">النوع: ${game.genre} - سنة الإصدار: ${game.release_year}</p>
          <p id="detailDescriptionTheme" class="detail-description">${game.description || ''}</p>
          <p id="detailPriceTheme" class="detail-price">${formatPrice(finalPrice, game.currency)}</p>
          <div class="purchase-row">
            <label style="display:block;margin-bottom:6px">كود الخصم</label>
            <input id="couponInputTheme" placeholder="رمز الكوبون (اختياري)" value="${couponCode || ''}" />
            <button id="applyCouponBtnTheme" class="btn-secondary" type="button">تطبيق الكوبون</button>
            <div id="discountInfoTheme" style="margin-top:8px;color:#aaffaa">${couponObj && couponObj.percent ? `تم تطبيق: ${couponObj.percent}%` : ''}</div>
            <button id="buyBtnTheme" class="btn-primary" style="margin-top:12px">شراء عبر واتساب</button>
            <button id="closeTheme" class="btn-secondary" style="margin-top:12px;margin-left:8px">إغلاق</button>
          </div>
        </div>
      </article>
    </main>
  `;

  backdrop.appendChild(wrapper);
  document.body.appendChild(backdrop);

  // Wire up buttons
  const closeBtn = document.getElementById('closeTheme');
  const buyThemeBtn = document.getElementById('buyBtnTheme');
  const applyThemeBtn = document.getElementById('applyCouponBtnTheme');
  const couponInputTheme = document.getElementById('couponInputTheme');

  function removeOverlay() {
    const el = document.getElementById('purchase-theme-backdrop');
    if (el) el.remove();
  }

  closeBtn.addEventListener('click', () => removeOverlay());

  applyThemeBtn.addEventListener('click', async () => {
    const code = (couponInputTheme.value || '').trim();
    if (!code) return;
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ code })
      });
      if (!res.ok) {
        const p = await res.json().catch(() => ({}));
        document.getElementById('discountInfoTheme').textContent = p.error || 'الكوبون غير صالح.';
        return;
      }
      const p = await res.json();
      document.getElementById('discountInfoTheme').textContent = `تم تطبيق: ${p.percent || 0}%`;
    } catch (e) {
      console.error(e);
      document.getElementById('discountInfoTheme').textContent = 'خطأ في التحقق من الكوبون.';
    }
  });

  buyThemeBtn.addEventListener('click', () => {
    const code = (couponInputTheme.value || '').trim();
    const displayPrice = formatPrice(finalPrice, game.currency || 'IQD');
    const message = `أرغب بشراء: ${game.name_ar} / ${game.name_en} (ID:${game.id})\nالسعر: ${displayPrice}\nرمز الكوبون: ${code || 'لا يوجد'}`;
    const waNumber = '7713377783';
    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    const opened = window.open(waUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.href = waUrl;
    }
  });
}
