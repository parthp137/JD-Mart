/**
 * Express Rate Limiting Middleware
 * Protects auth endpoints against brute force, credential stuffing, and flooding
 */
const rateLimit = require("express-rate-limit");
const { DEBUG_MODE } = require("../config/constants");

const isTestOrDev = DEBUG_MODE || process.env.NODE_ENV === "test";

// Generic rate limit handler that works for both HTML redirects and JSON requests
function createRateLimitHandler(redirectPath, message) {
  return (req, res, next, options) => {
    if (req.accepts("html") && !req.xhr && !req.path.startsWith("/api/")) {
      return res.status(429).redirect(`${redirectPath}?error=${encodeURIComponent(message)}`);
    }
    return res.status(429).json({ error: message });
  };
}

// Sensitive Login Limiter (brute force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestOrDev ? 1000 : 10, // 10 attempts per 15 min in production
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("/login", "Too many authentication attempts. Please try again after 15 minutes.")
});

// Registration Limiter (prevents bulk automated account creation)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isTestOrDev ? 1000 : 5, // 5 registrations per hour per IP in production
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("/register", "Too many accounts created from this IP. Please try again later.")
});

// OTP Request & Verification Limiter (prevents OTP flooding & brute force)
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isTestOrDev ? 1000 : 5, // 5 OTP attempts per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("/otp-login", "Too many OTP requests. Please wait 5 minutes before trying again.")
});

// Password Reset Limiter (prevents reset token flooding & user harassment)
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestOrDev ? 1000 : 5, // 5 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("/forgot-password", "Too many password reset attempts. Please try again in 15 minutes.")
});

// Email Verification Resend Limiter
const emailVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestOrDev ? 1000 : 5, // 5 resends per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("/products", "Too many verification requests. Please check your inbox or wait 15 minutes.")
});

// General API / Form submission Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestOrDev ? 5000 : 200,
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  authLimiter,
  registerLimiter,
  otpLimiter,
  passwordResetLimiter,
  emailVerifyLimiter,
  generalLimiter
};

