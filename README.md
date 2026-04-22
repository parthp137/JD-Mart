# 🍃 JD Mart - Agricultural B2B Buyer Platform

A modern, full-featured Express.js application connecting agricultural buyers with verified farmers and suppliers. Built for wholesale distribution of grains, pulses, oilseeds, and spices.

## 📋 Features

### Core Functionality
- ✅ **User Authentication** - Secure password hashing with bcryptjs, session-based auth
- ✅ **OTP Login** - Phone-based OTP authentication with 5-minute expiry
- ✅ **Product Catalog** - 20+ products across 4 categories with advanced filtering
- ✅ **Shopping Cart** - Real-time cart management with stock reservation
- ✅ **Order Management** - Complete order lifecycle with status tracking
- ✅ **Inventory Control** - Stock locking mechanism preventing overselling in concurrent checkouts
- ✅ **Notifications** - Order lifecycle notifications with read/unread filtering
- ✅ **Address Management** - Multiple saved addresses with history and default selection

### Admin Features
- 📊 Dashboard with sales statistics
- 🎨 Product CRUD operations
- 📤 Product media upload (5MB limit, multiple images per product)
- 📈 Order analytics
- 👥 User management

### Advanced Features
- 🔍 Advanced Search with text highlighting and recent search history
- 💰 Price range filtering (min/max in ₹/kg)
- 🏷️ Grade and availability filters
- 📱 Mobile-responsive design (Bootstrap 5)
- ⚡ Product caching system (5-minute TTL)
- 📄 Invoice generation and download
- 💳 Multiple payment method options
- 🔐 Atomic database operations preventing race conditions
- ✨ Real-time form validation with client-side feedback
- 🎯 Pagination across all list views (10-20 items per page)

## 🛠️ Tech Stack

- **Backend**: Express.js 5.2.1
- **Database**: MongoDB 9.1.3 (Mongoose)
- **Authentication**: bcryptjs + Express-session
- **File Upload**: Multer 1.4.5-lts.1
- **Frontend**: EJS templating with Bootstrap 5
- **Icons**: Font Awesome 7.0.1
- **Session Store**: MongoDB session persistence

## 📦 Project Structure

```
├── app.js                          # Main Express application (1800+ lines)
├── seed.js                         # Database initialization with demo data
├── package.json                    # Dependencies and scripts
├── models/
│   ├── user.js                    # User schema with addresses
│   ├── product.js                 # Product schema with images array
│   ├── order.js                   # Order schema with items and timeline
│   ├── cart.js                    # Shopping cart schema
│   ├── notification.js            # Notifications with read tracking
│   └── dashboardStat.js           # Analytics and statistics
├── views/
│   ├── index.ejs                  # Product listing with filters
│   ├── login.ejs                  # Login form
│   ├── register.ejs               # Registration form
│   ├── checkout.ejs               # Checkout with payment options
│   ├── cart.ejs                   # Shopping cart view
│   ├── orders.ejs                 # Order history
│   ├── notifications.ejs          # Notifications dashboard
│   ├── profile.ejs                # User profile
│   ├── admin-product-form.ejs    # Product creation/editing with image upload
│   └── partials/
│       ├── header.ejs             # Shared navbar
│       └── footer.ejs             # Shared footer
├── public/
│   ├── css/
│   │   ├── style.css              # Main stylesheet with responsive design
│   │   ├── login.css              # Login page styling
│   │   ├── register.css           # Registration styling
│   │   └── [other page styles]
│   ├── js/
│   │   ├── script.js              # Client-side interactivity
│   │   └── validation.js          # Form validation framework
│   ├── images/
│   │   ├── products/              # SVG product images
│   │   └── uploads/               # User-uploaded product images
├── tests/
│   └── routes.test.js             # Route documentation and test scenarios
└── README.md                       # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (local or remote)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/jd-mart.git
   cd jd-mart
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your MongoDB URL and session secret:
   ```env
   MONGODB_URL=mongodb://127.0.0.1:27017/jdmart
   SESSION_SECRET=your_secure_secret_key
   NODE_ENV=development
   DEBUG_MODE=true
   ```

4. **Initialize database with seed data**
   ```bash
   node seed.js
   ```
   This creates:
   - 2 demo users (1 admin, 1 regular)
   - 20 products across all categories
   - 3 sample orders
   - 5 notifications

5. **Start the server**
   ```bash
   npm start
   ```
   Server runs on `http://localhost:8080`

## 🔑 Demo Credentials

**Admin Account:**
- Email: `demo@jdmart.com`
- Password: `demo123`

**Regular User:**
- Email: `retailer@jdmart.com`
- Password: `demo123`

## 🧪 Available Scripts

```bash
# Start development server
npm start

# Seed database with demo data
node seed.js

# Run tests/route documentation
npm test
```

## 📱 API Routes Overview

### Authentication
- `GET /login` - Login form
- `POST /login` - Login submission
- `GET /register` - Registration form
- `POST /register` - Account creation
- `GET /otp-login` - OTP login page
- `POST /send-otp` - Generate OTP
- `POST /verify-otp` - Verify OTP and login
- `GET /forgot-password` - Password reset request
- `GET /logout` - Logout

