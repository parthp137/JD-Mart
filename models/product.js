const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ["Grains", "Pulses", "Oilseeds", "Spices"],
    required: true
  },
  description: {
    type: String,
    maxLength: 500,
    trim: true
  },
  grade: {
    type: String,
    enum: ["A", "B", "C"],
    default: "A"
  },
  demandLevel: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium"
  },
  pricePerQuintal: {
    type: Number,
    required: true
  },
  oldPrice: {
    type: Number,
    default: 0
  },
  belowMarketPercent: {
    type: Number,
    default: 0
  },
  moq: {
    type: Number,
    default: 1, // Minimum Order Quantity in Quintals
    min: 1
  },
  available: {
    type: Number,
    default: 0,
    min: 0
  },
  reserved: {
    type: Number,
    default: 0,
    description: "Stock reserved in active shopping carts"
  },
  // B2B Wholesale Tiered Discounts
  tieredPricing: [
    {
      minQty: { type: Number, required: true }, // e.g., 10 quintals
      discountPercent: { type: Number, required: true } // e.g., 5%
    }
  ],
  // B2B Supplier Verification & Credentials
  supplier: {
    name: { type: String, default: "JD Certified Mandi Farmer" },
    location: { type: String, default: "APMC Mandi Hub" },
    mandiLicense: { type: String, default: "APMC-GJ-2024-8841" },
    fssaiNumber: { type: String, default: "10020021000142" },
    isVerified: { type: Boolean, default: true },
    organicCertified: { type: Boolean, default: false }
  },
  images: [
    {
      filename: String,
      url: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  deliveryTime: {
    minDays: { type: Number, default: 2 },
    maxDays: { type: Number, default: 7 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Get actual available stock (available - reserved)
productSchema.methods.getActualAvailable = function () {
  return Math.max(0, this.available - (this.reserved || 0));
};

// Add to reserved stock
productSchema.methods.reserve = async function (quantity) {
  this.reserved = (this.reserved || 0) + quantity;
  return this.save();
};

// Release reserved stock
productSchema.methods.releaseReserve = async function (quantity) {
  this.reserved = Math.max(0, (this.reserved || 0) - quantity);
  return this.save();
};

// Calculate effective price per quintal considering tiered wholesale volume discounts
productSchema.methods.getTieredDiscount = function (quantity) {
  if (!this.tieredPricing || this.tieredPricing.length === 0) {
    return 0;
  }
  // Sort tiers descending
  const sortedTiers = [...this.tieredPricing].sort((a, b) => b.minQty - a.minQty);
  const matched = sortedTiers.find(t => quantity >= t.minQty);
  return matched ? matched.discountPercent : 0;
};

// Get stock status
productSchema.methods.getStockStatus = function () {
  const available = this.available - (this.reserved || 0);
  if (available <= 0) return "OUT_OF_STOCK";
  if (available <= 5) return "LOW_STOCK";
  return "IN_STOCK";
};

// Get stock warning message
productSchema.methods.getStockWarning = function () {
  const status = this.getStockStatus();
  const available = this.available - (this.reserved || 0);

  if (status === "OUT_OF_STOCK") {
    return { type: "danger", message: "Out of Stock" };
  } else if (status === "LOW_STOCK") {
    return { type: "warning", message: `Only ${available} units left!` };
  }
  return null;
};

module.exports = mongoose.model("Product", productSchema);