const envConfig = require('./env');

module.exports = {
  PORT: envConfig.port,
  MONGO_URL: envConfig.mongo.url,
  SESSION_SECRET: envConfig.session.secret,
  DEBUG_MODE: envConfig.debug,
  IS_PRODUCTION: envConfig.env === "production",
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
