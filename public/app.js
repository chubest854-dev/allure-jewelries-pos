let allProducts = [];
let allSales = [];
let cart = [];
let selectedPaymentMethod = '';
let activeScaleProduct = null; // Stores the gold jewelry currently on the scale
const LOW_STOCK_THRESHOLD = 5;

// 1. Initial Data Fetch
async function init() {
  await fetchInventory();
  await fetchSales();
}

async function fetchInventory() {
  try {
    const res = await fetch('/api/inventory');
    allProducts = await res.json();
    renderFilteredProducts();
    renderInventoryManager();
  } catch (err) {
    console.error('Error fetching inventory:', err);
  }
}

async function fetchSales() {
  try {
    const res = await fetch('/api/sales');
    allSales = await res.json();
  } catch (err) {
    console.error('Error fetching sales:', err);
  }
}

// 2. View Switching
function switchView(view) {
  const btnPos = document.getElementById('btn-view-pos');
  const btnSales = document.getElementById('btn-view-sales');
  const btnInventory = document.getElementById('btn-view-inventory');

  const posView = document.getElementById('pos-view');
  const salesView = document.getElementById('sales-view');
  const inventoryView = document.getElementById('inventory-view');
  const cartPanel = document.getElementById('cart-panel');

  [btnPos, btnSales, btnInventory].forEach(btn => btn && btn.classList.remove('active'));

  if (posView) posView.style.display = 'none';
  if (salesView) salesView.style.display = 'none';
  if (inventoryView) inventoryView.style.display = 'none';

  if (view === 'pos') {
    if (posView) posView.style.display = 'block';
    if (cartPanel) cartPanel.style.display = 'flex';
    if (btnPos) btnPos.classList.add('active');
    renderFilteredProducts();
  } else if (view === 'sales') {
    if (salesView) salesView.style.display = 'block';
    if (cartPanel) cartPanel.style.display = 'none';
    if (btnSales) btnSales.classList.add('active');
    filterSales('today');
  } else if (view === 'inventory') {
    if (inventoryView) inventoryView.style.display = 'block';
    if (cartPanel) cartPanel.style.display = 'none';
    if (btnInventory) btnInventory.classList.add('active');
    renderInventoryManager();
  }
}

// 3. Filter & Render POS Cards
function renderFilteredProducts() {
  const searchInput = document.getElementById('search-bar');
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

  const activeBtn = document.querySelector('.cat-btn.active');
  const activeCategory = activeBtn ? activeBtn.getAttribute('data-category') : 'all';

  const filtered = allProducts.filter(product => {
    const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm) || 
                          product.category.toLowerCase().includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  renderProducts(filtered);
}

function renderProducts(products) {
  const productGrid = document.getElementById('product-grid');
  if (!productGrid) return;
  productGrid.innerHTML = '';

  if (products.length === 0) {
    productGrid.innerHTML = '<p style="color: #888; text-align: center; grid-column: 1 / -1; padding: 40px 0;">No items found.</p>';
    return;
  }

  products.forEach(product => {
    const card = document.createElement('div');
    const isGold = product.category === 'gold' || product.category === 'gold-exchange';
    const isOutOfStock = product.stock <= 0;

    card.className = `product-card ${isGold ? 'gold-card' : ''}`;
    
    if (isOutOfStock) {
      card.style.opacity = '0.5';
      card.style.cursor = 'not-allowed';
    } else {
      card.style.cursor = 'pointer';
      // If it's a gold piece, open the gram scale; otherwise, add standard item directly
      card.onclick = () => isGold ? openGoldScaleModal(product.id) : addToCart(product.id);
    }

    const fallbackImg = 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&auto=format&fit=crop&q=80';
    const imagePath = product.image ? `images/${product.image}` : fallbackImg;
    const priceText = isGold && product.pricePerGram 
      ? `₦${product.pricePerGram.toLocaleString()} / g` 
      : `₦${product.price.toLocaleString()}`;

    card.innerHTML = `
      <span class="stock-tag ${isOutOfStock ? 'out' : ''}">
        ${isOutOfStock ? 'Out of Stock' : `${product.stock}${isGold ? 'g' : ' left'}`}
      </span>
      <img src="${imagePath}" onerror="this.src='${fallbackImg}'" alt="${product.name}">
      <h3>${product.name}</h3>
      <p style="color: ${isGold ? '#b8860b' : '#ff69b4'};">${priceText}</p>
    `;

    productGrid.appendChild(card);
  });
}

// 4. Dedicated Gold Scale Modal Controls
function openGoldScaleModal(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product || product.stock <= 0) return;

  activeScaleProduct = product;
  const rate = product.pricePerGram || product.price;

  document.getElementById('scale-modal-title').innerText = `⚖️ Weighing: ${product.name}`;
  document.getElementById('scale-modal-rate').innerText = `Rate: ₦${rate.toLocaleString()} / gram (Available: ${product.stock}g)`;
  document.getElementById('modal-scale-input').value = '';
  document.getElementById('gold-scale-modal').style.display = 'flex';
}

