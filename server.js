const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const INVENTORY_FILE = path.join(__dirname, 'inventory.json');
const SALES_FILE = path.join(__dirname, 'sales.json');

// Helper to safely read JSON files
function readData(filePath) {
  try {
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]');
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return [];
  }
}

// 1. Get Inventory
app.get('/api/inventory', (req, res) => {
  res.json(readData(INVENTORY_FILE));
});

// 2. Process Checkout (Record Sale + Save Deducted Stock)
app.post('/api/checkout', (req, res) => {
  const { cart, paymentMethod, subtotal, discount, total } = req.body;
  if (!cart || cart.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const inventory = readData(INVENTORY_FILE);
  const sales = readData(SALES_FILE);

  // Deduct items from inventory
  cart.forEach(item => {
    const product = inventory.find(p => p.id === item.id);
    if (product) {
      product.stock -= item.quantityOrWeight;
      if (product.stock < 0) product.stock = 0;
    }
  });

  // Save new order record with timestamp
  const newSale = {
    orderId: `ALU-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString(),
    items: cart,
    paymentMethod,
    subtotal,
    discount,
    total
  };

  sales.unshift(newSale);

  fs.writeFileSync(INVENTORY_FILE, JSON.stringify(inventory, null, 2));
  fs.writeFileSync(SALES_FILE, JSON.stringify(sales, null, 2));

  res.json({ success: true, order: newSale, inventory });
});

// 3. Get Sales History
app.get('/api/sales', (req, res) => {
  res.json(readData(SALES_FILE));
});

// 4. Restock an Item
app.post('/api/restock', (req, res) => {
  const { productId, addedQuantity } = req.body;
  const inventory = readData(INVENTORY_FILE);
  const product = inventory.find(p => p.id === productId);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  product.stock += parseFloat(addedQuantity);
  fs.writeFileSync(INVENTORY_FILE, JSON.stringify(inventory, null, 2));

  res.json({ success: true, inventory });
});

app.listen(PORT, () => {
  console.log(`✨ Allure Jewelries POS running on http://localhost:${PORT}`);
});