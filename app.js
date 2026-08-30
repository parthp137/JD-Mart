require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Users = require ("./models/user.js");
const Products = require ("./models/product.js");  
const Order = require("./models/order.js");
const Cart = require("./models/cart.js");
const Notification = require("./models/notification.js");
const getDashboardStats = require("./models/dashboardStat.js");
const ejsMate = require("ejs-mate");


const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const methodOverride = require("method-override");
const multer = require("multer");

const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const bcrypt = require("bcryptjs");


const MONGO_URL = process.env.MONGODB_URL || "mongodb://127.0.0.1:27017/jdmart1";

const DEBUG_MODE = process.env.DEBUG_MODE === "true" || process.env.NODE_ENV !== "production";
const DEFAULT_PAGE_SIZE = 12;

// ===========================
// MULTER CONFIGURATION FOR FILE UPLOADS
// ===========================
const uploadDir = path.join(__dirname, "public", "uploads");

// Create upload directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: productId-timestamp-randomstring.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, name + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});


app.engine("ejs", ejsMate); 
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));

app.use(session({
  secret: process.env.SESSION_SECRET || "supersecretkey-change-in-production",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URL
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

app.locals.formatMoney = formatMoney;
app.locals.normalizeMoney = normalizeMoney;

app.use(async (req, res, next) => {
  res.locals.user = null; // ALWAYS defined
  res.locals.cartCount = 0; // Cart count
  res.locals.notificationCount = 0; // Notification count
  res.locals.search = "";
  res.locals.category = "all";
  res.locals.page = 1;
  res.locals.totalPages = 1;
  res.locals.totalProducts = 0;
  res.locals.limit = DEFAULT_PAGE_SIZE;
  res.locals.getImageUrl = getImageUrl;
  res.locals.getCropPlaceholder = getCropPlaceholder;
  res.locals.formatMoney = formatMoney;

  if (req.session.userId) {
    try {
      req.user = await Users.findById(req.session.userId);
      res.locals.user = req.user;
      
      // Only proceed if user exists
      if (req.user) {
        // Get cart count
        const cart = await Cart.findOne({ user: req.user._id });
        if (cart) {
          res.locals.cartCount = cart.getTotalQuantity();
        }

        // Get unread notification count
        const unreadCount = await Notification.countDocuments({ 
          user: req.user._id, 
          read: false 
        });
        res.locals.notificationCount = unreadCount;
      }
    } catch (err) {
      console.error("User fetch error:", err);
    }
  }

  next();
});

function getImageUrl(image) {
  const fallbackImage = "/images/products/default-crop.svg";

  if (!image) {
    return fallbackImage;
  }

  // Handle new image structure: array of {filename, url, uploadedAt} objects
  if (Array.isArray(image)) {
    if (image.length === 0) {
      return fallbackImage;
    }
    
    // If first element is an object with 'url' property (new structure)
    if (typeof image[0] === 'object' && image[0].url) {
      return image[0].url;
    }
    
    // Otherwise treat as array of strings (old structure)
    return getImageUrl(image[0]);
  }

  const value = String(image).trim();

  if (!value) {
    return fallbackImage;
  }

  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) {
    return value;
  }

  let candidateUrl;

  if (value.startsWith("/")) {
    candidateUrl = value;
  } else if (value.startsWith("images/") || value.startsWith("uploads/")) {
    candidateUrl = `/${value}`;
  } else {
    candidateUrl = `/images/${value}`;
  }

  // If the URL maps to a local public asset, ensure the file exists.
  const localRelative = candidateUrl.replace(/^\/+/, "");
  const localPath = path.join(__dirname, "public", localRelative);

  if (fs.existsSync(localPath)) {
    return candidateUrl;
  }

  // Backward compatibility: if DB has .jpg but only .svg exists, use svg.
  if (/\.(jpg|jpeg|png)$/i.test(localRelative)) {
    const svgRelative = localRelative.replace(/\.(jpg|jpeg|png)$/i, ".svg");
    const svgPath = path.join(__dirname, "public", svgRelative);
    if (fs.existsSync(svgPath)) {
      return `/${svgRelative.replace(/\\/g, "/")}`;
    }

    const baseName = path.basename(localRelative).replace(/\.(jpg|jpeg|png)$/i, "");
    const productSvgRelative = `images/products/${baseName}.svg`;
    const productSvgPath = path.join(__dirname, "public", productSvgRelative);
    if (fs.existsSync(productSvgPath)) {
      return `/${productSvgRelative}`;
    }
  }

  // Also support bare names that already reference product SVG assets.
  const bareName = path.basename(localRelative);
  if (!localRelative.includes("/") && !localRelative.includes("\\")) {
    const productAssetRelative = `images/products/${bareName}`;
    const productAssetPath = path.join(__dirname, "public", productAssetRelative);
    if (fs.existsSync(productAssetPath)) {
      return `/${productAssetRelative}`;
    }
  }

  return fallbackImage;
}

function getCropPlaceholder(label = "Crop") {
  const safeLabel = String(label || "Crop").slice(0, 24).replace(/[<&>]/g, "");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f5132" />
          <stop offset="55%" stop-color="#16a34a" />
          <stop offset="100%" stop-color="#facc15" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" rx="36" fill="url(#g)" />
      <circle cx="650" cy="120" r="90" fill="rgba(255,255,255,0.16)" />
      <circle cx="130" cy="480" r="140" fill="rgba(255,255,255,0.10)" />
      <text x="50%" y="48%" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="52" font-weight="700">${safeLabel}</text>
      <text x="50%" y="57%" text-anchor="middle" fill="#eaffef" font-family="Arial, sans-serif" font-size="24">Image unavailable</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function normalizeMoney(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function formatMoney(value) {
  return `₹${(normalizeMoney(value) / 100).toFixed(2)}`;
}

function getOrderTimeline(status, existingTimeline = []) {
  const timeline = Array.isArray(existingTimeline) ? existingTimeline.filter(Boolean) : [];
  if (!timeline.some(entry => entry.status === "Placed")) {
    timeline.unshift({ status: "Placed", date: new Date() });
  }
  if (!timeline.some(entry => entry.status === "Confirmed")) {
    timeline.push({ status: "Confirmed", date: new Date() });
  }
  if (status && !timeline.some(entry => entry.status === status)) {
    timeline.push({ status, date: new Date() });
  }
  return timeline.map(entry => ({
    status: entry.status,
    date: entry.date || entry.timestamp || new Date()
  }));
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildProductFilter({ search = "", category = "", priceMin = "", priceMax = "", grade = "", availability = "" } = {}) {
  const filter = {};

  if (category && category !== "all") {
    filter.category = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  }

  if (search) {
    const safeSearch = new RegExp(escapeRegExp(search.trim()), "i");
    filter.$or = [
      { name: safeSearch },
      { description: safeSearch },
      { category: safeSearch }
    ];
  }

  // Price range filter (convert from ₹/kg to paise - 1 rupee = 100 paise)
  const priceFilters = {};
  if (priceMin && !isNaN(priceMin)) {
    priceFilters.$gte = Math.ceil(parseFloat(priceMin) * 100);
  }
  if (priceMax && !isNaN(priceMax)) {
    priceFilters.$lte = Math.floor(parseFloat(priceMax) * 100);
  }
  if (Object.keys(priceFilters).length > 0) {
    filter.pricePerQuintal = priceFilters;
  }

  // Grade filter
  if (grade && grade !== "") {
    filter.grade = grade.toUpperCase();
  }

  // Availability filter
  if (availability === "in-stock") {
    filter.$expr = { $gt: [{ $subtract: ["$available", { $ifNull: ["$reserved", 0] }] }, 0] };
  } else if (availability === "low-stock") {
    filter.$expr = { $and: [
      { $lte: [{ $subtract: ["$available", { $ifNull: ["$reserved", 0] }] }, 5] },
      { $gt: [{ $subtract: ["$available", { $ifNull: ["$reserved", 0] }] }, 0] }
    ]};
  }

  return filter;
}

function parsePageValue(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildErrorQuery(message) {
  return `?error=${encodeURIComponent(message)}`;
}

// Validation helpers
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !regex.test(email)) {
    return "Invalid email address";
  }
  return null;
}

function validatePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 10) {
    return "Phone must be at least 10 digits";
  }
  if (digits.length > 12) {
    return "Phone is too long";
  }
  return null;
}

function validatePasswordStrength(password) {
  if (!password || password.length < 6) {
    return "Password must be at least 6 characters";
  }
  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must contain uppercase letter and number";
  }
  return null;
}

function validateDeliveryAddress(address) {
  if (!address || address.trim().length < 10) {
    return "Delivery address must be at least 10 characters";
  }
  return null;
}

function validateQuantity(qty, maxAvailable) {
  const quantity = parseInt(qty);
  if (!Number.isFinite(quantity) || quantity < 1) {
    return "Quantity must be at least 1";
  }
  if (quantity > maxAvailable) {
    return `Only ${maxAvailable} units available`;
  }
  return null;
}

function isAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).render("error", { message: "Access denied" });
  }

  next();
}


