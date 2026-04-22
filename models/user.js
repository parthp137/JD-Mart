const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
    lowercase: true
  },

  business: {
    type: String,
    required: true
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

  // OTP login support
  otp: String,
  otpExpiry: Date,

  // Forgot password support
  resetToken: String,
  resetTokenExpiry: Date,

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

// Hash password before save
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
