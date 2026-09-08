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

function renderSummary(items) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
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
  try {
    const res = await fetch('/api/cart');
    const payload = await res.json();
    const items = payload.cart || [];

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
          <div class="item-name">${item.name_ar || item.name_en || 'منتج'}</div>
          <div class="item-meta">${item.name_en || 'Game'}</div>
        </div>
        <div class="item-qty">1 ×</div>
        <div class="item-price">${formatPrice(item.price, item.currency || 'IQD')}</div>
      </div>
    `).join('');

    renderSummary(items);
  } catch (err) {
    console.error(err);
    cartStatus.textContent = 'فشل تحميل سلة المشتريات.';
  }
}

placeOrderBtn.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/cart');
    const payload = await res.json();
    const items = payload.cart || [];

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
      message += `${i + 1}. ${it.name_ar || it.name_en} (${it.id || 'N/A'}) — ${formatPrice(it.price, it.currency || 'IQD')}\n`;
      total += Number(it.price || 0);
    });
    message += `المجموع: ${formatPrice(total, 'IQD')}`;

    setTimeout(async () => {
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
    }, 950);

    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener');
  } catch (err) {
    console.error(err);
    cartStatus.textContent = 'خطأ أثناء تجهيز الطلب.';
  }
});

clearCartBtn.addEventListener('click', async () => {
  try {
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
