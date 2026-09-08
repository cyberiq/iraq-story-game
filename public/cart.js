const cartStatus = document.getElementById('cartStatus');
const cartList = document.getElementById('cartList');
const placeOrderBtn = document.getElementById('placeOrderBtn');
const clearCartBtn = document.getElementById('clearCartBtn');
const summarySubtotal = document.getElementById('summarySubtotal');
const summaryShipping = document.getElementById('summaryShipping');
const summaryTotal = document.getElementById('summaryTotal');
const waNumber = '7713377783';

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
      <article class="cart-item" data-index="${index}">
        <div class="cart-thumb" style="background:linear-gradient(135deg, rgba(255,175,72,.85), rgba(125,118,255,.8));"></div>
        <div class="cart-item-body">
          <div class="cart-item-header">
            <h3>${item.name_ar || item.name_en || 'منتج'}</h3>
            <span class="cart-price">${formatPrice(item.price, item.currency || 'IQD')}</span>
          </div>
          <p class="cart-item-meta">${item.name_en || 'Game'}</p>
          <div class="cart-item-footer">
            <span class="cart-tag">${item.currency || 'IQD'}</span>
          </div>
        </div>
      </article>
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

    let message = 'طلب شراء من iraq story:\n';
    let total = 0;
    items.forEach((it, i) => {
      message += `${i + 1}. ${it.name_ar || it.name_en} (${it.id || 'N/A'}) — ${formatPrice(it.price, it.currency || 'IQD')}\n`;
      total += Number(it.price || 0);
    });
    message += `المجموع: ${formatPrice(total, 'IQD')}`;

    fetch('/api/cart/clear', { method: 'POST' }).catch(() => {});

    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    window.location.href = waUrl;
  } catch (err) {
    console.error(err);
    cartStatus.textContent = 'خطأ أثناء تجهيز الطلب.';
  }
});

clearCartBtn.addEventListener('click', async () => {
  try {
    await fetch('/api/cart/clear', { method: 'POST' });
    cartStatus.textContent = 'تم تفريغ السلة.';
    loadCart();
  } catch (err) {
    console.error(err);
    cartStatus.textContent = 'فشل تفريغ السلة.';
  }
});

document.addEventListener('DOMContentLoaded', loadCart);
