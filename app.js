(() => {
  'use strict';

  const storageKey = 'makko-cart';
  const currency = new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' });
  const productGrid = document.querySelector('#product-grid');
  const cards = [...document.querySelectorAll('.product-card')];
  const searchInput = document.querySelector('#product-search');
  const productCount = document.querySelector('#product-count');
  const noProducts = document.querySelector('#no-products');
  const cartDrawer = document.querySelector('#cart-drawer');
  const cartBackdrop = document.querySelector('#cart-backdrop');
  const cartItems = document.querySelector('#cart-items');
  const cartEmpty = document.querySelector('#cart-empty');
  const cartSummary = document.querySelector('#cart-summary');
  const cartCount = document.querySelector('#cart-count');
  const drawerCount = document.querySelector('#drawer-count');
  const cartTotal = document.querySelector('#cart-total');
  const cartGrandTotal = document.querySelector('#cart-grand-total');
  const shippingCost = document.querySelector('#shipping-cost');
  const shippingMessage = document.querySelector('#shipping-message');
  const shippingProgress = document.querySelector('#shipping-progress');
  const productModal = document.querySelector('#product-modal');
  const toast = document.querySelector('#toast');
  const toastMessage = document.querySelector('#toast-message');
  const menu = document.querySelector('#main-nav');
  const menuTrigger = document.querySelector('[data-action="toggle-menu"]');

  let toastTimer;
  let selectedProductId = null;
  let activeFilter = 'všetky';
  let searchTerm = '';

  const productById = new Map(cards.map((card) => [card.dataset.id, {
    id: card.dataset.id,
    name: card.dataset.name,
    category: card.dataset.category,
    price: Number(card.dataset.price),
    material: card.dataset.material,
    size: card.dataset.size,
    description: card.dataset.description,
    image: card.querySelector('img')?.src || ''
  }]));

  let cart = readCart();

  function readCart() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      return Array.isArray(saved) ? saved.filter((item) => productById.has(item.id) && Number(item.quantity) > 0) : [];
    } catch {
      return [];
    }
  }

  function saveCart() {
    localStorage.setItem(storageKey, JSON.stringify(cart));
  }

  function formatPrice(value) {
    return currency.format(value).replace(/\u00a0/g, ' ');
  }

  function normalize(value) {
    return value.toLocaleLowerCase('sk-SK').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function setBodyLock(locked) {
    document.body.classList.toggle('no-scroll', locked);
  }

  function openCart() {
    cartDrawer.inert = false;
    cartDrawer.classList.add('open');
    cartBackdrop.classList.add('open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    document.querySelector('[data-action="open-cart"]').setAttribute('aria-expanded', 'true');
    setBodyLock(true);
  }

  function closeCart() {
    cartDrawer.classList.remove('open');
    cartBackdrop.classList.remove('open');
    cartDrawer.setAttribute('aria-hidden', 'true');
    cartDrawer.inert = true;
    document.querySelector('[data-action="open-cart"]').setAttribute('aria-expanded', 'false');
    setBodyLock(false);
  }

  function openModal(id) {
    const product = productById.get(id);
    if (!product) return;
    selectedProductId = id;
    productModal.inert = false;
    document.querySelector('#modal-image').src = product.image;
    document.querySelector('#modal-image').alt = product.name;
    document.querySelector('#modal-category').textContent = product.category;
    document.querySelector('#modal-title').textContent = product.name;
    document.querySelector('#modal-description').textContent = product.description;
    document.querySelector('#modal-material').textContent = product.material;
    document.querySelector('#modal-size').textContent = product.size;
    document.querySelector('#modal-price').textContent = formatPrice(product.price);
    productModal.classList.add('open');
    productModal.setAttribute('aria-hidden', 'false');
    setBodyLock(true);
    document.querySelector('[data-action="close-modal"]').focus();
  }

  function closeModal() {
    productModal.classList.remove('open');
    productModal.setAttribute('aria-hidden', 'true');
    productModal.inert = true;
    setBodyLock(false);
    selectedProductId = null;
  }

  function addToCart(id, quantity = 1) {
    const product = productById.get(id);
    if (!product) return;
    const existing = cart.find((item) => item.id === id);
    if (existing) existing.quantity += quantity;
    else cart.push({ id, quantity });
    saveCart();
    renderCart();
    showToast(`${product.name} je v košíku`);
  }

  function updateQuantity(id, delta) {
    const item = cart.find((entry) => entry.id === id);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) cart = cart.filter((entry) => entry.id !== id);
    saveCart();
    renderCart();
  }

  function removeItem(id) {
    const product = productById.get(id);
    cart = cart.filter((item) => item.id !== id);
    saveCart();
    renderCart();
    if (product) showToast(`${product.name} odstránený z košíka`);
  }

  function renderCart() {
    const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => {
      const product = productById.get(item.id);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
    const hasItems = cart.length > 0;
    const missingForShipping = Math.max(0, 80 - subtotal);

    cartCount.textContent = totalUnits;
    drawerCount.textContent = `(${totalUnits})`;
    cartEmpty.style.display = hasItems ? 'none' : 'flex';
    cartSummary.classList.toggle('visible', hasItems);
    cartTotal.textContent = formatPrice(subtotal);
    cartGrandTotal.textContent = formatPrice(subtotal + (hasItems && missingForShipping === 0 ? 0 : hasItems ? 4.9 : 0));
    shippingCost.textContent = !hasItems ? '—' : missingForShipping === 0 ? 'Zadarmo' : formatPrice(4.9);
    shippingMessage.textContent = hasItems
      ? (missingForShipping === 0 ? 'Výprava je zadarmo!' : `Pridajte ešte ${formatPrice(missingForShipping)} a výprava bude zadarmo`)
      : 'Pridajte ešte 80 € a výprava bude zadarmo';
    shippingProgress.style.width = `${Math.min(100, (subtotal / 80) * 100)}%`;

    cartItems.innerHTML = cart.map((item) => {
      const product = productById.get(item.id);
      return `<div class="cart-item" data-cart-id="${product.id}">
        <div class="cart-item-image"><img src="${product.image}" alt="${product.name}" /></div>
        <div class="cart-item-info"><strong>${product.name}</strong><span>${product.material}</span><div class="quantity-control"><button type="button" data-cart-action="decrease" aria-label="Znížiť množstvo">−</button><span>${item.quantity}</span><button type="button" data-cart-action="increase" aria-label="Zvýšiť množstvo">+</button></div></div>
        <div class="cart-item-side"><strong>${formatPrice(product.price * item.quantity)}</strong><button class="remove-item" type="button" data-cart-action="remove">Odstrániť</button></div>
      </div>`;
    }).join('');
  }

  function filterProducts() {
    const normalizedSearch = normalize(searchTerm.trim());
    let visible = 0;
    cards.forEach((card) => {
      const categoryMatch = activeFilter === 'všetky' || card.dataset.category === activeFilter;
      const searchableText = normalize(`${card.dataset.name} ${card.dataset.category} ${card.dataset.material}`);
      const searchMatch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const show = categoryMatch && searchMatch;
      card.hidden = !show;
      if (show) visible += 1;
    });
    productCount.textContent = `${visible} ${visible === 1 ? 'produkt' : visible < 5 ? 'produkty' : 'produktov'}`;
    noProducts.hidden = visible !== 0;
  }

  function closeMenu() {
    menu.classList.remove('open');
    menuTrigger.classList.remove('open');
    menuTrigger.setAttribute('aria-expanded', 'false');
  }

  productGrid.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;
    const card = actionButton.closest('.product-card');
    if (!card) return;
    const { action } = actionButton.dataset;
    if (action === 'add') addToCart(card.dataset.id);
    if (action === 'details') openModal(card.dataset.id);
  });

  productGrid.addEventListener('click', (event) => {
    const heart = event.target.closest('.heart-button');
    if (!heart) return;
    event.stopPropagation();
    heart.classList.toggle('liked');
    heart.textContent = heart.classList.contains('liked') ? '♥' : '♡';
    showToast(heart.classList.contains('liked') ? 'Pridané do obľúbených' : 'Odstránené z obľúbených');
  });

  document.querySelectorAll('.filter-button').forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll('.filter-button').forEach((item) => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', String(active));
      });
      filterProducts();
    });
  });

  searchInput.addEventListener('input', (event) => {
    searchTerm = event.target.value;
    filterProducts();
  });

  document.querySelector('[data-action="focus-search"]').addEventListener('click', () => {
    document.querySelector('#shop').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => searchInput.focus(), 450);
  });

  menuTrigger.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    menuTrigger.classList.toggle('open', open);
    menuTrigger.setAttribute('aria-expanded', String(open));
  });

  document.querySelectorAll('.main-nav a').forEach((link) => link.addEventListener('click', closeMenu));

  document.querySelector('[data-action="open-cart"]').addEventListener('click', openCart);
  document.querySelector('[data-action="close-cart"]').addEventListener('click', closeCart);
  cartBackdrop.addEventListener('click', closeCart);

  cartItems.addEventListener('click', (event) => {
    const button = event.target.closest('[data-cart-action]');
    if (!button) return;
    const item = button.closest('[data-cart-id]');
    if (!item) return;
    const id = item.dataset.cartId;
    if (button.dataset.cartAction === 'increase') updateQuantity(id, 1);
    if (button.dataset.cartAction === 'decrease') updateQuantity(id, -1);
    if (button.dataset.cartAction === 'remove') removeItem(id);
  });

  document.querySelector('[data-action="shop-from-cart"]').addEventListener('click', closeCart);
  document.querySelector('[data-action="checkout"]').addEventListener('click', () => {
    if (!cart.length) return;
    showToast('Demo verzia — platba bude pripravená čoskoro ✦');
  });

  document.querySelector('[data-action="close-modal"]').addEventListener('click', closeModal);
  productModal.addEventListener('click', (event) => {
    if (event.target === productModal) closeModal();
  });
  document.querySelector('[data-action="modal-add"]').addEventListener('click', () => {
    if (!selectedProductId) return;
    addToCart(selectedProductId);
    closeModal();
    openCart();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (productModal.classList.contains('open')) closeModal();
    else if (cartDrawer.classList.contains('open')) closeCart();
    else closeMenu();
  });

  document.querySelector('#newsletter-form').addEventListener('submit', (event) => {
    event.preventDefault();
    event.target.reset();
    showToast('Ďakujeme, príďte nám čítať ✦');
  });

  document.querySelector('[data-action="reset-filter"]').addEventListener('click', () => {
    activeFilter = 'všetky';
    searchTerm = '';
    searchInput.value = '';
    document.querySelectorAll('.filter-button').forEach((button) => {
      const active = button.dataset.filter === activeFilter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    filterProducts();
  });

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .12 }) : null;

  document.querySelectorAll('.reveal').forEach((element) => {
    if (observer) observer.observe(element);
    else element.classList.add('is-visible');
  });

  renderCart();
})();
