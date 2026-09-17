# 🍃 JD Mart - Agricultural B2B Buyer Platform

A modern, high-performance Express.js B2B agricultural commodity trading platform connecting wholesale grain, pulse, oilseed, and spice buyers with verified APMC mandi farmers and suppliers across India.

---

## 📋 Features

### 🌾 Core Buyer Functionality
- ✅ **Authentication & Security**: Hardened session-based authentication with bcrypt (12 salt rounds), timing-attack protection, session fixation regeneration, and input sanitization.
- ✅ **Phone OTP Login**: Cryptographically secure 6-digit OTP generation with SHA-256 session hashing and a 5-minute expiry.
- ✅ **Email Verification**: Cryptographic SHA-256 token verification flow with 24-hour expiration.
- ✅ **Password Recovery**: Anti-enumeration forgot-password flow with expiring SHA-256 tokens (15-minute validity).
- ✅ **Product Catalog & Advanced Filters**: Multi-criteria filtering by Category (Grains, Pulses, Oilseeds, Spices), Grade (A, B, C), Price Range (₹/kg or ₹/Qtl), Stock Availability, and keyword search.
- ✅ **Real-Time Shopping Cart**: Dynamic cart management with stock reservation locking (`Product.reserved`) to prevent overselling during checkout.
- ✅ **Instant "Buy Now" & Direct Checkout**: Streamlined 1-click purchasing flow for high-priority wholesale shipments.
- ✅ **B2B Wholesale Request for Quote (RFQ)**: Direct price negotiation engine allowing buyers to propose target prices and accept or decline supplier counter-offers.
- ✅ **Order Lifecycle Tracking**: 7-stage visual delivery progression tracker (`Pending` ➔ `Placed` ➔ `Confirmed` ➔ `Processing` ➔ `Shipped` ➔ `In Transit` ➔ `Delivered`).
- ✅ **User Profile & Multi-Address Management**: Saved delivery hubs (Farm, Office, Warehouse) with default address selection.
- ✅ **Notification Inbox**: Real-time notifications for order status changes, quote counter-offers, and verification milestones with read/unread filtering and bulk deletion.

### 🚜 Mandi & Wholesale Features
- 📜 **Farm Traceability Passport & QR Certificate**: APMC mandi license verification, FSSAI compliance, and soil health/moisture quality reporting.
- 💰 **Tiered Volume Discounts**: Built-in tiered wholesale pricing (e.g., 5% discount for 10+ Quintals, 10% for 25+ Quintals).
- 🔔 **Mandi Price Alert Engine**: Price threshold monitoring alerting buyers when mandi spot rates drop.
- 🛒 **Slide-Over Mini-Cart Drawer**: Slide-over drawer with free-freight milestone tracking (25 Quintal threshold).

### 🛠️ Admin & Supplier Management
- 📊 **Analytics Dashboard**: Real-time counters for total catalog products, low-stock alerts, active wholesale orders, and registered buyers.
- 📦 **Product Catalog Management**: Complete CRUD operations for agricultural lots with MOQ, grade, demand indicators, and delivery windows.
- 📤 **Multi-Media Uploads**: Multer image uploading (5MB limit) with automatic disk cleanup on deletion or error.
- 👥 **User & Order Administration**: Oversight of registered wholesale traders, buyers, and order statuses.

---

## 🛠️ Tech Stack

- **Backend Framework**: Express.js 5.2.1
- **Database & ODM**: MongoDB with Mongoose 9.1.3
- **Templating Engine**: EJS with `ejs-mate` layouts
- **Security & Headers**: Helmet 8.3.0 (Strict Content Security Policy) & express-rate-limit 7.1.5
- **Authentication**: bcryptjs (12 salt rounds) & express-session with `connect-mongo` session persistence
- **File Uploads**: Multer 1.4.5
- **Styling & UI**: Bootstrap 5, Font Awesome 7 Icons, and custom CSS design system
- **Testing**: Node.js Native Test Runner (`node:test` + `node:assert/strict`)

---

## 📦 Project Directory Structure

