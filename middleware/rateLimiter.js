/**
 * Express Rate Limiting Middleware
 */
const rateLimit = require("express-rate-limit");
const { DEBUG_MODE } = require("../config/constants");

// Sensitive Auth Limiter (Login, Register, OTP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: DEBUG_MODE ? 100 : 10, // 10 attempts in production
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many authentication attempts. Please try again after 15 minutes."
});

// OTP Request Limiter (prevents SMS/OTP flooding)
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: DEBUG_MODE ? 50 : 5, // 5 OTP requests per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many OTP requests. Please wait a few minutes before trying again."
});

// General API / Form submission Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: DEBUG_MODE ? 500 : 150,
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  authLimiter,
  otpLimiter,
  generalLimiter
};