if (require.main === module) {
  main()
    .then(() => {
      console.log("connected to db");
    })
    .catch((err) => {
      console.log(err);
    });
}

async function main(){
    await mongoose.connect(MONGO_URL);
}


function isLoggedIn(req, res, next) {
  if (!req.user) {
    return res.redirect("/login");
  }
  next();
}

// Rate limiting middleware
// Uncomment after running: npm install express-rate-limit
// const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // limit each IP to 5 requests per windowMs
//   message: "Too many login attempts, please try again after 15 minutes"
// });

// ===========================
// SIMPLE PRODUCT LISTING CACHE
// ===========================
const productCache = {
  data: null,
  timestamp: 0,
  TTL: 5 * 60 * 1000 // 5 minutes cache time

};

async function getProductsFromCache(filter, limit, skip) {
  const now = Date.now();
  
  // Return from cache if valid
  if (productCache.data && (now - productCache.timestamp) < productCache.TTL) {
    return productCache.data;
  }

  // Fetch from database and cache
  const products = await Products.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  productCache.data = products;
  productCache.timestamp = now;
  
  return products;
}

// Invalidate cache when products are modified
const invalidateProductCache = () => {
  productCache.data = null;
  productCache.timestamp = 0;
};

// Login form
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

// Login User
app.post("/login", /* loginLimiter, */ async (req, res) => {
  try {
    const rawLogin = (req.body.login || "").trim();
    const password = req.body.password || "";

    if (!rawLogin || !password) {
      return res.redirect(`/login${buildErrorQuery("Enter both email/phone and password.")}`);
    }

    const normalizedPhone = rawLogin.replace(/\D/g, "");
    const emailLookup = rawLogin.toLowerCase();

    const user = await Users.findOne({
      $or: [
        { email: emailLookup },
        { phone: rawLogin },
        ...(normalizedPhone && normalizedPhone !== rawLogin ? [{ phone: normalizedPhone }] : [])
      ]
    });

    if (!user) {
      console.log("No user found");
      return res.redirect(`/login${buildErrorQuery("No account found for those credentials.")}`);
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.redirect(`/login${buildErrorQuery("Incorrect password.")}`);
    }

    req.session.userId = user._id;

    req.session.save(() => {
      res.redirect("/products");
    });

  } catch (err) {
    console.log("LOGIN ERROR:", err);
    res.redirect(`/login${buildErrorQuery("Unable to sign in right now.")}`);
  }
});

// OTP Login Page (phone input)
app.get("/otp-login", (req, res) => {
  res.render("otp", {
    step: false,
    error: req.query.error,
    message: req.query.message
  }); // step=false means show phone input
});

