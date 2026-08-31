/**
 * User Profile & Address Management Routes
 */
const express = require("express");
const router = express.Router();
const Users = require("../models/user");
const { isLoggedIn } = require("../middleware/auth");
const { buildErrorQuery } = require("../utils/filters");
const { sanitizeInput } = require("../utils/validation");

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

// POST /profile/address/add
router.post("/profile/address/add", isLoggedIn, async (req, res) => {
  try {
    const label = sanitizeInput(req.body.label || "");
    const address = sanitizeInput(req.body.address || "");

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

// POST /profile/address/set-default/:addressId
router.post("/profile/address/set-default/:addressId", isLoggedIn, async (req, res) => {
  try {
    const user = await Users.findById(req.session.userId);
    if (!user) {
      return res.redirect(`/login${buildErrorQuery("Session expired.")}`);
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
    return res.redirect(`/profile/edit${buildErrorQuery("Default address updated.")}`);
  } catch (err) {
    console.error("Set default address error:", err);
    return res.redirect(`/profile/edit${buildErrorQuery("Unable to update default address.")}`);
  }
});

// POST /profile/address/remove/:addressId
router.post("/profile/address/remove/:addressId", isLoggedIn, async (req, res) => {
  try {
    const user = await Users.findById(req.session.userId);
    if (!user) {
      return res.redirect(`/login${buildErrorQuery("Session expired.")}`);
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
    return res.redirect(`/profile/edit${buildErrorQuery("Address removed.")}`);
  } catch (err) {
    console.error("Remove address error:", err);
    return res.redirect(`/profile/edit${buildErrorQuery("Unable to remove address.")}`);
  }
});

module.exports = router;
