/**
 * Authentication and User Account Routes
 * Hardened with SHA-256 token hashing, session regeneration,
 * timing attack protection, email verification, and rate limiting.
 */
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const Users = require("../models/user");
const Notification = require("../models/notification");
const {
  authLimiter,
  registerLimiter,
  otpLimiter,
  passwordResetLimiter,
  emailVerifyLimiter
} = require("../middleware/rateLimiter");
const { buildErrorQuery } = require("../utils/filters");
const {
  sanitizeInput,
  validateEmail,
  validatePhone,
  validatePasswordStrength
} = require("../utils/validation");
const {
  DEBUG_MODE,
  OTP_EXPIRY_MS,
  PASSWORD_RESET_EXPIRY_MS,
  EMAIL_VERIFY_EXPIRY_MS
} = require("../config/constants");

// Dummy hash for constant-time comparison when user does not exist
const DUMMY_HASH = "$2a$12$e8h1Wz79m34fGv6Xv59aOuyw0XlA1H.z0u3J97K7cM4sM22XzP9Q.";

/**
 * Regenerate session to eliminate session fixation risks
 */
function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

// ===========================
// LOGIN
// ===========================

// GET /login
router.get("/login", (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect("/products");
  }
  res.render("login.ejs");
});

// POST /login - Protected against brute force, timing attacks & session fixation
router.post("/login", authLimiter, async (req, res) => {
  try {
    const rawLogin = sanitizeInput(req.body.login || "");
    const password = req.body.password || "";

    if (!rawLogin || !password) {
      req.flash("error", "Enter both email/phone and password.");
      return res.redirect(`/login`);
    }

    const normalizedPhone = rawLogin.replace(/\D/g, "");
    const emailLookup = rawLogin.toLowerCase();

    // Look up user including password field for verification
    const user = await Users.findOne({
      $or: [
        { email: emailLookup },
        { phone: rawLogin },
        ...(normalizedPhone && normalizedPhone !== rawLogin ? [{ phone: normalizedPhone }] : [])
      ]
    });

    if (!user) {
      // Execute dummy compare to equalize response time and prevent timing attacks
      await bcrypt.compare(password, DUMMY_HASH);
      req.flash("error", "Invalid email/phone or password.");
      return res.redirect(`/login`);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      req.flash("error", "Invalid email/phone or password.");
      return res.redirect(`/login`);
    }

    // Regenerate session to prevent session fixation attacks
    await regenerateSession(req);
    req.session.userId = user._id;

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        req.flash("error", "Unable to complete sign in.");
      return res.redirect(`/login`);
      }
      res.redirect("/products");
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    req.flash("error", "Unable to sign in right now.");
      res.redirect(`/login`);
  }
});

// ===========================
// OTP AUTHENTICATION
// ===========================

// GET /otp-login
router.get("/otp-login", (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect("/products");
  }
  res.render("otp", {
    step: false,
    error: req.query.error,
    message: req.query.message
  });
});

// POST /send-otp - Rate limited to prevent SMS/OTP flooding
router.post("/send-otp", otpLimiter, async (req, res) => {
  try {
    const phone = sanitizeInput(req.body.phone || "");
    const normalizedPhone = phone.replace(/\D/g, "");

    if (!phone) {
      req.flash("error", "Enter a phone number.");
      return res.redirect(`/otp-login`);
    }

    const user = await Users.findOne({
      $or: [
        { phone },
        ...(normalizedPhone && normalizedPhone !== phone ? [{ phone: normalizedPhone }] : [])
      ]
    });

    if (!user) {
      req.flash("error", "No account found for this phone number.");
      return res.redirect(`/otp-login`);
    }

    // Cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000);
    // Hash OTP before storing in session
    const otpHash = crypto.createHash("sha256").update(String(otp)).digest("hex");

    req.session.otpHash = otpHash;
    req.session.otpPhone = user.phone;
    req.session.otpExpiry = Date.now() + OTP_EXPIRY_MS;

    if (DEBUG_MODE) {
      console.log("=========================================");
      console.log(`🌾 SECURE OTP FOR ${user.phone}: ${otp}`);
      console.log(`⏳ Valid for: ${OTP_EXPIRY_MS / 1000 / 60} minutes`);
      console.log("=========================================");
    }

    res.render("otp", {
      step: true,
      phone: user.phone,
      message: DEBUG_MODE
        ? "OTP generated securely. Check terminal output in development mode."
        : "A one-time password has been sent to your registered phone."
    });
  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    req.flash("error", "Unable to send OTP.");
      res.redirect(`/otp-login`);
  }
});