```
Group_7_Buyer_System/
├── app.js                          # Express application entry point & middleware configuration
├── seed.js                         # Database initialization with realistic agricultural demo data
├── package.json                    # Project metadata, dependencies, and test scripts
├── .env.example                    # Environment variable templates
│
├── config/                         # Configuration modules
│   ├── constants.js                # App constants, timeouts, salt rounds, and pagination limits
│   ├── db.js                       # Mongoose MongoDB connection lifecycle manager
│   └── multer.js                   # Multer storage engine and file filter configuration
│
├── middleware/                     # Express middlewares
│   ├── auth.js                     # isLoggedIn and isAdmin authorization guards
│   ├── errorHandler.js             # 404 Not Found and 500 Server Error handlers
│   ├── locals.js                   # Global template helpers, user session, and cart/notification counters
│   └── rateLimiter.js              # Rate limiters for auth, OTP, register, and password reset
│
├── models/                         # Mongoose data models
│   ├── user.js                     # User schema (roles, addresses, credentials, tokens)
│   ├── product.js                  # Agricultural commodity schema (grades, tiers, supplier info)
│   ├── order.js                    # Order schema (item price snapshots, fee breakdown, timeline)
│   ├── cart.js                     # Shopping cart schema with item reservation
│   ├── rfq.js                      # Request for Quote schema (negotiated counter prices & timeline)
│   ├── notification.js             # User notification schema
│   └── dashboardStat.js            # Admin dashboard statistics helper
│
├── routes/                         # Modular route controllers
│   ├── auth.routes.js              # Login, register, OTP, email verification, password reset, logout
│   ├── product.routes.js           # Product catalog browsing, filtering, and detail view
│   ├── cart.routes.js              # Cart additions, quantity adjustments, item removals, clear
│   ├── order.routes.js             # Checkout, Buy Now flow, order placement, status tracking
│   ├── rfq.routes.js               # Buyer quote submissions, counter acceptance, and admin responses
│   ├── admin.routes.js             # Admin dashboard, product CRUD, image upload/delete, orders
│   ├── notification.routes.js      # Notification inbox, mark read, bulk delete
│   └── profile.routes.js           # Profile details and address book management
│
├── utils/                          # Reusable helper functions
│   ├── filters.js                  # Query parser and safe regex MongoDB filter builder
│   ├── image.js                    # Crop placeholders and asset URL resolvers
│   ├── money.js                    # Monetary unit normalization and formatting
│   ├── timeline.js                 # Order progression timeline generation
│   └── validation.js               # Email, phone, password strength, and address validators
│
├── views/                          # EJS templates
│   ├── index.ejs                   # Main product listing catalog with filters
│   ├── show.ejs                    # Comprehensive product detail page & 3D inspection
│   ├── cart.ejs                    # Full-page shopping cart
│   ├── checkout.ejs                # Multi-item order checkout
│   ├── checkout-buy-now.ejs        # Direct single-product checkout
│   ├── orders.ejs                  # Order history and visual progression tracking
│   ├── rfqs.ejs                    # Wholesale RFQ quote negotiation dashboard
│   ├── login.ejs                   # Password login
│   ├── register.ejs                # User registration
│   ├── otp.ejs                     # Phone OTP request & verification
│   ├── forgot-password.ejs         # Password reset request and form
│   ├── verify-email.ejs            # Email verification confirmation page
│   ├── profile.ejs                 # Buyer profile summary
│   ├── profile-edit.ejs            # Edit profile and address management
│   ├── notifications.ejs           # Notification management center
│   ├── admin-dashboard.ejs         # Admin overview, product list, orders, and users
│   ├── admin-product-form.ejs      # Product create/edit form with image uploader
│   ├── error.ejs                   # Error display page
│   └── partials/
│       ├── header.ejs              # Global navigation bar, search, and badges
│       └── footer.ejs              # Global footer, mini-cart drawer, and RFQ modal
│
├── public/                         # Static assets
│   ├── css/                        # Stylesheets (style.css, login.css, register.css)
│   ├── js/                         # Client scripts (script.js, validation.js, 3D viewers)
│   └── images/                     # SVG icons and uploaded product photos
│
└── tests/                          # Test suites
    ├── app-utils.test.js           # Unit tests for security, token hashing, and utilities
    └── routes.test.js              # Route behavior and integration test specifications
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017`) or MongoDB Atlas URI
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/parthp137/JD-Mart.git
   cd Group_7_Buyer_System
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your settings:
   ```env
   PORT=8080
   MONGODB_URL=mongodb://127.0.0.1:27017/jdmart1
   SESSION_SECRET=your_super_secret_session_key_here
   NODE_ENV=development
   DEBUG_MODE=true
   ```

4. **Seed database with demo data**
   ```bash
   npm run seed
   ```
   *Creates 2 demo accounts (Admin & Retailer), 20 agricultural products across all categories, sample orders, and notifications.*

5. **Start the application**
   ```bash
   npm start
   ```
   Access the portal at `http://localhost:8080`.

---

## 🔑 Demo Credentials

| Role | Email | Phone | Password |
| :--- | :--- | :--- | :--- |
| **Admin / Supplier** | `demo@jdmart.com` | `9876543210` | `demo123` |
| **Wholesale Retailer** | `retailer@jdmart.com` | `9123456780` | `demo123` |

