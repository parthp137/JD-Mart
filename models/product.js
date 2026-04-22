const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: String, // Organic Wheat
  category: {
    type: String,
    enum: ["Grains","Pulses","Oilseeds","Spices"],
  },

  // seller: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: "User"
  // },

  description:{
    type: String,
    maxLength: 200,
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

  pricePerQuintal: Number,
  oldPrice: Number,

  belowMarketPercent: Number, // 7%, 6%, etc.
  available:{
    type: Number,
    default: 0,
  },

  reserved: {
    type: Number,
    default: 0,
    description: "Stock reserved in active shopping carts"
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
    minDays: Number,
    maxDays: Number
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Get actual available stock (available - reserved)
productSchema.methods.getActualAvailable = function() {
  return Math.max(0, this.available - (this.reserved || 0));
};

// Add to reserved stock
productSchema.methods.reserve = async function(quantity) {
  this.reserved = (this.reserved || 0) + quantity;
  return this.save();
};

// Release reserved stock
productSchema.methods.releaseReserve = async function(quantity) {
  this.reserved = Math.max(0, (this.reserved || 0) - quantity);
  return this.save();
};

// Get stock status
productSchema.methods.getStockStatus = function() {
  const available = this.available - (this.reserved || 0);
  if (available <= 0) return "OUT_OF_STOCK";
  if (available <= 5) return "LOW_STOCK";
  return "IN_STOCK";
};

// Get stock warning message
productSchema.methods.getStockWarning = function() {
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