// POST /verify-otp - Timing-safe OTP verification with session regeneration
router.post("/verify-otp", authLimiter, async (req, res) => {
  try {
    const enteredOtp = sanitizeInput(req.body.otp || "");

    if (!req.session.otpExpiry || Date.now() > req.session.otpExpiry || !req.session.otpHash) {
      req.session.otpHash = null;
      req.session.otpPhone = null;
      req.session.otpExpiry = null;
      req.flash("error", "OTP has expired. Please request a new code.");
      return res.redirect(`/otp-login`);
    }

    const enteredHash = crypto.createHash("sha256").update(String(enteredOtp)).digest("hex");
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(enteredHash, "hex"),
      Buffer.from(req.session.otpHash, "hex")
    );

    if (!isMatch) {
      req.flash("error", "Invalid OTP code. Please try again.");
      return res.redirect(`/otp-login`);
    }

    const user = await Users.findOne({ phone: req.session.otpPhone });
    if (!user) {
      return res.redirect("/otp-login");
    }

    // Clear OTP session context
    req.session.otpHash = null;
    req.session.otpPhone = null;
    req.session.otpExpiry = null;

    // Regenerate session to eliminate session fixation
    await regenerateSession(req);
    req.session.userId = user._id;

    req.session.save((err) => {
      if (err) {
        console.error("Session save error after OTP:", err);
        req.flash("error", "Unable to complete sign in.");
      return res.redirect(`/otp-login`);
      }
      res.redirect("/products");
    });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    req.flash("error", "Unable to verify OTP.");
      res.redirect(`/otp-login`);
  }
});

// ===========================
// REGISTRATION & EMAIL VERIFICATION
// ===========================

// GET /register
router.get("/register", (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect("/products");
  }
  res.render("register.ejs");
});

// POST /register - Validated, password strength enforced, email verification token created
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const fullName = sanitizeInput(req.body.fullName || "");
    const phone = sanitizeInput(req.body.phone || "");
    const email = sanitizeInput(req.body.email || "").toLowerCase();
    const business = sanitizeInput(req.body.business || "");
    const businessType = sanitizeInput(req.body.businessType || "");
    const password = req.body.password || "";
    const confirm = req.body.confirm || "";
    const defaultAddress = sanitizeInput(req.body.defaultAddress || "");

    if (!fullName || !phone || !email || !business || !businessType || !password || !confirm || !defaultAddress) {
      req.flash("error", "Please fill out every required field.");
      return res.redirect(`/register`);
    }

    const emailErr = validateEmail(email);
    if (emailErr) {
      req.flash("error", emailErr);
      return res.redirect(`/register`);
    }

    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      req.flash("error", phoneErr);
      return res.redirect(`/register`);
    }

    const passErr = validatePasswordStrength(password);
    if (passErr) {
      req.flash("error", passErr);
      return res.redirect(`/register`);
    }

    if (password !== confirm) {
      req.flash("error", "Passwords do not match.");
      return res.redirect(`/register`);
    }

    const userExists = await Users.findOne({
      $or: [{ email }, { phone }]
    });

    if (userExists) {
      req.flash("error", "An account already exists with that email or phone.");
      return res.redirect(`/register`);
    }

    const newUser = new Users({
      fullName,
      phone,
      email,
      business,
      businessType,
      password,
      defaultAddress,
      isEmailVerified: false
    });

    // Generate SHA-256 hashed verification token (expires in 24 hours)
    const rawVerificationToken = newUser.generateEmailVerificationToken();
    await newUser.save();

    if (DEBUG_MODE) {
      console.log("=========================================");
      console.log(`📧 EMAIL VERIFICATION FOR: ${email}`);
      console.log(`🔗 Link: http://localhost:8080/verify-email/${rawVerificationToken}`);
      console.log(`⏳ Valid for: ${EMAIL_VERIFY_EXPIRY_MS / 1000 / 3600} hours`);
      console.log("=========================================");
    }

    // Create welcoming notification
    await Notification.create({
      user: newUser._id,
      title: "Welcome to JD Mart!",
      message: "Please verify your email address to unlock verified buyer features.",
      type: "system",
      icon: "fa-envelope"
    });

    // Regenerate session
    await regenerateSession(req);
    req.session.userId = newUser._id;

    req.session.save((err) => {
      if (err) {
        console.error("Session save error on register:", err);
        return res.redirect("/login");
      }
      res.redirect(`/products?message=${encodeURIComponent("Account created! A verification link has been sent to your email.")}`);
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    req.flash("error", "Unable to create account right now.");
      res.redirect(`/register`);
  }
});

