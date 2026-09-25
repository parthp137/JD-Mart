/**
 * User Profile & Address Management Routes
 */
const express = require("express");
const router = express.Router();
const Users = require("../models/user");
const { isLoggedIn } = require("../middleware/auth");
const { buildErrorQuery } = require("../utils/filters");
const {
  sanitizeInput,
  validateEmail,
  validatePhone,
  validatePasswordStrength
} = require("../utils/validation");

// GET /profile
router.get("/profile", isLoggedIn, async (req, res) => {
  const user = await Users.findById(req.session.userId);
  res.render("profile", { user });
});

// GET /profile/edit
router.get("/profile/edit", isLoggedIn, async (req, res) => {
  const user = await Users.findById(req.session.userId);
  res.render("profile-edit", {
    user,
    error: req.query.error,
    message: req.query.message
  });
});

// POST /profile/edit
router.post("/profile/edit", isLoggedIn, async (req, res) => {
  try {
    const fullName = sanitizeInput(req.body.fullName || "");
    const phone = sanitizeInput(req.body.phone || "");
    const email = sanitizeInput(req.body.email || "").toLowerCase();
    const business = sanitizeInput(req.body.business || "");
    const businessType = sanitizeInput(req.body.businessType || "");
    const defaultAddress = sanitizeInput(req.body.defaultAddress || "");
    const password = req.body.password || "";

    if (!fullName || !phone || !email || !business || !businessType || !defaultAddress) {
      req.flash("error", "Please complete all required fields.");
      return res.redirect(`/profile/edit`);
    }

    const emailErr = validateEmail(email);
    if (emailErr) {
      req.flash("error", emailErr);
      return res.redirect(`/profile/edit`);
    }

    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      req.flash("error", phoneErr);
      return res.redirect(`/profile/edit`);
    }

    const user = await Users.findById(req.session.userId);
    if (!user) {
      req.flash("error", "Session expired. Please sign in again.");
      return res.redirect(`/login`);
    }

    const duplicate = await Users.findOne({
      _id: { $ne: user._id },
      $or: [{ email }, { phone }]
    });

    if (duplicate) {
      req.flash("error", "Email or phone is already in use.");
      return res.redirect(`/profile/edit`);
    }

    // Check if email changed; if so, reset verification
    if (user.email !== email) {
      user.isEmailVerified = false;
    }

    user.fullName = fullName;
    user.phone = phone;
    user.email = email;
    user.business = business;
    user.businessType = businessType;
    user.defaultAddress = defaultAddress;

    if (password) {
      const passErr = validatePasswordStrength(password);
      if (passErr) {
        req.flash("error", passErr);
      return res.redirect(`/profile/edit`);
      }
      user.password = password;
    }

    await user.save();
    req.session.userId = user._id;
    return res.redirect(`/profile/edit?message=${encodeURIComponent("Profile updated successfully.")}`);
  } catch (err) {
    console.error("Profile edit error:", err);
    req.flash("error", "Unable to update profile right now.");
      return res.redirect(`/profile/edit`);
  }
});

// POST /profile/address/add
router.post("/profile/address/add", isLoggedIn, async (req, res) => {
  try {
    const label = sanitizeInput(req.body.label || "");
    const address = sanitizeInput(req.body.address || "");

    if (!label || !address) {
      req.flash("error", "Please provide label and address.");
      return res.redirect(`/profile/edit`);
    }

    const user = await Users.findById(req.session.userId);
    if (!user) {
      req.flash("error", "Session expired.");
      return res.redirect(`/login`);
    }

    user.addresses = user.addresses || [];
    user.addresses.push({ label, address, isDefault: user.addresses.length === 0 });

    if (user.addresses.length === 1) {
      user.defaultAddress = address;
    }

    await user.save();
    req.flash("error", "Address added successfully.");
      return res.redirect(`/profile/edit`);
  } catch (err) {
    console.error("Add address error:", err);
    req.flash("error", "Unable to add address.");
      return res.redirect(`/profile/edit`);
  }
});

// POST /profile/address/set-default/:addressId
router.post("/profile/address/set-default/:addressId", isLoggedIn, async (req, res) => {
  try {
    const user = await Users.findById(req.session.userId);
    if (!user) {
      req.flash("error", "Session expired.");
      return res.redirect(`/login`);
    }

    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });

    const address = user.addresses.id(req.params.addressId);
    if (address) {
      address.isDefault = true;
      user.defaultAddress = address.address;
    }

    await user.save();
    req.flash("error", "Default address updated.");
      return res.redirect(`/profile/edit`);
  } catch (err) {
    console.error("Set default address error:", err);
    req.flash("error", "Unable to update default address.");
      return res.redirect(`/profile/edit`);
  }
});

// POST /profile/address/remove/:addressId
router.post("/profile/address/remove/:addressId", isLoggedIn, async (req, res) => {
  try {
    const user = await Users.findById(req.session.userId);
    if (!user) {
      req.flash("error", "Session expired.");
      return res.redirect(`/login`);
    }

    const address = user.addresses.id(req.params.addressId);
    if (address) {
      const wasDefault = address.isDefault;
      address.deleteOne();

      if (wasDefault && user.addresses.length > 0) {
        user.addresses[0].isDefault = true;
        user.defaultAddress = user.addresses[0].address;
      }
    }

    await user.save();
    req.flash("error", "Address removed.");
      return res.redirect(`/profile/edit`);
  } catch (err) {
    console.error("Remove address error:", err);
    req.flash("error", "Unable to remove address.");
      return res.redirect(`/profile/edit`);
  }
});

module.exports = router;
