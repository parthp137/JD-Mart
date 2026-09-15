/**
 * App Constants and Global Configuration Settings
 */

module.exports = {
  PORT: process.env.PORT || 8080,
  MONGO_URL: process.env.MONGODB_URL || "mongodb://127.0.0.1:27017/jdmart1",
  SESSION_SECRET: process.env.SESSION_SECRET || "supersecretkey-change-in-production",
  DEBUG_MODE: process.env.DEBUG_MODE === "true" || process.env.NODE_ENV !== "production",
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  DEFAULT_PAGE_SIZE: 12,
  MAX_PAGE_SIZE: 48,
  ORDER_PAGE_SIZE: 10,
  NOTIFICATION_PAGE_SIZE: 15,
  ADMIN_ORDER_PAGE_SIZE: 20,
  SESSION_MAX_AGE: 1000 * 60 * 60 * 24, // 24 hours
  OTP_EXPIRY_MS: 5 * 60 * 1000, // 5 minutes
  PASSWORD_RESET_EXPIRY_MS: 15 * 60 * 1000, // 15 minutes
  EMAIL_VERIFY_EXPIRY_MS: 24 * 60 * 60 * 1000, // 24 hours
  BCRYPT_SALT_ROUNDS: 12 // Industry standard 12 salt rounds
};
