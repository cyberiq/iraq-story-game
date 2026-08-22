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
let currentGame = null;
let activeCoupon = null;

function formatPrice(value, currency = "IQD") {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "مجانية";
  }

  const normalizedCurrency = String(currency || "IQD").toUpperCase();
  const label = normalizedCurrency === "USD" ? "$" : "د.ع";
  return `${numericValue} ${label}`;
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
    setStatus("معرف اللعبة غير صالح.");
    return;
  }

  setStatus("جاري تحميل تفاصيل اللعبة...");

  try {
    const response = await fetch(`/api/games/${gameId}`);
    if (!response.ok) {
      if (response.status === 404) {
        setStatus("لم يتم العثور على اللعبة المطلوبة.");
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

    nameNode.textContent = `${game.name_ar} / ${game.name_en}`;
    companyNode.textContent = `الشركة: ${game.company.name_ar} / ${game.company.name_en}`;
    metaNode.textContent = `النوع: ${game.genre} - سنة الإصدار: ${game.release_year}`;
    descriptionNode.textContent = game.description || "لا يوجد وصف متاح لهذه اللعبة حاليًا.";
    priceNode.textContent = formatPrice(game.price ?? 0, game.currency || "IQD");
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
        const res = await fetch('/api/coupons/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      const priceValue = Number(currentGame.price || 0);
      let finalPrice = priceValue;
      if (activeCoupon && Number(activeCoupon.percent || 0) > 0) {
        finalPrice = Math.round(priceValue * (1 - Number(activeCoupon.percent) / 100));
      }

      const displayPrice = formatPrice(finalPrice, currentGame.currency || 'IQD');
      const message = `أرغب بشراء: ${currentGame.name_ar} / ${currentGame.name_en} (ID:${currentGame.id})‎\nالسعر: ${displayPrice}\nرمز الكوبون: ${code || 'لا يوجد'}`;
      try {
        const response = await fetch('/api/contact-settings');
        const payload = await response.json().catch(() => ({ whatsapp_number: '77133777783' }));
        const waNumber = String(payload.whatsapp_number || '77133777783').replace(/\D/g, '') || '77133777783';
        const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
        window.location.href = waUrl;
      } catch (error) {
        console.error(error);
        const waUrl = `https://wa.me/77133777783?text=${encodeURIComponent(message)}`;
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