### Products
- `GET /products` - Product listing with filters
- `GET /products/:id` - Product details
- `GET /admin/products` - Admin product list
- `GET /admin/products/create` - Create product form
- `POST /admin/products/create` - Save new product
- `GET /admin/products/:id/edit` - Edit form
- `POST /admin/products/:id/update` - Update product
- `POST /admin/products/:id/delete` - Delete product
- `POST /admin/products/:id/upload-image` - Upload product image
- `POST /admin/products/:id/delete-image/:imageIndex` - Delete image

### Shopping
- `POST /cart/add` - Add to cart
- `POST /cart/update` - Update quantity
- `POST /cart/remove` - Remove from cart
- `GET /cart` - View cart
- `GET /checkout` - Checkout page
- `POST /checkout` - Place order

### User
- `GET /profile` - User profile
- `POST /profile/update` - Update profile
- `POST /profile/address/add` - Add address
- `POST /profile/address/set-default/:id` - Set default address
- `POST /profile/address/remove/:id` - Remove address

### Orders & Notifications
- `GET /orders` - Order history (paginated)
- `GET /admin/orders` - Admin order view
- `GET /notifications` - Notifications (paginated, filterable)
- `POST /notifications/bulk/delete` - Delete multiple notifications

## 🔒 Security Features

- **Password Hashing**: bcryptjs with 10 salt rounds
- **Session Security**: MongoDB session store with 1-day maxAge
- **SQL Injection Prevention**: Mongoose parameterized queries
- **Stock Race Condition Prevention**: Atomic updateOne() operations with $inc
- **File Upload Validation**: Type and size checking (5MB limit)
- **CSRF Protection**: Session-based authentication
- **Input Validation**: Real-time client-side + server-side validation
- **Middleware Protection**: isLoggedIn and isAdmin authorization checks

## 📊 Database Schema

### Users
- Email & phone (unique)
- Hashed password with salt
- Multiple addresses with default
- Business information
- Admin role support
- Profile initials for avatars

### Products
- Category enum (Grains, Pulses, Oilseeds, Spices)
- Grade enum (A, B, C)
- Price in paise for precision
- Stock tracking (available vs. reserved)
- Multiple images with upload dates
- Delivery time range

### Orders
- User reference
- Items array with price snapshots
- Timeline with status updates
- Total amount with itemized breakdown
- Payment method tracking
- Atomic status updates

### Cart
- User reference
- Items with quantities
- Price calculations
- Stock reservation tracking

### Notifications
- User reference
- Type enum (order, payment, delivery, promotion, general)
- Read/unread tracking
- Related order reference
- Timestamps

## 🎨 UI/UX Features

- **Responsive Design**: Works on mobile (480px), tablet (768px), desktop (1920px+)
- **Bootstrap 5 Grid**: Flexible 12-column layout
- **Font Awesome Icons**: 7.0.1 with 4000+ icons
- **Mobile Navbar**: Collapsible hamburger menu
- **Advanced Filters**: Price range, grade, availability with visual reset button
- **Autocomplete Search**: Real-time suggestions as you type
- **Recent Searches**: Stored in localStorage, shown in dropdown
- **Real-time Validation**: Form feedback with error messages
- **Invoice Download**: Text-based invoice generation
- **Empty States**: Centered messaging for no results

## ⚡ Performance Optimizations

- **Product Caching**: 5-minute TTL reduces database queries
- **Pagination**: 10-20 items per page prevents memory bloat
- **Image Optimization**: SVG format for crisp product icons
- **Lazy Validation**: Only validates after blur or submission
- **Session Caching**: res.locals prevents repeated queries
- **Indexed Queries**: MongoDB indexes on email, phone, userId

## 🐛 Debug Endpoints

- `GET /debug-users` - View all registered users (DEBUG_MODE only)
- `GET /debug-password` - Test password verification (DEBUG_MODE only)
- Terminal output shows OTP codes during authentication

## 📝 Testing

Run the test documentation:
```bash
npm test
```

This displays comprehensive test scenarios for:
- User registration and login flows
- Password hashing and verification
- Cart operations with stock reservation
- Concurrent checkout handling
- Order placement atomicity
- Notification creation and filtering
- Address management operations

## 🚀 Deployment

### Production Setup
```bash
# Install dependencies
npm install

# Set production environment variables
export NODE_ENV=production
export SESSION_SECRET=your_production_secret
export MONGODB_URL=your_mongodb_atlas_url

# Run server
npm start
```

### Recommended Services
- **Hosting**: Heroku, Railway, Render
- **Database**: MongoDB Atlas
- **File Storage**: AWS S3 for user uploads (future enhancement)
- **Email**: SendGrid for OTP/notifications (future enhancement)

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

## 👨‍💻 Authors

- **Group 7** - JD Solutions Team

## 📞 Support

For issues and questions:
- Open a GitHub Issue
- Email: support@jdmart.com
- Documentation: Check `/tests/routes.test.js` for API usage examples

## 🎯 Roadmap

- [ ] Email notifications for order updates
- [ ] SMS delivery via Twilio
- [ ] Payment gateway integration (Stripe/Razorpay)
- [ ] Advanced analytics dashboard
- [ ] Seller ratings and reviews
- [ ] Bulk order management
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Mobile app (React Native)
- [ ] Real-time chat support
- [ ] Automated price tracking

## 🙏 Acknowledgments

- Bootstrap team for responsive UI framework
- Font Awesome for icon library
- Express.js community
- MongoDB documentation

---

**Made with ❤️ for farmers and agricultural businesses**