// Send OTP (after submitting phone)
app.post("/send-otp", async (req, res) => {
  const phone = (req.body.phone || "").trim();
  const normalizedPhone = phone.replace(/\D/g, "");

  if (!phone) {
    return res.redirect(`/otp-login${buildErrorQuery("Enter a phone number.")}`);
  }

  console.log("OTP request received for phone:", phone);

  const user = await Users.findOne({
    $or: [
      { phone },
      ...(normalizedPhone && normalizedPhone !== phone ? [{ phone: normalizedPhone }] : [])
    ]
  });

  if (!user) {
    console.log("User not found for OTP login");
    return res.redirect(`/otp-login${buildErrorQuery("No account found for this phone number.")}`);
  }

  console.log("User found:", user.email);

  const otp = Math.floor(100000 + Math.random() * 900000);
  
  // Store OTP with expiry (5 minutes)
  req.session.otp = otp;
  req.session.otpPhone = user.phone;
  req.session.otpExpiry = Date.now() + (5 * 60 * 1000); // 5 minutes

  // DEBUG: Always show OTP in terminal
  if (DEBUG_MODE) {
    console.log("=================================");
    console.log("OTP FOR LOGIN:", otp);
    console.log("=================================");
  }

  // Pass step=true to show OTP verification
  res.render("otp", {
    step: true,
    phone: user.phone,
    message: DEBUG_MODE ? "OTP generated. Check terminal output." : "OTP sent to your registered phone."
  });
});

// Verify OTP
app.post("/verify-otp", async (req, res) => {
  const { otp } = req.body;

  // Check OTP expiry
  if (Date.now() > req.session.otpExpiry) {
    console.log("OTP EXPIRED");
    req.session.otp = null;
    req.session.otpPhone = null;
    req.session.otpExpiry = null;
    return res.redirect(`/otp-login${buildErrorQuery("OTP expired. Request a new code.")}`);
  }

  if (parseInt(otp) !== req.session.otp) {
    console.log("OTP INVALID");
    return res.redirect(`/otp-login${buildErrorQuery("Invalid OTP. Try again.")}`);
  }

  const user = await Users.findOne({ phone: req.session.otpPhone });

  if (!user) {
    return res.redirect("/otp-login");
  }

  req.session.userId = user._id;

  // Clear OTP session data
  req.session.otp = null;
  req.session.otpPhone = null;
  req.session.otpExpiry = null;

  req.session.save(() => {
    res.redirect("/products");
  });
});


// Register Form
app.get("/register", (req, res) => {
  res.render("register.ejs");
});

// Register User
app.post("/register", async (req, res) => {
  try {
    const fullName = (req.body.fullName || "").trim();
    const phone = (req.body.phone || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const business = (req.body.business || "").trim();
    const businessType = (req.body.businessType || "").trim();
    const password = req.body.password || "";
    const confirm = req.body.confirm || "";
    const defaultAddress = (req.body.defaultAddress || "").trim();

    if (!fullName || !phone || !email || !business || !businessType || !password || !confirm || !defaultAddress) {
      return res.redirect(`/register${buildErrorQuery("Please fill out every required field.")}`);
    }

    if (password !== confirm) {
      return res.redirect(`/register${buildErrorQuery("Passwords do not match.")}`);
    }

    const userExists = await Users.findOne({
      $or: [{ email }, { phone }]
    });

    if (userExists) {
      return res.redirect(`/register${buildErrorQuery("An account already exists with that email or phone.")}`);
    }

    const newUser = new Users({
      fullName,
      phone,
      email,
      business,
      businessType,
      password,
      defaultAddress
    });

    await newUser.save();

    req.session.userId = newUser._id;

    req.session.save(() => {
      res.redirect("/products");
    });

  } catch (err) {
    console.log(err);
    res.redirect(`/register${buildErrorQuery("Unable to create account right now.")}`);
  }
});

// Forget password - render form
app.get("/forgot-password", (req, res) => {
  res.render("forgot-password.ejs", {
    step: "request",
    message: req.query.message,
    error: req.query.error
  });
});

// Forget password - generate reset token
app.post("/forgot-password", async (req, res) => {
  try {
    const rawLogin = (req.body.login || "").trim();

    if (!rawLogin) {
      return res.redirect(`/forgot-password${buildErrorQuery("Enter your email or phone number.")}`);
    }

    const normalizedPhone = rawLogin.replace(/\D/g, "");
    const loginEmail = rawLogin.toLowerCase();

    const user = await Users.findOne({
      $or: [
        { email: loginEmail },
        { phone: rawLogin },
        ...(normalizedPhone && normalizedPhone !== rawLogin ? [{ phone: normalizedPhone }] : [])
      ]
    });

    if (!user) {
      return res.render("forgot-password.ejs", {
        step: "request",
        error: "No matching account was found.",
        message: null
      });
    }

    const token = crypto.randomBytes(24).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 1000 * 60 * 30;
    await user.save();

    if (DEBUG_MODE) {
      console.log(`Reset token for ${user.email}: ${token}`);
    }

    return res.redirect(`/reset-password/${token}`);
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.redirect(`/forgot-password${buildErrorQuery("Unable to start password reset right now.")}`);
  }
});

// Reset password - render form
app.get("/reset-password/:token", async (req, res) => {
  try {
    const user = await Users.findOne({
      resetToken: req.params.token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.redirect(`/forgot-password${buildErrorQuery("Reset link is invalid or expired.")}`);
    }

    res.render("forgot-password.ejs", {
      step: "reset",
      token: req.params.token,
      message: req.query.message,
      error: req.query.error
    });
  } catch (err) {
    console.error("Reset password page error:", err);
    res.redirect(`/forgot-password${buildErrorQuery("Unable to load reset page.")}`);
  }
});

// Reset password - update password
app.post("/reset-password/:token", async (req, res) => {
  try {
    const password = req.body.password || "";
    const confirm = req.body.confirm || "";

    if (!password || password.length < 6) {
      return res.redirect(`/reset-password/${req.params.token}${buildErrorQuery("Password must be at least 6 characters.")}`);
    }

    if (password !== confirm) {
      return res.redirect(`/reset-password/${req.params.token}${buildErrorQuery("Passwords do not match.")}`);
    }

    const user = await Users.findOne({
      resetToken: req.params.token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.redirect(`/forgot-password${buildErrorQuery("Reset link is invalid or expired.")}`);
    }

    user.password = password;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    return res.redirect(`/login${buildErrorQuery("Password updated. Please sign in.")}`);
  } catch (err) {
    console.error("Reset password error:", err);
    return res.redirect(`/forgot-password${buildErrorQuery("Unable to reset password right now.")}`);
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// Products Route (Index)
app.get("/", (req, res) => {
  // Redirect to login if not authenticated, else to products
  if (req.session.userId) {
    return res.redirect("/products");
  }
  res.redirect("/login");
});

// Backend health endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "buyer-system",
    timestamp: new Date().toISOString()
  });
});

app.get("/listings", (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  res.redirect(`/products${query ? `?${query}` : ""}`);
});

// Products Route
app.get("/products", isLoggedIn, async (req, res) => {
  try {
    const page = parsePageValue(req.query.page, 1);
    const limit = Math.min(parsePageValue(req.query.limit, DEFAULT_PAGE_SIZE), 48);
    const search = (req.query.search || "").trim();
    const category = (req.query.category || "").trim();
    const priceMin = req.query.priceMin || "";
    const priceMax = req.query.priceMax || "";
    const grade = req.query.grade || "";
    const availability = req.query.availability || "";

    const filter = buildProductFilter({ search, category, priceMin, priceMax, grade, availability });
    const totalProducts = await Products.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalProducts / limit));
    const currentPage = Math.min(page, totalPages);
    const skip = (currentPage - 1) * limit;

    const allProducts = await Products.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const dashboardStats = await getDashboardStats(); // fetch stats

    res.render("index.ejs", {
      allProducts,
      dashboardStats,
      search,
      category,
      priceMin,
      priceMax,
      grade,
      availability,
      page: currentPage,
      totalPages,
      totalProducts,
      limit
    });
  } catch (err) {
    console.log("Error fetching products or stats:", err);
    res.send("Something went wrong");
  }
});