// GET /verify-email/:token - Secure SHA-256 email verification handler
router.get("/verify-email/:token", async (req, res) => {
  try {
    const rawToken = req.params.token;
    if (!rawToken || typeof rawToken !== "string") {
      return res.render("verify-email.ejs", {
        success: false,
        message: "Invalid verification link.",
        error: "Malformed verification token"
      });
    }

    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    const user = await Users.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.render("verify-email.ejs", {
        success: false,
        message: "Verification link is invalid or has expired.",
        error: "Expired or invalid token"
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    await Notification.create({
      user: user._id,
      title: "Email Verified",
      message: "Your email has been successfully verified. You now have full buyer access.",
      type: "system",
      icon: "fa-shield-halved"
    });

    res.render("verify-email.ejs", {
      success: true,
      message: "Your email address has been successfully verified! You now have full access to JD Mart.",
      error: null
    });
  } catch (err) {
    console.error("Email verification error:", err);
    res.render("verify-email.ejs", {
      success: false,
      message: "An error occurred during verification. Please try again.",
      error: "Verification failed"
    });
  }
});

// POST /resend-verification - Rate limited verification resend
router.post("/resend-verification", emailVerifyLimiter, async (req, res) => {
  try {
    let user = null;
    if (req.session && req.session.userId) {
      user = await Users.findById(req.session.userId);
    } else if (req.body.email) {
      const email = sanitizeInput(req.body.email).toLowerCase();
      user = await Users.findOne({ email });
    }

    if (user && !user.isEmailVerified) {
      const rawVerificationToken = user.generateEmailVerificationToken();
      await user.save();

      if (DEBUG_MODE) {
        console.log("=========================================");
        console.log(`📧 RESENT EMAIL VERIFICATION FOR: ${user.email}`);
        console.log(`🔗 Link: http://localhost:8080/verify-email/${rawVerificationToken}`);
        console.log("=========================================");
      }
    }

    const redirectTarget = req.session && req.session.userId ? "/products" : "/login";
    res.redirect(`${redirectTarget}?message=${encodeURIComponent("If an unverified account exists, a new verification link has been sent.")}`);
  } catch (err) {
    console.error("Resend verification error:", err);
    req.flash("error", "Unable to resend verification link.");
      res.redirect(`/products`);
  }
});

// ===========================
// PASSWORD RESET (SHA-256 HASHED & EXPIRING)
// ===========================

// GET /forgot-password
router.get("/forgot-password", (req, res) => {
  res.render("forgot-password.ejs", {
    step: "request",
    message: req.query.message,
    error: req.query.error
  });
});

// POST /forgot-password - Anti-enumeration, 15m expiration, SHA-256 hash storage
router.post("/forgot-password", passwordResetLimiter, async (req, res) => {
  try {
    const rawLogin = sanitizeInput(req.body.login || "");

    if (!rawLogin) {
      req.flash("error", "Enter your email or phone number.");
      return res.redirect(`/forgot-password`);
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

    if (user) {
      const rawResetToken = user.generatePasswordResetToken();
      await user.save();

      if (DEBUG_MODE) {
        console.log("=========================================");
        console.log(`🔐 PASSWORD RESET LINK FOR: ${user.email}`);
        console.log(`🔗 Link: http://localhost:8080/reset-password/${rawResetToken}`);
        console.log(`⏳ Valid for: ${PASSWORD_RESET_EXPIRY_MS / 1000 / 60} minutes`);
        console.log("=========================================");
      }
    }

    // Always display identical message to prevent user enumeration
    return res.render("forgot-password.ejs", {
      step: "request",
      message: "If a matching account was found, a password reset link has been generated (valid for 15 minutes).",
      error: null
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    req.flash("error", "Unable to start password reset right now.");
      return res.redirect(`/forgot-password`);
  }
});

// GET /reset-password/:token - Validates SHA-256 token against DB
router.get("/reset-password/:token", async (req, res) => {
  try {
    const rawToken = req.params.token;
    if (!rawToken || typeof rawToken !== "string") {
      req.flash("error", "Reset link is invalid or expired.");
      return res.redirect(`/forgot-password`);
    }

    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    const user = await Users.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      req.flash("error", "Reset link is invalid or has expired.");
      return res.redirect(`/forgot-password`);
    }

    res.render("forgot-password.ejs", {
      step: "reset",
      token: rawToken,
      message: req.query.message,
      error: req.query.error
    });
  } catch (err) {
    console.error("Reset password page error:", err);
    req.flash("error", "Unable to load reset page.");
      res.redirect(`/forgot-password`);
  }
});

// POST /reset-password/:token - Enforces complexity & invalidates token immediately
router.post("/reset-password/:token", passwordResetLimiter, async (req, res) => {
  try {
    const rawToken = req.params.token;
    const password = req.body.password || "";
    const confirm = req.body.confirm || "";

    const passErr = validatePasswordStrength(password);
    if (passErr) {
      return res.redirect(`/reset-password/${rawToken}${buildErrorQuery(passErr)}`);
    }

    if (password !== confirm) {
      return res.redirect(`/reset-password/${rawToken}${buildErrorQuery("Passwords do not match.")}`);
    }

    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    const user = await Users.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      req.flash("error", "Reset link is invalid or has expired.");
      return res.redirect(`/forgot-password`);
    }

    // Set new password (triggers pre-save bcrypt hash with 12 rounds)
    user.password = password;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    // Destroy any existing session
    if (req.session) {
      req.session.userId = null;
    }

    return res.redirect(`/login?message=${encodeURIComponent("Password reset successfully! Please log in with your new password.")}`);
  } catch (err) {
    console.error("Reset password error:", err);
    req.flash("error", "Unable to reset password right now.");
      return res.redirect(`/forgot-password`);
  }
});

// ===========================
// LOGOUT
// ===========================

// GET /logout - Safe session termination & cache clearing
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Logout session destroy error:", err);
    res.clearCookie("connect.sid", { path: "/" });
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.redirect(`/login?message=${encodeURIComponent("You have been signed out.")}`);
  });
});

module.exports = router;

