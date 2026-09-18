# 💎 Allure Jewelries - POS & Inventory Management System

A full-stack Point of Sale (POS) and inventory management web application tailored for boutique jewelry retailers. Built with Node.js and Express on the backend, paired with an interactive, responsive vanilla JavaScript frontend.

---

## ✨ Features

- **🛍️ Point of Sale (POS) Checkout:**
  - Fast, intuitive storefront layout for searching and adding jewelry pieces to the shopping cart.
  - Automatic order total calculations and persistent sales recording.

- **📦 Real-Time Inventory Control:**
  - Track stock levels, prices, product descriptions, and image catalogs.
  - JSON-backed data storage simulating database persistence without heavy setup.

- **🎨 Modern & Responsive UI:**
  - Custom responsive layout with clean visual hierarchy.
  - Styled with modern CSS components and interactive UX feedback.

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Database / Persistence:** File-based JSON storage (`inventory.json`, `sales.json`)
- **Version Control:** Git & GitHub

---

## 📁 Project Structure

```text
allure-jewelries-pos/
├── public/
│   ├── images/          # Product jewelry catalog images
│   ├── index.html       # Storefront & POS interface
│   ├── style.css        # Stylesheets & layout rules
│   └── app.js           # Client-side DOM & API logic
├── server.js            # Express API server & routes
├── inventory.json       # Product records and stock quantities
├── sales.json           # Completed transaction records
├── package.json         # Project dependencies & start scripts
└── README.md            # Project documentation