// Orders Route with Pagination
app.get("/orders", isLoggedIn, async (req, res) => {
  try {
    const page = parsePageValue(req.query.page, 1);
    const limit = 10; // Orders per page
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments({ user: req.user._id });
    const totalPages = Math.max(1, Math.ceil(totalOrders / limit));
    const currentPage = Math.min(page, totalPages);

    const orders = await Order.find({ user: req.user._id })
      .populate("items.product")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const allOrders = await Order.find({ user: req.user._id });
    const stats = {
      total: allOrders.length,
      transit: allOrders.filter(o => o.status === "In Transit").length,
      delivered: allOrders.filter(o => o.status === "Delivered").length,
      pending: allOrders.filter(o => o.status === "Pending").length
    };

    res.render("orders", {
      orders,
      user: req.user,
      stats,
      page: currentPage,
      totalPages,
      totalOrders,
      limit
    });
  } catch (err) {
    console.error("Orders route error:", err);
    res.redirect("/products");
  }
});

// CREATE ORDER - Buy Now
app.post("/orders/buy-now/:id", isLoggedIn, async (req, res) => {
  try {
    const product = await Products.findById(req.params.id);
    const qty = parseInt(req.body.quantity);

    if (!product || qty < 1 || qty > product.available) {
      return res.redirect(`/products/${product._id}`);
    }

    // Store buy-now item in session for checkout
    req.session.buyNowItem = {
      productId: product._id,
      productName: product.name,
      quantity: qty,
      priceAtOrder: product.pricePerQuintal,
      price: product.pricePerQuintal,
      available: product.available,
      category: product.category,
      images: product.images
    };

    res.redirect("/checkout-buy-now");
  } catch (err) {
    console.error("BUY NOW ERROR:", err);
    res.redirect("/products");
  }
});

// Checkout for Buy Now
app.get("/checkout-buy-now", isLoggedIn, async (req, res) => {
  try {
    if (!req.session.buyNowItem) {
      return res.redirect("/products");
    }

    const user = await Users.findById(req.user._id);
    const item = req.session.buyNowItem;
    const totalAmount = item.quantity * item.price;

    res.render("checkout-buy-now", {
      item,
      user,
      totalAmount
    });
  } catch (err) {
    console.error("Checkout buy now error:", err);
    res.redirect("/products");
  }
});

// Place order from Buy Now
app.post("/orders/buy-now-place", isLoggedIn, async (req, res) => {
  try {
    if (!req.session.buyNowItem) {
      return res.redirect("/products");
    }

    const { deliveryAddress } = req.body;
    const item = req.session.buyNowItem;
    const product = await Products.findById(item.productId);

    // Use actual available (available - reserved)
    const actualAvailable = product.getActualAvailable();
    if (!product || item.quantity > actualAvailable) {
      return res.redirect("checkout-buy-now");
    }

    const totalAmount = item.quantity * item.price;

    const order = new Order({
      user: req.user._id,
      items: [
        {
          product: product._id,
          quantity: item.quantity,
          priceAtOrder: item.price
        }
      ],
      totalAmount: totalAmount,
      status: "Pending",
      deliveryAddress: deliveryAddress || req.user.defaultAddress || "Please update your delivery address",
      expectedDelivery: new Date(Date.now() + 7 * 86400000),
      timeline: getOrderTimeline("Confirmed")
    });

    // Atomically reduce stock
    await Products.updateOne(
      { _id: product._id },
      {
        $inc: { available: -item.quantity },
        $set: { reserved: 0 }  // Clear any reserved stock for this product
      }
    );

    await order.save();

    // Create notification
    const notification = new Notification({
      user: req.user._id,
      title: "Order Placed Successfully",
      message: `Your order #${order._id.toString().slice(-6).toUpperCase()} for ${item.productName} has been placed for ₹${(totalAmount / 100).toFixed(2)}`,
      type: "order",
      relatedOrder: order._id,
      icon: "fa-check-circle"
    });
    await notification.save();

    // Clear session
    delete req.session.buyNowItem;

    res.redirect("/orders");
  } catch (err) {
    console.error("Buy now place error:", err);
    res.redirect("/checkout-buy-now");
  }
});


//Profile Route
app.get("/profile", isLoggedIn, async (req, res) => {
  const user = await Users.findById(req.session.userId);
  res.render("profile", { user });
});

app.get("/profile/edit", isLoggedIn, async (req, res) => {
  const user = await Users.findById(req.session.userId);
  res.render("profile-edit", {
    user,
    error: req.query.error,
    message: req.query.message
  });
});

