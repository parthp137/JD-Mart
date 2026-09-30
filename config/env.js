require("dotenv").config();
const joi = require("joi");

const envSchema = joi.object({
  NODE_ENV: joi.string().valid("development", "production", "test").default("development"),
  PORT: joi.number().default(8080),
  MONGODB_URL: joi.string().default("mongodb://127.0.0.1:27017/jdmart1"),
  SESSION_SECRET: joi.string().when("NODE_ENV", {
    is: "production",
    then: joi.required(),
    otherwise: joi.default("supersecretkey-change-in-production")
  }),
  DEBUG_MODE: joi.boolean().default(true)
}).unknown(true);

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  console.error(`Config validation error: ${error.message}`);
  process.exit(1);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongo: {
    url: envVars.MONGODB_URL,
  },
  session: {
    secret: envVars.SESSION_SECRET,
  },
  debug: envVars.DEBUG_MODE || envVars.NODE_ENV !== "production"
};
