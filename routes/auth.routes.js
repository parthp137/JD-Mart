/**
 * Authentication and User Account Routes
 */
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Users = require("../models/user");
const { authLimiter, otpLimiter } = require("../middleware/rateLimiter");
const { buildErrorQuery } = require("../utils/filters");
const { sanitizeInput } = require("../utils/validation");
const { DEBUG_MODE, OTP_EXPIRY_MS } = require("../config/constants");

// GET /login
router.get("/login", (req, res) => {
  res.render("login.ejs");
});

// POST /login
router.post("/login", authLimiter, async (req, res) => {
  try {
    const rawLogin = sanitizeInput(req.body.login || "");
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
    console.error("LOGIN ERROR:", err);
    res.redirect(`/login${buildErrorQuery("Unable to sign in right now.")}`);
  }
});

// GET /otp-login
router.get("/otp-login", (req, res) => {
  res.render("otp", {
    step: false,
    error: req.query.error,
    message: req.query.message
  });
});

// POST /send-otp
router.post("/send-otp", otpLimiter, async (req, res) => {
  try {
    const phone = sanitizeInput(req.body.phone || "");
    const normalizedPhone = phone.replace(/\D/g, "");

    if (!phone) {
      return res.redirect(`/otp-login${buildErrorQuery("Enter a phone number.")}`);
    }

    const user = await Users.findOne({
      $or: [
        { phone },
        ...(normalizedPhone && normalizedPhone !== phone ? [{ phone: normalizedPhone }] : [])
      ]
    });

    if (!user) {
      return res.redirect(`/otp-login${buildErrorQuery("No account found for this phone number.")}`);
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    req.session.otp = otp;
    req.session.otpPhone = user.phone;
    req.session.otpExpiry = Date.now() + OTP_EXPIRY_MS;

    if (DEBUG_MODE) {
      console.log("=================================");
      console.log("OTP FOR LOGIN:", otp);
      console.log("=================================");
    }

    res.render("otp", {
      step: true,
      phone: user.phone,
      message: DEBUG_MODE ? "OTP generated. Check terminal output." : "OTP sent to your registered phone."
    });
  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    res.redirect(`/otp-login${buildErrorQuery("Unable to send OTP.")}`);
  }
});

// POST /verify-otp
router.post("/verify-otp", authLimiter, async (req, res) => {
  try {
    const { otp } = req.body;

    if (!req.session.otpExpiry || Date.now() > req.session.otpExpiry) {
      req.session.otp = null;
      req.session.otpPhone = null;
      req.session.otpExpiry = null;
      return res.redirect(`/otp-login${buildErrorQuery("OTP expired. Request a new code.")}`);
    }

    if (parseInt(otp, 10) !== req.session.otp) {
      return res.redirect(`/otp-login${buildErrorQuery("Invalid OTP. Try again.")}`);
    }

    const user = await Users.findOne({ phone: req.session.otpPhone });
    if (!user) {
      return res.redirect("/otp-login");
    }

    req.session.userId = user._id;
    req.session.otp = null;
    req.session.otpPhone = null;
    req.session.otpExpiry = null;

    req.session.save(() => {
      res.redirect("/products");
    });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    res.redirect(`/otp-login${buildErrorQuery("Unable to verify OTP.")}`);
  }
});

// GET /register
router.get("/register", (req, res) => {
  res.render("register.ejs");
});

// POST /register
router.post("/register", authLimiter, async (req, res) => {
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
    console.error("REGISTER ERROR:", err);
    res.redirect(`/register${buildErrorQuery("Unable to create account right now.")}`);
  }
});

// GET /forgot-password
router.get("/forgot-password", (req, res) => {
  res.render("forgot-password.ejs", {
    step: "request",
    message: req.query.message,
    error: req.query.error
  });
});

// POST /forgot-password
router.post("/forgot-password", authLimiter, async (req, res) => {
  try {
    const rawLogin = sanitizeInput(req.body.login || "");

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
    user.resetTokenExpiry = Date.now() + 1000 * 60 * 30; // 30 minutes
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

// GET /reset-password/:token
router.get("/reset-password/:token", async (req, res) => {
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

// POST /reset-password/:token
router.post("/reset-password/:token", authLimiter, async (req, res) => {
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

// GET /logout
router.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) console.error("Logout session destroy error:", err);
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

module.exports = router;
