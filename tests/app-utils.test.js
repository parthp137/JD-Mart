process.env.NODE_ENV = "test";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const app = require("../app");
const User = require("../models/user");
const {
  validateEmail,
  validatePhone,
  validatePasswordStrength,
  sanitizeInput
} = require("../utils/validation");
const {
  PASSWORD_RESET_EXPIRY_MS,
  EMAIL_VERIFY_EXPIRY_MS,
  BCRYPT_SALT_ROUNDS
} = require("../config/constants");

const utils = app.__utils;

test("normalizeMoney rounds and coerces values", () => {
  assert.equal(utils.normalizeMoney("1250"), 1250);
  assert.equal(utils.normalizeMoney(1250.4), 1250);
  assert.equal(utils.normalizeMoney(null), 0);
});

test("formatMoney converts minor units to rupees", () => {
  assert.equal(utils.formatMoney(1250), "₹12.50");
  assert.equal(utils.formatMoney("300"), "₹3.00");
});

test("buildErrorQuery encodes messages safely", () => {
  assert.equal(utils.buildErrorQuery("Hello world"), "?error=Hello%20world");
});

test("buildProductFilter supports search and category", () => {
  const filter = utils.buildProductFilter({ search: "wheat", category: "grains" });

  assert.equal(filter.category, "Grains");
  assert.ok(Array.isArray(filter.$or));
  assert.equal(filter.$or.length, 3);
});

test("getOrderTimeline always includes placed and confirmed entries", () => {
  const timeline = utils.getOrderTimeline("Delivered");

  assert.ok(timeline.some((entry) => entry.status === "Placed"));
  assert.ok(timeline.some((entry) => entry.status === "Confirmed"));
  assert.ok(timeline.some((entry) => entry.status === "Delivered"));
});

// ===========================
// SECURITY HARDENING TESTS
// ===========================

test("Security: validatePasswordStrength enforces policy", () => {
  // Too short
  assert.ok(validatePasswordStrength("Ab1"));
  // Missing uppercase
  assert.ok(validatePasswordStrength("password123"));
  // Missing number
  assert.ok(validatePasswordStrength("Password"));
  // Valid strong passwords
  assert.equal(validatePasswordStrength("Farmer@123"), null);
  assert.equal(validatePasswordStrength("MandiPass2026"), null);
});

test("Security: validateEmail and validatePhone enforce RFC/format requirements", () => {
  assert.ok(validateEmail("invalid-email"));
  assert.ok(validateEmail("@nodomain.com"));
  assert.equal(validateEmail("buyer@jdmart.com"), null);

  assert.ok(validatePhone("123"));
  assert.ok(validatePhone("1234567890123456"));
  assert.equal(validatePhone("9876543210"), null);
  assert.equal(validatePhone("+91 9876543210"), null);
});

test("Security: Email Verification token generation and SHA-256 hashing", () => {
  const user = new User({
    fullName: "Security Tester",
    phone: "9999888877",
    email: "security@jdmart.com",
    business: "Secure Agri Ltd",
    businessType: "Trader",
    password: "Password123",
    defaultAddress: "APMC Hub, Ahmedabad"
  });

  const rawToken = user.generateEmailVerificationToken();
  assert.ok(rawToken && rawToken.length === 64); // 32 bytes hex = 64 chars

  // Verify SHA-256 hash in DB model
  const expectedHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  assert.equal(user.emailVerificationToken, expectedHash);
  assert.ok(user.emailVerificationExpires instanceof Date);
  assert.ok(user.emailVerificationExpires.getTime() > Date.now());
});

test("Security: Password Reset token generation, SHA-256 hashing and tight expiration", () => {
  const user = new User({
    fullName: "Security Tester 2",
    phone: "9999888878",
    email: "security2@jdmart.com",
    business: "Secure Agri Ltd",
    businessType: "Trader",
    password: "Password123",
    defaultAddress: "APMC Hub, Ahmedabad"
  });

  const rawResetToken = user.generatePasswordResetToken();
  assert.ok(rawResetToken && rawResetToken.length === 64);

  const expectedHash = crypto.createHash("sha256").update(rawResetToken).digest("hex");
  assert.equal(user.resetToken, expectedHash);
  assert.ok(user.resetTokenExpiry instanceof Date);

  // Expiration should be within 15 minutes window
  const diffMs = user.resetTokenExpiry.getTime() - Date.now();
  assert.ok(diffMs > 0 && diffMs <= PASSWORD_RESET_EXPIRY_MS);
});

test("Security: User schema toJSON strips credentials and tokens", () => {
  const user = new User({
    fullName: "Secret Tester",
    phone: "9999888879",
    email: "secret@jdmart.com",
    business: "Secure Agri Ltd",
    businessType: "Trader",
    password: "Password123",
    defaultAddress: "APMC Hub, Ahmedabad",
    otp: "123456",
    otpExpiry: new Date(),
    resetToken: "abc123hash",
    resetTokenExpiry: new Date(),
    emailVerificationToken: "xyz456hash",
    emailVerificationExpires: new Date()
  });

  const json = user.toJSON();
  assert.equal(json.password, undefined);
  assert.equal(json.otp, undefined);
  assert.equal(json.otpExpiry, undefined);
  assert.equal(json.resetToken, undefined);
  assert.equal(json.resetTokenExpiry, undefined);
  assert.equal(json.emailVerificationToken, undefined);
  assert.equal(json.emailVerificationExpires, undefined);
  assert.equal(json.fullName, "Secret Tester");
  assert.equal(json.email, "secret@jdmart.com");
});