function setModalScaleWeight(grams) {
  const input = document.getElementById('modal-scale-input');
  if (input) input.value = grams;
}

function closeGoldScaleModal() {
  document.getElementById('gold-scale-modal').style.display = 'none';
  activeScaleProduct = null;
}

function confirmGoldWeightToCart() {
  if (!activeScaleProduct) return;

  const weightInput = document.getElementById('modal-scale-input');
  const weight = parseFloat(weightInput.value);

  if (isNaN(weight) || weight <= 0) {
    alert("Please enter or select a valid weight in grams.");
    return;
  }

  if (weight > activeScaleProduct.stock) {
    alert(`Insufficient gold stock! Only ${activeScaleProduct.stock}g available in vault.`);
    return;
  }

  const rate = activeScaleProduct.pricePerGram || activeScaleProduct.price;
  const calculatedPrice = rate * weight;

  cart.push({
    id: activeScaleProduct.id,
    name: activeScaleProduct.name,
    displayName: `${activeScaleProduct.name} (${weight}g)`,
    unitPrice: rate,
    quantityOrWeight: weight,
    isGold: true,
    totalPrice: calculatedPrice
  });

  activeScaleProduct.stock -= weight;
  closeGoldScaleModal();
  renderFilteredProducts();
  updateCartUI();
}

// 5. Standard Cart Operations
function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product || product.stock <= 0) return;

  const existingItem = cart.find(item => item.id === productId && !item.isGold);

  if (existingItem) {
    if (product.stock > 0) {
      existingItem.quantityOrWeight += 1;
      existingItem.totalPrice = existingItem.unitPrice * existingItem.quantityOrWeight;
      product.stock -= 1;
    } else {
      alert("No more units available in stock!");
      return;
    }
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      displayName: product.name,
      unitPrice: product.price,
      quantityOrWeight: 1,
      isGold: false,
      totalPrice: product.price
    });
    product.stock -= 1;
  }

  renderFilteredProducts();
  updateCartUI();
}

function changeQty(index, delta) {
  const item = cart[index];
  const product = allProducts.find(p => p.id === item.id);

  if (item.isGold) return;

  if (delta > 0) {
    if (product && product.stock > 0) {
      item.quantityOrWeight += 1;
      item.totalPrice = item.unitPrice * item.quantityOrWeight;
      product.stock -= 1;
    } else {
      alert("No more units available in stock!");
    }
  } else if (delta < 0) {
    item.quantityOrWeight -= 1;
    item.totalPrice = item.unitPrice * item.quantityOrWeight;
    if (product) product.stock += 1;

    if (item.quantityOrWeight <= 0) {
      cart.splice(index, 1);
    }
  }

  renderFilteredProducts();
  updateCartUI();
}

function removeFromCart(index) {
  const item = cart[index];
  const product = allProducts.find(p => p.id === item.id);

  if (product) {
    product.stock += item.quantityOrWeight;
  }

  cart.splice(index, 1);
  renderFilteredProducts();
  updateCartUI();
}

// 6. Totals & 5% Discount Calculation
function calculateTotals() {
  let subtotal = 0;
  cart.forEach(item => subtotal += item.totalPrice);
  const discount = subtotal >= 1000000 ? subtotal * 0.05 : 0;
  return { subtotal, discount, finalTotal: subtotal - discount };
}