---

## 📱 API Routes Reference

### 🔐 Authentication & Account (`/routes/auth.routes.js`)
- `GET  /login` - Render login form
- `POST /login` - Password login with rate limiting & session regeneration
- `GET  /otp-login` - Render OTP request view
- `POST /send-otp` - Generate and send 6-digit OTP (logged in terminal in dev mode)
- `POST /verify-otp` - Verify timing-safe OTP and create session
- `GET  /register` - Render registration form
- `POST /register` - Create account & generate email verification token
- `GET  /verify-email/:token` - Verify email token
- `POST /resend-verification` - Resend verification link
- `GET  /forgot-password` - Request password reset link
- `POST /forgot-password` - Generate reset token
- `GET  /reset-password/:token` - Password reset entry form
- `POST /reset-password/:token` - Set new password
- `GET  /logout` - Destroy session and clear cookies

### 🌾 Product Catalog (`/routes/product.routes.js`)
- `GET  /` - Root redirect (to `/products` if authenticated, `/login` otherwise)
- `GET  /products` - Filterable, paginated product catalog
- `GET  /products/:id` - Detailed product view with quality metrics & RFQ drawer

### 🛒 Cart & Checkout (`/routes/cart.routes.js` & `/routes/order.routes.js`)
- `GET  /cart` - View shopping cart
- `POST /cart/add/:id` - Add product to cart and reserve stock
- `POST /cart/update/:productId` - Update cart item quantity
- `POST /cart/remove/:productId` - Remove item and release reservation
- `POST /cart/clear` - Empty cart and release all reservations
- `POST /orders/buy-now/:id` - Initialize 1-click Buy Now session
- `GET  /checkout-buy-now` - Direct single-item checkout page
- `POST /orders/buy-now-place` - Place Buy Now order atomically
- `GET  /checkout` - Cart checkout page with tax & logistics breakdown
- `POST /orders/place` - Place multi-item order atomically

### 🤝 Request for Quote (RFQ) (`/routes/rfq.routes.js`)
- `GET  /rfqs` - Buyer quote dashboard
- `POST /rfq/submit` - Submit custom quantity and target price proposal
- `POST /rfqs/:id/accept-counter` - Accept supplier counter-offer and proceed to checkout
- `POST /admin/rfqs/:id/respond` - Admin accept, counter, or reject quote

### 📦 Orders & Notifications (`/routes/order.routes.js` & `/routes/notification.routes.js`)
- `GET  /orders` - Buyer order history with status timeline
- `POST /orders/:id/status` - Admin update order status
- `GET  /notifications` - Paginated notifications
- `POST /notifications/mark-all-read` - Mark all notifications read
- `POST /notifications/:id/mark-read` - Mark single notification read
- `POST /notifications/:id/delete` - Delete single notification
- `POST /notifications/bulk/delete` - Bulk delete notifications

### 👤 Profile & Addresses (`/routes/profile.routes.js`)
- `GET  /profile` - View user profile
- `GET  /profile/edit` - Profile edit form and address book
- `POST /profile/edit` - Update profile details and password
- `POST /profile/address/add` - Add new delivery address
- `POST /profile/address/set-default/:addressId` - Set default delivery address
- `POST /profile/address/remove/:addressId` - Remove saved address

### 🛠️ Admin Dashboard (`/routes/admin.routes.js`)
- `GET  /admin` - Admin overview statistics
- `GET  /admin/products` - Admin product inventory
- `GET  /admin/products/create` - Product creation form
- `POST /admin/products/create` - Save new product
- `GET  /admin/products/:id/edit` - Product edit form
- `POST /admin/products/:id/update` - Update product details & supplier info
- `POST /admin/products/:id/delete` - Delete product
- `POST /admin/products/:id/upload-image` - Upload product image via Multer
- `POST /admin/products/:id/delete-image/:imageIndex` - Delete product image
- `GET  /admin/orders` - View all wholesale orders
- `GET  /admin/users` - View registered buyers and traders
- `GET  /admin/notifications` - View global notification feed

---

## 🧪 Testing

Run the automated test suite using the Node.js native test runner:

```bash
npm test
```

### Test Coverage Highlights
- Password strength enforcement, email/phone format validation.
- SHA-256 token generation and expiration validation.
- User schema credential stripping via `toJSON` transform.
- Stock reservation and atomic checkout consistency.
- Money calculation and filter builder unit tests.

---

## 📄 License

This project is licensed under the ISC License.

---

**Made with ❤️ by Group 7 - JD Solutions Team**
