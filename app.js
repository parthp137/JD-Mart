/**
 * JD Mart - Agricultural B2B Buyer Platform
 * Main Application Bootstrap & Middleware Configuration
 */
require("dotenv").config();
const path = require("path");
const express = require("express");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const helmet = require("helmet");
const morgan = require("morgan");

// Database & Config
const { connectDB, MONGO_URL } = require("./config/db");
const {
  PORT,
  SESSION_SECRET,
  SESSION_MAX_AGE,
  IS_PRODUCTION,
  DEBUG_MODE
} = require("./config/constants");

// Middlewares
const { setupLocals } = require("./middleware/locals");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const { isLoggedIn, isAdmin } = require("./middleware/auth");

// Utilities for legacy and test compatibility
const { normalizeMoney, formatMoney } = require("./utils/money");
const { getOrderTimeline } = require("./utils/timeline");
const {
  buildProductFilter,
  buildErrorQuery,
  parsePageValue
} = require("./utils/filters");
const { getImageUrl, getCropPlaceholder } = require("./utils/image");

// Routes
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/order.routes");
const profileRoutes = require("./routes/profile.routes");
const notificationRoutes = require("./routes/notification.routes");
const adminRoutes = require("./routes/admin.routes");
const rfqRoutes = require("./routes/rfq.routes");

const app = express();

// ===========================
// SECURITY HEADERS (HELMET)
// ===========================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://kit.fontawesome.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
          "https://ka-f.fontawesome.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
          "https://ka-f.fontawesome.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://images.unsplash.com",
          "https://cdn.jsdelivr.net"
        ],
        connectSrc: ["'self'", "https://ka-f.fontawesome.com"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

if (DEBUG_MODE) {
  app.use(morgan("dev"));
}

// ===========================
// TEMPLATING & STATIC ASSETS
// ===========================
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

// ===========================
// SESSION CONFIGURATION
// ===========================
const sessionConfig = {
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE
  }
};

if (process.env.NODE_ENV !== "test") {
  sessionConfig.store = MongoStore.create({
    mongoUrl: MONGO_URL,
    touchAfter: 24 * 3600
  });
}

app.use(session(sessionConfig));

// App helpers mounted to app.locals
app.locals.formatMoney = formatMoney;
app.locals.normalizeMoney = normalizeMoney;
app.locals.getImageUrl = getImageUrl;
app.locals.getCropPlaceholder = getCropPlaceholder;

// User session and template locals setup
app.use(setupLocals);

// ===========================
// HEALTH & DEBUG ROUTES
// ===========================
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "buyer-system",
    architecture: "modular-mvc",
    timestamp: new Date().toISOString()
  });
});

// ===========================
// MOUNT MODULAR ROUTERS
// ===========================
app.use(authRoutes);
app.use(productRoutes);
app.use(cartRoutes);
app.use(orderRoutes);
app.use(profileRoutes);
app.use(notificationRoutes);
app.use(adminRoutes);
app.use(rfqRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Attach utilities for backwards compatibility & unit tests
app.__utils = {
  normalizeMoney,
  formatMoney,
  getOrderTimeline,
  buildProductFilter,
  buildErrorQuery,
  parsePageValue,
  isAdmin,
  isLoggedIn
};

// ===========================
// SERVER INITIALIZATION
// ===========================
if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🌾 JD Mart server listening on port ${PORT}`);
        console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
        console.log(`🔐 OTP Login: http://localhost:${PORT}/otp-login`);
      });
    })
    .catch((err) => {
      console.error("Database connection failed on startup:", err);
      process.exit(1);
    });
}

module.exports = app;