app.post("/profile/edit", isLoggedIn, async (req, res) => {
  try {
    const fullName = (req.body.fullName || "").trim();
    const phone = (req.body.phone || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const business = (req.body.business || "").trim();
    const businessType = (req.body.businessType || "").trim();
    const defaultAddress = (req.body.defaultAddress || "").trim();
    const password = req.body.password || "";

    if (!fullName || !phone || !email || !business || !businessType || !defaultAddress) {
      return res.redirect(`/profile/edit${buildErrorQuery("Please complete all required fields.")}`);
    }

    const user = await Users.findById(req.session.userId);
    if (!user) {
      return res.redirect(`/login${buildErrorQuery("Session expired. Please sign in again.")}`);
    }

    const duplicate = await Users.findOne({
      _id: { $ne: user._id },
      $or: [{ email }, { phone }]
    });

    if (duplicate) {
      return res.redirect(`/profile/edit${buildErrorQuery("Email or phone is already in use.")}`);
    }

    user.fullName = fullName;
    user.phone = phone;
    user.email = email;
    user.business = business;
    user.businessType = businessType;
    user.defaultAddress = defaultAddress;

    if (password) {
      if (password.length < 6) {
        return res.redirect(`/profile/edit${buildErrorQuery("Password must be at least 6 characters.")}`);
      }

      user.password = password;
    }

    await user.save();
    req.session.userId = user._id;
    return res.redirect(`/profile/edit${buildErrorQuery("Profile updated successfully.")}`);
  } catch (err) {
    console.error("Profile edit error:", err);
    return res.redirect(`/profile/edit${buildErrorQuery("Unable to update profile right now.")}`);
  }
});

// Add new address
app.post("/profile/address/add", isLoggedIn, async (req, res) => {
  try {
    const { label, address } = req.body;

    if (!label || !address) {
      return res.redirect(`/profile/edit${buildErrorQuery("Please provide label and address.")}`);
    }

    const user = await Users.findById(req.session.userId);
    if (!user) {
      return res.redirect(`/login${buildErrorQuery("Session expired.")}`);
    }

    user.addresses = user.addresses || [];
    user.addresses.push({ label, address, isDefault: user.addresses.length === 0 });

    if (user.addresses.length === 1) {
      user.defaultAddress = address;
    }

    await user.save();
    return res.redirect(`/profile/edit${buildErrorQuery("Address added successfully.")}`);
  } catch (err) {
    console.error("Add address error:", err);
    return res.redirect(`/profile/edit${buildErrorQuery("Unable to add address.")}`);
  }
});

// Set default address
app.post("/profile/address/set-default/:addressId", isLoggedIn, async (req, res) => {
  try {
    const user = await Users.findById(req.session.userId);
    if (!user) {
      return res.redirect(`/login${buildErrorQuery("Session expired.")}`);
    }

    // Reset all isDefault flags
    user.addresses.forEach(addr => addr.isDefault = false);

    // Find and set the selected address as default
    const address = user.addresses.id(req.params.addressId);
    if (address) {
      address.isDefault = true;
      user.defaultAddress = address.address;
    }

    await user.save();
    return res.redirect(`/profile/edit${buildErrorQuery("Default address updated.")}`);
  } catch (err) {
    console.error("Set default address error:", err);
    return res.redirect(`/profile/edit${buildErrorQuery("Unable to update default address.")}`);
  }
});

// Remove address
app.post("/profile/address/remove/:addressId", isLoggedIn, async (req, res) => {
  try {
    const user = await Users.findById(req.session.userId);
    if (!user) {
      return res.redirect(`/login${buildErrorQuery("Session expired.")}`);
    }

    const address = user.addresses.id(req.params.addressId);
    if (address) {
      address.deleteOne();

      // If deleted address was default, set new default
      if (address.isDefault && user.addresses.length > 0) {
        user.addresses[0].isDefault = true;
        user.defaultAddress = user.addresses[0].address;
      }
    }

    await user.save();
    return res.redirect(`/profile/edit${buildErrorQuery("Address removed.")}`);
  } catch (err) {
    console.error("Remove address error:", err);
    return res.redirect(`/profile/edit${buildErrorQuery("Unable to remove address.")}`);
  }
});

// Cart route
app.get("/cart", isLoggedIn, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate("items.product");
    
    const totalAmount = cart ? cart.getTotalAmount() : 0;
    
    res.render("cart", { 
      cart, 
      user: req.user,
      totalAmount
    });
  } catch (err) {
    console.error("Cart fetch error:", err);
    res.redirect("/products");
  }
});

// Add to cart
app.post("/cart/add/:id", isLoggedIn, async (req, res) => {
  try {
    const product = await Products.findById(req.params.id);
    const quantity = parseInt(req.body.quantity) || 1;

    if (!product) {
      return res.redirect(`/products${buildErrorQuery("Product not found.")}`);
    }

    if (quantity < 1) {
      return res.redirect(`/products/${product._id}${buildErrorQuery("Quantity must be at least 1.")}`);
    }

    // Check actual available (available - reserved)
    const actualAvailable = product.getActualAvailable();
    if (quantity > actualAvailable) {
      return res.redirect(`/products/${product._id}${buildErrorQuery(`Only ${actualAvailable} units available.`)}`);
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: req.user._id });
    let previousQuantity = 0;
    
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    // Check if product already in cart
    const existingItem = cart.items.find(
      item => item.product.toString() === product._id.toString()
    );

    if (existingItem) {
      previousQuantity = existingItem.quantity;
      // Calculate new quantity
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > actualAvailable) {
        return res.redirect(`/products/${product._id}${buildErrorQuery(`Only ${actualAvailable} units available in total.`)}`);
      }
      existingItem.quantity = newQuantity;
    } else {
      // Add new item
      cart.items.push({
        product: product._id,
        quantity: quantity,
        priceAtAdd: product.pricePerQuintal
      });
    }

    // Reserve stock in product
    const quantityDifference = (existingItem ? existingItem.quantity : quantity) - previousQuantity;
    if (quantityDifference > 0) {
      await product.reserve(quantityDifference);
    }

    await cart.save();
    res.redirect("/cart");
  } catch (err) {
    console.error("Add to cart error:", err);
    res.redirect(`/products${buildErrorQuery("Unable to add item to cart.")}`);
  }
});

