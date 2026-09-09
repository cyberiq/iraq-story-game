const cartStatus = document.getElementById('cartStatus');
const cartList = document.getElementById('cartList');
const summarySubtotal = document.getElementById('summarySubtotal');
const summaryShipping = document.getElementById('summaryShipping');
const summaryTotal = document.getElementById('summaryTotal');
const placeOrderBtn = document.getElementById('placeOrderBtn');
const clearCartBtn = document.getElementById('clearCartBtn');
const successPanel = document.getElementById('successPanel');
const waNumber = '7713377783';

async function getCsrfToken() {
  const response = await fetch('/api/csrf-token', { credentials: 'same-origin' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.csrfToken) {
    throw new Error('فشل في تهيئة حماية الطلبات');
  }
  return payload.csrfToken;
}

function formatPrice(value, currency = 'IQD') {
  const v = Number(value || 0);
  if (!Number.isFinite(v) || v <= 0) return 'مجانية';
  const label = String(currency || 'IQD').toUpperCase() === 'USD' ? '$' : 'د.ع';
  return `${v.toLocaleString('en-US')} ${label}`;
}

function getLocalCartItems() {
  try {
    return JSON.parse(localStorage.getItem('iraqGameCart') || '[]');
  } catch (error) {
    return [];
  }
}

function renderSummary(items) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
  const shipping = items.length ? 2500 : 0;
  const total = subtotal + shipping;
  summarySubtotal.textContent = formatPrice(subtotal, 'IQD');
  summaryShipping.textContent = formatPrice(shipping, 'IQD');
  summaryTotal.textContent = formatPrice(total, 'IQD');
}

function createItemThumb(item) {
  const colors = [
    ['#3fa0d6', '#7d2fae'],
    ['#ff7a18', '#ffb347'],
    ['#55c4b1', '#186d83'],
    ['#f75d5d', '#a71d31']
  ];
  const pick = colors[Math.abs((item.id || item.name_ar || '').length) % colors.length];
  return `linear-gradient(135deg, ${pick[0]}, ${pick[1]})`;
}

async function loadCart() {
  const items = getLocalCartItems();

  if (!items.length) {
    cartList.innerHTML = `
      <div class="empty-cart">
        <div class="empty-icon">🛒</div>
        <h3>السلة فارغة حاليًا</h3>
        <p>أضف بعض الألعاب المفضلة واسترجعها عندما تكون جاهزًا.</p>
        <a class="btn-primary" href="/">تصفح المتجر</a>
      </div>
    `;
    renderSummary([]);
    cartStatus.textContent = 'لا توجد عناصر في السلة.';
    return;
  }

  cartStatus.textContent = `${items.length} عنصر في السلة`;
  cartList.innerHTML = items.map((item, index) => `
    <div class="item-row" style="animation-delay:${index * 0.05}s; --thumb-a:${createItemThumb(item).split(',')[0].replace('linear-gradient(135deg, ', '').trim()}; --thumb-b:${createItemThumb(item).split(',')[1].trim()};">
      <div class="thumb" style="background:${createItemThumb(item)}"></div>
      <div class="item-info">
        <div class="item-name">${item.name_ar || item.name_en || item.name || 'منتج'}</div>
        <div class="item-meta">${item.name_en || item.name || 'Game'}</div>
      </div>
      <div class="item-qty">${Number(item.qty || 1)} ×</div>
      <div class="item-price">${formatPrice(Number(item.price || 0) * Number(item.qty || 1), item.currency || 'IQD')}</div>
    </div>
  `).join('');

  renderSummary(items);
}

placeOrderBtn.addEventListener('click', async () => {
  try {
    const items = getLocalCartItems();

    if (!items.length) {
      cartStatus.textContent = 'السلة فارغة.';
      return;
    }

    const rocketFly = document.getElementById('rocketFly');
    const trail = document.getElementById('trail');
    placeOrderBtn.disabled = true;
    placeOrderBtn.classList.add('launching');
    rocketFly.classList.add('go');
    trail.classList.add('go');

    let message = 'طلب شراء من iraq story:\n';
    let total = 0;
    items.forEach((it, i) => {
      const qty = Number(it.qty || 1);
      const lineTotal = Number(it.price || 0) * qty;
      message += `${i + 1}. ${it.name_ar || it.name_en || it.name} (${it.id || 'N/A'}) × ${qty} — ${formatPrice(lineTotal, it.currency || 'IQD')}\n`;
      total += lineTotal;
    });
    message += `المجموع: ${formatPrice(total, 'IQD')}`;

    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    const opened = window.open(waUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.href = waUrl;
    }

    placeOrderBtn.style.display = 'none';
    successPanel.classList.add('show');

    try {
      const csrfToken = await getCsrfToken();
      await fetch('/api/cart/clear', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-CSRF-Token': csrfToken }
      });
    } catch (err) {
      console.warn('Failed to clear cart after order', err);
    }

    localStorage.removeItem('iraqGameCart');
  } catch (err) {
    console.error(err);
    cartStatus.textContent = 'خطأ أثناء تجهيز الطلب.';
  }
});

clearCartBtn.addEventListener('click', async () => {
  try {
    localStorage.removeItem('iraqGameCart');
    const csrfToken = await getCsrfToken();
    await fetch('/api/cart/clear', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'X-CSRF-Token': csrfToken }
    });
    cartStatus.textContent = 'تم تفريغ السلة.';
    loadCart();
  } catch (err) {
    console.error(err);
    cartStatus.textContent = 'فشل تفريغ السلة.';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const starsContainer = document.getElementById('stars');
  if (starsContainer) {
    for (let i = 0; i < 70; i += 1) {
      const star = document.createElement('div');
      star.className = 'star';
      const size = Math.random() * 2 + 1;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.left = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 3}s`;
      star.style.animationDuration = `${2 + Math.random() * 3}s`;
      starsContainer.appendChild(star);
    }
  }

  loadCart();
});
