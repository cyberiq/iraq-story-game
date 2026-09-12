// Cart widget animation helper
(function(){
  // Inject minimal styles required for flying image and particles
  const css = `
  .flying-img{position:fixed;width:50px;height:50px;object-fit:contain;border-radius:8px;z-index:9999;pointer-events:none;box-shadow:0 6px 18px rgba(0,0,0,.2);}
  .particle{position:fixed;width:6px;height:6px;border-radius:50%;background:var(--accent, #00d2d3);pointer-events:none;z-index:9998}
  .cart-shake{animation:cartShake .45s ease}
  @keyframes cartShake{0%,100%{transform:rotate(0)}20%{transform:rotate(-15deg)}40%{transform:rotate(12deg)}60%{transform:rotate(-8deg)}80%{transform:rotate(5deg)}}
  `;
  const style = document.createElement('style');
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);

  const cartButton = () => document.getElementById('cartButton') || document.querySelector('.cart-button');
  const cartCount = () => document.getElementById('cartCount');
  const getCartFromSession = () => {
    try {
      const ns = window.__IRAQ_GAME_SESSION_NS__ || sessionStorage.getItem('iraqGameSessionNs') || 'iraqGame_default';
      const candidates = [
        sessionStorage.getItem(`${ns}:iraqGameCart`),
        localStorage.getItem(`${ns}:iraqGameCart`),
        sessionStorage.getItem('iraqGameCart'),
        localStorage.getItem('iraqGameCart')
      ];

      for (const raw of candidates) {
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch (error) {
      return [];
    }
  };

  function bezier(t, p0, p1, p2){
    return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
  }

  function spawnParticles(targetRect){
    const centerX = targetRect.left + targetRect.width/2;
    const centerY = targetRect.top + targetRect.height/2;
    for(let i=0;i<8;i++){
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = centerX + 'px';
      p.style.top = centerY + 'px';
      document.body.appendChild(p);

      const angle = (Math.PI*2*i)/8;
      const dist = 30 + Math.random()*20;
      const dx = Math.cos(angle)*dist;
      const dy = Math.sin(angle)*dist;

      p.animate([
        { transform: 'translate(0,0)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px)`, opacity: 0 }
      ], { duration: 520, easing: 'ease-out' }).onfinish = () => p.remove();
    }
  }

  function animateAddToCart(imgEl){
    try{
      const cartBtn = cartButton();
      if(!cartBtn) return;

      const imgRect = imgEl.getBoundingClientRect();
      const cartRect = cartBtn.getBoundingClientRect();

      const flyImg = imgEl.cloneNode(true);
      flyImg.classList.add('flying-img');
      flyImg.style.left = imgRect.left + 'px';
      flyImg.style.top = imgRect.top + 'px';
      flyImg.style.width = imgRect.width + 'px';
      flyImg.style.height = imgRect.height + 'px';
      document.body.appendChild(flyImg);

      const midX = (imgRect.left + cartRect.left) / 2;
      const midY = Math.min(imgRect.top, cartRect.top) - 130;
      const startTime = performance.now();
      const duration = 640;

      function animate(now){
        let t = (now - startTime) / duration;
        if(t > 1) t = 1;
        const x = bezier(t, imgRect.left, midX, cartRect.left);
        const y = bezier(t, imgRect.top, midY, cartRect.top);
        const scale = 1 - t * 0.7;
        const opacity = 1 - t * 0.4;
        flyImg.style.transform = `translate(${x - imgRect.left}px, ${y - imgRect.top}px) scale(${scale})`;
        flyImg.style.opacity = opacity;
        if(t < 1) requestAnimationFrame(animate);
        else { flyImg.remove(); arrive(); }
      }
      requestAnimationFrame(animate);

      function arrive(){
        // update visible count from localStorage (app.js already updated cart)
        try{
          const cart = getCartFromSession();
          const count = cart.reduce((s,i)=>s+Number(i.qty||0),0);
          const badge = cartCount();
          if(badge) badge.textContent = String(count);
        } catch(e){}

        // small shake on target
        cartBtn.classList.remove('cart-shake');
        // force reflow
        void cartBtn.offsetWidth;
        cartBtn.classList.add('cart-shake');
        spawnParticles(cartBtn.getBoundingClientRect());
      }
    } catch(e){
      // swallow errors to avoid breaking app
      console.error('animateAddToCart error', e);
    }
  }

  // expose globally
  window.animateAddToCart = animateAddToCart;
})();