// Update cart item quantity
app.post("/cart/update/:productId", isLoggedIn, async (req, res) => {
  try {
    const { quantity } = req.body;
    const qty = parseInt(quantity);

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.redirect("/cart");
    }

    const item = cart.items.find(
      item => item.product.toString() === req.params.productId
    );

    if (item) {
      const product = await Products.findById(item.product);
      const actualAvailable = product.getActualAvailable();
      const oldQuantity = item.quantity;

      if (qty < 1) {
        // Remove item if quantity is 0 or less
        cart.items = cart.items.filter(
          i => i.product.toString() !== req.params.productId
        );
        // Release reserved stock
        await product.releaseReserve(oldQuantity);
      } else if (qty > actualAvailable) {
        // Cap at actual available
        item.quantity = actualAvailable;
        // Adjust reservation if quantity was reduced
        if (item.quantity < oldQuantity) {
          await product.releaseReserve(oldQuantity - item.quantity);
        } else if (item.quantity > oldQuantity) {
          await product.reserve(item.quantity - oldQuantity);
        }
      } else {
        // Adjust reservation based on quantity change
        const difference = qty - oldQuantity;
        if (difference > 0) {
          await product.reserve(difference);
        } else if (difference < 0) {
          await product.releaseReserve(-difference);
        }
        item.quantity = qty;
      }
    }

    await cart.save();
    res.redirect("/cart");
  } catch (err) {
    console.error("Update cart error:", err);
    res.redirect(`/cart${buildErrorQuery("Unable to update cart item.")}`);
  }
});

// Remove item from cart
app.post("/cart/remove/:productId", isLoggedIn, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.redirect("/cart");
    }

    // Find the item being removed to get quantity
    const removedItem = cart.items.find(
      item => item.product.toString() === req.params.productId
    );

    // Release reserved stock
    if (removedItem) {
      const product = await Products.findById(req.params.productId);
      if (product) {
        await product.releaseReserve(removedItem.quantity);
      }
    }

    cart.items = cart.items.filter(
      item => item.product.toString() !== req.params.productId
    );

    await cart.save();
    res.redirect("/cart");
  } catch (err) {
    console.error("Remove from cart error:", err);
    res.redirect(`/cart${buildErrorQuery("Unable to remove item from cart.")}`);
  }
});

// Clear cart
app.post("/cart/clear", isLoggedIn, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      // Release all reserved stock
      for (const item of cart.items) {
        const product = await Products.findById(item.product);
        if (product) {
          await product.releaseReserve(item.quantity);
        }
      }
    }
    await Cart.findOneAndDelete({ user: req.user._id });
    res.redirect("/cart");
  } catch (err) {
    console.error("Clear cart error:", err);
    res.redirect("/cart");
  }
});

// Show checkout confirmation page
app.get("/checkout", isLoggedIn, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.redirect(`/cart${buildErrorQuery("Your cart is empty.")}`);
    }

    // Validate stock for all items using actual available
    for (const item of cart.items) {
      const actualAvailable = item.product.getActualAvailable();
      if (item.quantity > actualAvailable) {
        return res.redirect(`/cart${buildErrorQuery(`${item.product.name}: Only ${actualAvailable} units available.`)}`);
      }
    }

    const totalAmount = cart.getTotalAmount();

    // Get user with addresses
    const user = await Users.findById(req.user._id);

    res.render("checkout", {
      cart,
      user,
      totalAmount,
      error: req.query.error,
      message: req.query.message
    });
  } catch (err) {
    console.error("Checkout page error:", err);
    res.redirect("/cart");
  }
});

// Place order from checkout
app.post("/orders/place", isLoggedIn, async (req, res) => {
  try {
    const { deliveryAddress } = req.body;

    const cart = await Cart.findOne({ user: req.user._id })
      .populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.redirect(`/cart${buildErrorQuery("Your cart is empty.")}`);
    }

    // Validate stock for all items using actual available (available - reserved)
    for (const item of cart.items) {
      const actualAvailable = item.product.getActualAvailable();
      if (item.quantity > actualAvailable) {
        return res.redirect(`/checkout${buildErrorQuery(`${item.product.name}: Only ${actualAvailable} units available.`)}`);
      }
    }

    // Calculate total
    const totalAmount = cart.getTotalAmount();

    // Create order
    const order = new Order({
      user: req.user._id,
      items: cart.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        priceAtOrder: item.priceAtAdd
      })),
      totalAmount: totalAmount,
      status: "Pending",
      deliveryAddress: deliveryAddress || req.user.defaultAddress || "Please update your delivery address",
      expectedDelivery: new Date(Date.now() + 7 * 86400000), // 7 days
      timeline: getOrderTimeline("Confirmed")
    });

    // Atomically reduce stock and clear reservations for each product
    for (const item of cart.items) {
      const product = item.product;
      // Reduce available and clear reservation in atomic operation
      await Products.updateOne(
        { _id: product._id },
        {
          $inc: { available: -item.quantity },
          $set: { reserved: Math.max(0, (product.reserved || 0) - item.quantity) }
        }
      );
    }

    await order.save();

    // Create notification for order placed
    const notification = new Notification({
      user: req.user._id,
      title: "Order Placed Successfully",
      message: `Your order #${order._id.toString().slice(-6).toUpperCase()} has been placed for ₹${(totalAmount / 100).toFixed(2)}`,
      type: "order",
      relatedOrder: order._id,
      icon: "fa-check-circle"
    });
    await notification.save();

    // Clear cart
    await Cart.findOneAndDelete({ user: req.user._id });

    res.redirect("/orders");
  } catch (err) {
    console.error("Place order error:", err);
    res.redirect(`/checkout${buildErrorQuery("Unable to place order right now.")}`);
  }
});

// Show route - with authentication
app.get("/products/:id", isLoggedIn, async(req,res)=>{
    let {id} = req.params;
    try {
      const product = await Products.findById(id);
      if (!product) {
        return res.redirect("/products");
      }
      res.render("show.ejs",{product, error: req.query.error, message: req.query.message});
    } catch (err) {
      console.error("Product fetch error:", err);
      res.redirect("/products");
    }
});

