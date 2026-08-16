const statusNode = document.getElementById("detailStatus");
const cardNode = document.getElementById("detailCard");
const imageNode = document.getElementById("detailImage");
const nameNode = document.getElementById("detailName");
const companyNode = document.getElementById("detailCompany");
const metaNode = document.getElementById("detailMeta");
const descriptionNode = document.getElementById("detailDescription");
const priceNode = document.getElementById("detailPrice");

function formatPrice(value) {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "مجانية";
  }
  return `${numericValue} ر.س`;
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
    priceNode.textContent = formatPrice(game.price ?? 0);

    cardNode.classList.remove("hidden");
    setStatus("");
  } catch (error) {
    console.error(error);
    setStatus("تعذر تحميل التفاصيل. حاول مرة أخرى.");
  }
}

document.addEventListener("DOMContentLoaded", loadGameDetails);