function updateCartUI() {
  const cartItemsContainer = document.getElementById('cart-items');
  const cartTotalDisplay = document.getElementById('cart-total');
  const subtotalDisplay = document.getElementById('subtotal-price');
  const discountRow = document.getElementById('discount-row');
  const discountAmount = document.getElementById('discount-amount');

  if (!cartItemsContainer) return;
  cartItemsContainer.innerHTML = '';
  const { subtotal, discount, finalTotal } = calculateTotals();

  cart.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'cart-line-item';

    if (item.isGold) {
      div.innerHTML = `
        <div>
          <div><strong>${item.displayName}</strong></div>
          <div style="color: #b8860b; font-size: 12px; margin-top: 2px;">₦${item.totalPrice.toLocaleString()}</div>
        </div>
        <button onclick="removeFromCart(${index})" class="del-btn" title="Remove item">✕</button>
      `;
    } else {
      div.innerHTML = `
        <div>
          <div><strong>${item.name}</strong></div>
          <div style="color: #ff69b4; font-size: 12px; margin-top: 2px;">₦${item.totalPrice.toLocaleString()}</div>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="changeQty(${index}, -1)">−</button>
          <span style="font-weight: 600; min-width: 16px; text-align: center;">${item.quantityOrWeight}</span>
          <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
          <button onclick="removeFromCart(${index})" class="del-btn" title="Remove item">✕</button>
        </div>
      `;
    }

    cartItemsContainer.appendChild(div);
  });

  if (subtotalDisplay) subtotalDisplay.innerText = `₦${subtotal.toLocaleString()}`;

  if (discountRow && discountAmount) {
    if (discount > 0) {
      discountRow.style.display = 'flex';
      discountAmount.innerText = `-₦${discount.toLocaleString()}`;
    } else {
      discountRow.style.display = 'none';
    }
  }

  if (cartTotalDisplay) cartTotalDisplay.innerText = `₦${finalTotal.toLocaleString()}`;
}

// 7. Checkout & Receipts
function handleCheckout() {
  if (cart.length === 0) {
    alert("Your cart is empty! Please add items before checking out.");
    return;
  }
  const { finalTotal } = calculateTotals();
  const modalTotal = document.getElementById('modal-total-display');
  if (modalTotal) modalTotal.innerText = `Total Due: ₦${finalTotal.toLocaleString()}`;
  document.getElementById('checkout-modal').style.display = 'flex';
}

function closeCheckoutModal() {
  document.getElementById('checkout-modal').style.display = 'none';
}

async function processPayment(method) {
  selectedPaymentMethod = method;
  const { subtotal, discount, finalTotal } = calculateTotals();

  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cart,
        paymentMethod: method,
        subtotal,
        discount,
        total: finalTotal
      })
    });

    const result = await response.json();
    if (result.success) {
      allProducts = result.inventory;
      allSales.unshift(result.order);
      closeCheckoutModal();
      openReceipt();
      renderInventoryManager();
    }
  } catch (error) {
    console.error('Checkout error:', error);
  }
}

function openReceipt() {
  const { subtotal, discount, finalTotal } = calculateTotals();
  const itemsContainer = document.getElementById('receipt-items-list');
  const receiptModal = document.getElementById('receipt-modal');

  if (!itemsContainer || !receiptModal) return;
  itemsContainer.innerHTML = '';

  cart.forEach(item => {
    const row = document.createElement('div');
    row.className = 'receipt-item-row';
    const qtyText = item.isGold ? '' : ` x${item.quantityOrWeight}`;
    row.innerHTML = `
      <span>${item.displayName}${qtyText}</span>
      <span>₦${item.totalPrice.toLocaleString()}</span>
    `;
    itemsContainer.appendChild(row);
  });

  const recDiscountLine = document.getElementById('rec-discount-line');
  const recDiscount = document.getElementById('rec-discount');

  if (discount > 0) {
    if (recDiscountLine) recDiscountLine.style.display = 'flex';
    if (recDiscount) recDiscount.innerText = `-₦${discount.toLocaleString()}`;
  } else if (recDiscountLine) {
    recDiscountLine.style.display = 'none';
  }

  document.getElementById('receipt-date').innerText = new Date().toLocaleString();
  document.getElementById('receipt-id').innerText = `Order #: ALU-${Date.now().toString().slice(-6)}`;
  document.getElementById('receipt-method').innerText = `Paid via: ${selectedPaymentMethod}`;
  document.getElementById('rec-subtotal').innerText = `₦${subtotal.toLocaleString()}`;
  document.getElementById('rec-total').innerText = `₦${finalTotal.toLocaleString()}`;

  receiptModal.style.display = 'flex';
}

function closeReceipt(clearCartAfterSale = false) {
  const receiptModal = document.getElementById('receipt-modal');
  if (receiptModal) receiptModal.style.display = 'none';

  if (clearCartAfterSale) {
    cart = [];
    updateCartUI();
    renderFilteredProducts();
  }
}