// Notifications routes
app.get("/notifications", isLoggedIn, async (req, res) => {
  try {
    if (!req.user) {
      console.log("No user in session, redirecting to login");
      return res.redirect("/login");
    }

    const page = parsePageValue(req.query.page, 1);
    const limit = 15; // Notifications per page

    const filter = { user: req.user._id };
    const readFilter = req.query.filter || "all"; // all, read, unread

    if (readFilter === "read") {
      filter.read = true;
    } else if (readFilter === "unread") {
      filter.read = false;
    }

    const totalNotifications = await Notification.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalNotifications / limit));
    const currentPage = Math.min(page, totalPages);
    const skip = (currentPage - 1) * limit;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
    const readCount = await Notification.countDocuments({ user: req.user._id, read: true });
    
    res.render("notifications", {
      notifications,
      user: req.user,
      readFilter,
      unreadCount,
      readCount,
      totalNotifications: unreadCount + readCount,
      page: currentPage,
      totalPages
    });
  } catch (err) {
    console.error("Notifications fetch error:", err);
    res.status(500).render("error", { message: "Error loading notifications" });
  }
});

app.post("/orders/:id/status", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["Pending", "Processing", "In Transit", "Delivered"];

    if (!allowedStatuses.includes(status)) {
      return res.redirect(`/orders${buildErrorQuery("Invalid order status.")}`);
    }

    const order = await Order.findById(req.params.id).populate("user");

    if (!order) {
      return res.redirect(`/orders${buildErrorQuery("Order not found.")}`);
    }

    order.status = status;
    order.timeline = getOrderTimeline(status, order.timeline);
    await order.save();

    await Notification.create({
      user: order.user._id,
      title: `Order status updated to ${status}`,
      message: `Your order ${order.orderId} is now ${status}.`,
      type: "order",
      relatedOrder: order._id,
      icon: status === "Delivered" ? "fa-check-circle" : "fa-box"
    });

    return res.redirect(`/orders${buildErrorQuery("Order status updated.")}`);
  } catch (err) {
    console.error("Update order status error:", err);
    return res.redirect(`/orders${buildErrorQuery("Unable to update order status.")}`);
  }
});

// Mark all notifications as read (BEFORE specific routes)
app.post("/notifications/mark-all-read", isLoggedIn, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true }
    );
    res.redirect("/notifications");
  } catch (err) {
    console.error("Mark all read error:", err);
    res.redirect("/notifications");
  }
});

// Mark notification as read
app.post("/notifications/:id/mark-read", isLoggedIn, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.redirect("/notifications");
  } catch (err) {
    console.error("Mark read error:", err);
    res.redirect("/notifications");
  }
});

// Delete notification
app.post("/notifications/:id/delete", isLoggedIn, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.redirect("/notifications");
  } catch (err) {
    console.error("Delete notification error:", err);
    res.redirect("/notifications");
  }
});

// Bulk delete notifications
app.post("/notifications/bulk/delete", isLoggedIn, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.redirect("/notifications?error=No+notifications+selected");
    }

    // Delete only notifications belonging to the current user (security)
    await Notification.deleteMany({
      _id: { $in: notificationIds },
      user: req.user._id
    });

    res.redirect("/notifications?message=Notifications+deleted");
  } catch (err) {
    console.error("Bulk delete notifications error:", err);
    res.redirect("/notifications?error=Error+deleting+notifications");
  }
});

// ============================
// ADMIN DASHBOARD ROUTES
// ============================

// Admin Dashboard Home
app.get("/admin", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const totalProducts = await Products.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalUsers = await Users.countDocuments();
    
    // Count low stock products
    const lowStockProducts = await Products.countDocuments({
      $expr: { $lte: ["$available", 5] }
    });

    res.render("admin-dashboard", {
      section: "dashboard",
      stats: {
        totalProducts,
        totalOrders,
        totalUsers,
        lowStockProducts
      },
      user: req.user
    });
  } catch (err) {
    console.error("Admin dashboard error:", err);
    res.redirect("/");
  }
});

// Admin Products List
app.get("/admin/products", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const products = await Products.find().sort({ createdAt: -1 });

    res.render("admin-dashboard", {
      section: "products",
      products,
      user: req.user,
      error: req.query.error,
      message: req.query.message,
      getImageUrl,
      getCropPlaceholder
    });
  } catch (err) {
    console.error("Admin products error:", err);
    res.redirect(`/admin${buildErrorQuery("Unable to fetch products")}`);
  }
});

// Create Product Form
app.get("/admin/products/create", isLoggedIn, isAdmin, (req, res) => {
  res.render("admin-product-form", {
    isEdit: false,
    product: {},
    error: req.query.error
  });
});

// Create Product Submit
app.post("/admin/products/create", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const {
      name,
      category,
      grade,
      description,
      pricePerQuintal,
      oldPrice,
      belowMarketPercent,
      available,
      demandLevel,
      deliveryTimeMin,
      deliveryTimeMax
    } = req.body;

    // Validation
    if (!name || !category || !pricePerQuintal || !available) {
      return res.redirect(`/admin/products/create${buildErrorQuery("Missing required fields")}`);
    }

    const product = new Products({
      name,
      category,
      grade: grade || "A",
      description,
      pricePerQuintal: parseInt(pricePerQuintal),
      oldPrice: parseInt(oldPrice) || 0,
      belowMarketPercent: parseFloat(belowMarketPercent) || 0,
      available: parseInt(available),
      demandLevel: demandLevel || "Medium",
      deliveryTime: {
        minDays: parseInt(deliveryTimeMin) || 1,
        maxDays: parseInt(deliveryTimeMax) || 7
      },
      images: [] // Start with empty images array; can be added via upload route
    });

    await product.save();
    invalidateProductCache(); // Invalidate cache after creating product
    res.redirect(`/admin/products?message=${encodeURIComponent("Product created successfully")}`);
  } catch (err) {
    console.error("Create product error:", err);
    res.redirect(`/admin/products/create${buildErrorQuery("Unable to create product")}`);
  }
});

// Edit Product Form
app.get("/admin/products/:id/edit", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const product = await Products.findById(req.params.id);
    if (!product) {
      return res.redirect(`/admin/products${buildErrorQuery("Product not found")}`);
    }

    res.render("admin-product-form", {
      isEdit: true,
      product,
      error: req.query.error
    });
  } catch (err) {
    console.error("Edit product form error:", err);
    res.redirect(`/admin/products${buildErrorQuery("Unable to load product")}`);
  }
});

