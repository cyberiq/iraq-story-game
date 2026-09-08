const cartStatus = document.getElementById('cartStatus');
const cartList = document.getElementById('cartList');
const placeOrderBtn = document.getElementById('placeOrderBtn');
const clearCartBtn = document.getElementById('clearCartBtn');
const waNumber = '7713377783';

function formatPrice(value, currency = 'IQD') {
  const v = Number(value || 0);
  if (!Number.isFinite(v) || v <= 0) return 'مجانية';
  const label = String(currency || 'IQD').toUpperCase() === 'USD' ? '$' : 'د.ع';
  return `${v} ${label}`;
}

async function loadCart() {
  try {
    const res = await fetch('/api/cart');
    const payload = await res.json();
    const items = payload.cart || [];
    if (!items.length) {
      cartList.innerHTML = '<p>السلة فارغة.</p>';
      return;
    }

    cartList.innerHTML = '';
    const ul = document.createElement('ul');
    items.forEach((it) => {
      const li = document.createElement('li');
      li.textContent = `${it.name_ar} — ${formatPrice(it.price, it.currency)}`;
      ul.appendChild(li);
    });
    cartList.appendChild(ul);
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

    let message = 'طلب شراء من iraq story:' + '\n';
    let total = 0;
    items.forEach((it, i) => {
      message += `${i+1}. ${it.name_ar} (${it.id}) — ${formatPrice(it.price, it.currency)}\n`;
      total += Number(it.price || 0);
    });
    message += `المجموع: ${formatPrice(total)}`;

    // Clear cart on server (best-effort)
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