// 8. Analytics & Stock Management
function filterSales(period) {
  const now = new Date();
  const filtered = allSales.filter(sale => {
    const saleDate = new Date(sale.date);
    if (period === 'today') {
      return saleDate.toDateString() === now.toDateString();
    } else if (period === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return saleDate >= oneWeekAgo;
    } else if (period === 'month') {
      return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  renderSalesAnalytics(filtered);
}

function renderSalesAnalytics(sales) {
  let revenue = 0;
  let discounts = 0;

  const tableBody = document.getElementById('sales-table-body');
  if (!tableBody) return;
  tableBody.innerHTML = '';

  sales.forEach(sale => {
    revenue += sale.total;
    discounts += sale.discount || 0;

    const itemsSummary = sale.items.map(i => `${i.displayName || i.name} (x${i.quantityOrWeight})`).join(', ');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${sale.orderId}</strong></td>
      <td>${new Date(sale.date).toLocaleString()}</td>
      <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${itemsSummary}</td>
      <td>${sale.paymentMethod}</td>
      <td style="color: #ff69b4; font-weight: bold;">₦${sale.total.toLocaleString()}</td>
    `;
    tableBody.appendChild(row);
  });

  document.getElementById('kpi-revenue').innerText = `₦${revenue.toLocaleString()}`;
  document.getElementById('kpi-orders').innerText = sales.length;
  document.getElementById('kpi-discounts').innerText = `₦${discounts.toLocaleString()}`;
}

function renderInventoryManager() {
  const tableBody = document.getElementById('inventory-table-body');
  const banner = document.getElementById('low-stock-banner');
  if (!tableBody) return;
  tableBody.innerHTML = '';

  const lowStockItems = allProducts.filter(p => p.stock <= LOW_STOCK_THRESHOLD);

  if (banner) {
    if (lowStockItems.length > 0) {
      banner.style.display = 'block';
      banner.innerHTML = `⚠️ <strong>Low Stock Warning:</strong> ${lowStockItems.length} item(s) are running low (${lowStockItems.map(i => i.name).join(', ')}).`;
    } else {
      banner.style.display = 'none';
    }
  }

  allProducts.forEach(product => {
    const isLow = product.stock <= LOW_STOCK_THRESHOLD;
    const isOut = product.stock <= 0;
    const unit = (product.category === 'gold' || product.category === 'gold-exchange') ? 'g' : ' pcs';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${product.name}</strong></td>
      <td>${product.category}</td>
      <td>₦${(product.pricePerGram || product.price).toLocaleString()}</td>
      <td style="font-weight: bold; color: ${isOut ? '#ff4747' : isLow ? '#ff9800' : '#2b2b30'};">
        ${product.stock}${unit}
      </td>
      <td>
        <span class="stock-tag ${isOut ? 'out' : ''}" style="position: static;">
          ${isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Good'}
        </span>
      </td>
      <td>
        <button onclick="promptRestock(${product.id})">+ Restock</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

async function promptRestock(productId) {
  const product = allProducts.find(p => p.id === productId);
  const qty = prompt(`Add stock for ${product.name}:`, "10");
  if (!qty || isNaN(qty) || Number(qty) <= 0) return;

  const res = await fetch('/api/restock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, addedQuantity: Number(qty) })
  });

  const data = await res.json();
  if (data.success) {
    allProducts = data.inventory;
    renderInventoryManager();
    renderFilteredProducts();
  }
}

// 9. Window Bindings
window.switchView = switchView;
window.filterSales = filterSales;
window.promptRestock = promptRestock;
window.openGoldScaleModal = openGoldScaleModal;
window.setModalScaleWeight = setModalScaleWeight;
window.closeGoldScaleModal = closeGoldScaleModal;
window.confirmGoldWeightToCart = confirmGoldWeightToCart;
window.addToCart = addToCart;
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;
window.handleCheckout = handleCheckout;
window.closeCheckoutModal = closeCheckoutModal;
window.processPayment = processPayment;
window.openReceipt = openReceipt;
window.closeReceipt = closeReceipt;

// 10. Listeners
const searchBar = document.getElementById('search-bar');
if (searchBar) {
  searchBar.addEventListener('input', renderFilteredProducts);
}

const categoryButtons = document.querySelectorAll('.cat-btn');
if (categoryButtons.length > 0) {
  categoryButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      categoryButtons.forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      renderFilteredProducts();
    });
  });
}

// Initialize
init();