// Update Product Submit
app.post("/admin/products/:id/update", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const {
      name,
      category,
      grade,
      description,
      pricePerQuintal,
      oldPrice,
      belowMarketPercent,
      available,
      demandLevel,
      deliveryTimeMin,
      deliveryTimeMax
    } = req.body;

    // Validation
    if (!name || !category || !pricePerQuintal) {
      return res.redirect(`/admin/products/${req.params.id}/edit${buildErrorQuery("Missing required fields")}`);
    }

    const product = await Products.findByIdAndUpdate(
      req.params.id,
      {
        name,
        category,
        grade: grade || "A",
        description,
        pricePerQuintal: parseInt(pricePerQuintal),
        oldPrice: parseInt(oldPrice) || 0,
        belowMarketPercent: parseFloat(belowMarketPercent) || 0,
        available: parseInt(available),
        demandLevel: demandLevel || "Medium",
        deliveryTime: {
          minDays: parseInt(deliveryTimeMin) || 1,
          maxDays: parseInt(deliveryTimeMax) || 7
        }
      },
      { new: true }
    );

    invalidateProductCache(); // Invalidate cache after updating product
    res.redirect(`/admin/products?message=${encodeURIComponent("Product updated successfully")}`);
  } catch (err) {
    console.error("Update product error:", err);
    res.redirect(`/admin/products/${req.params.id}/edit${buildErrorQuery("Unable to update product")}`);
  }
});

// Delete Product
app.post("/admin/products/:id/delete", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const product = await Products.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.redirect(`/admin/products${buildErrorQuery("Product not found")}`);
    }

    invalidateProductCache(); // Invalidate cache after deleting product
    res.redirect(`/admin/products?message=${encodeURIComponent("Product deleted successfully")}`);
  } catch (err) {
    console.error("Delete product error:", err);
    res.redirect(`/admin/products${buildErrorQuery("Unable to delete product")}`);
  }
});

// ===========================
// PRODUCT MEDIA UPLOAD ROUTES
// ===========================

// Upload product image
app.post("/admin/products/:id/upload-image", isLoggedIn, isAdmin, upload.single("productImage"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const product = await Products.findById(req.params.id);
    if (!product) {
      // Clean up uploaded file if product not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Product not found" });
    }

    // Add image to product's images array
    const imageEntry = {
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
      uploadedAt: new Date()
    };

    product.images.push(imageEntry);
    await product.save();
    invalidateProductCache();

    res.json({
      success: true,
      message: "Image uploaded successfully",
      image: imageEntry
    });
  } catch (err) {
    // Clean up file if error occurs
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error("File cleanup error:", e);
      }
    }
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// Delete product image
app.post("/admin/products/:id/delete-image/:imageIndex", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const product = await Products.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const imageIndex = parseInt(req.params.imageIndex);
    if (isNaN(imageIndex) || imageIndex < 0 || imageIndex >= product.images.length) {
      return res.status(400).json({ error: "Invalid image index" });
    }

    const image = product.images[imageIndex];
    
    // Delete file from filesystem
    const filePath = path.join(uploadDir, image.filename);
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.warn(`Could not delete file ${filePath}:`, e.message);
    }

    // Remove from array
    product.images.splice(imageIndex, 1);
    await product.save();
    invalidateProductCache();

    res.json({
      success: true,
      message: "Image deleted successfully"
    });
  } catch (err) {
    console.error("Delete image error:", err);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// Get product images
app.get("/admin/products/:id/images", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const product = await Products.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({
      success: true,
      images: product.images || []
    });
  } catch (err) {
    console.error("Get images error:", err);
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

// Admin Orders View with Pagination
app.get("/admin/orders", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const page = parsePageValue(req.query.page, 1);
    const limit = 20; // Orders per page
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments();
    const totalPages = Math.max(1, Math.ceil(totalOrders / limit));
    const currentPage = Math.min(page, totalPages);

    const orders = await Order.find()
      .populate("user")
      .populate("items.product")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render("admin-dashboard", {
      section: "orders",
      orders,
      user: req.user,
      page: currentPage,
      totalPages,
      totalOrders
    });
  } catch (err) {
    console.error("Admin orders error:", err);
    res.redirect("/admin");
  }
});

// Admin Users View
app.get("/admin/users", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const users = await Users.find().sort({ createdAt: -1 });

    res.render("admin-dashboard", {
      section: "users",
      users,
      user: req.user
    });
  } catch (err) {
    console.error("Admin users error:", err);
    res.redirect("/admin");
  }
});

// Admin Notifications View
app.get("/admin/notifications", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate("user")
      .sort({ createdAt: -1 })
      .limit(100);

    res.render("admin-dashboard", {
      section: "notifications",
      notifications,
      user: req.user
    });
  } catch (err) {
    console.error("Admin notifications error:", err);
    res.redirect("/admin");
  }
});

if (require.main === module) {
  app.listen(8080, () => {
    console.log("server is listening to port 8080");
    console.log("OTP Debug: Go to /otp-login to test");
    console.log("User Check: Go to /debug-users to see registered users");
  });
}

// Debug route - list all users
app.get("/debug-users", async (req, res) => {
  try {
    if (!DEBUG_MODE) {
      return res.status(404).send("Not found");
    }

    const users = await Users.find({}, { password: 0 });
    res.json({ count: users.length, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debug password verification
app.get("/debug-password", async (req, res) => {
  try {
    if (!DEBUG_MODE) {
      return res.status(404).send("Not found");
    }

    const user = await Users.findOne({ email: "demo@jdmart.com" });
    if (!user) {
      return res.json({ error: "Demo user not found" });
    }

    const testPassword = "demo123";
    const isMatch = await user.comparePassword(testPassword);
    
    res.json({
      email: user.email,
      passwordHash: user.password.substring(0, 20) + "...",
      testPassword,
      isMatch,
      message: isMatch ? "✅ Password matches!" : "❌ Password does NOT match"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
app.__utils = {
  normalizeMoney,
  formatMoney,
  getOrderTimeline,
  buildProductFilter,
  buildErrorQuery,
  parsePageValue,
  isAdmin
};

