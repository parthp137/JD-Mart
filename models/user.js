const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const {
  BCRYPT_SALT_ROUNDS,
  PASSWORD_RESET_EXPIRY_MS,
  EMAIL_VERIFY_EXPIRY_MS
} = require("../config/constants");

const addressSchema = new mongoose.Schema({
  label: {
    type: String,
    enum: ["Home", "Office", "Farm", "Other"],
    required: true
  },
  address: {
    type: String,
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },

  phone: {
    type: String,
    required: true,
    unique: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  business: {
    type: String,
    required: true,
    trim: true
  },

  businessType: {
    type: String,
    enum: ["Farmer", "Trader", "Wholesaler", "Retailer", "Exporter"],
    required: true
  },

  password: {
    type: String,
    required: true
  },

  // Email verification support
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    select: false
  },

  // OTP login support
  otp: {
    type: String,
    select: false
  },
  otpExpiry: {
    type: Date,
    select: false
  },

  // Forgot password support (stored as SHA-256 hash)
  resetToken: {
    type: String,
    select: false
  },
  resetTokenExpiry: {
    type: Date,
    select: false
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },

  // Multiple addresses with history
  addresses: [addressSchema],

  defaultAddress: {
    type: String,
    required: true
  },

  // Profile badge support
  profileInitials: {
    type: String,
    default: ""
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Configure transforms to strip sensitive credentials from JSON and object outputs
const transformUser = (doc, ret) => {
  delete ret.password;
  delete ret.otp;
  delete ret.otpExpiry;
  delete ret.resetToken;
  delete ret.resetTokenExpiry;
  delete ret.emailVerificationToken;
  delete ret.emailVerificationExpires;
  return ret;
};

userSchema.set("toJSON", { transform: transformUser });
userSchema.set("toObject", { transform: transformUser });

// Hash password before save using 12 salt rounds
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, BCRYPT_SALT_ROUNDS);
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password || !enteredPassword) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate cryptographically secure SHA-256 hashed email verification token
userSchema.methods.generateEmailVerificationToken = function () {
  const rawToken = crypto.randomBytes(32).toString("hex");
  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  this.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFY_EXPIRY_MS);
  return rawToken;
};

// Generate cryptographically secure SHA-256 hashed password reset token
userSchema.methods.generatePasswordResetToken = function () {
  const rawToken = crypto.randomBytes(32).toString("hex");
  this.resetToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  this.resetTokenExpiry = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);
  return rawToken;
};

module.exports = mongoose.model("User", userSchema);
