const mongoose = require("mongoose");

const rfqSchema = new mongoose.Schema({
  rfqNumber: {
    type: String,
    unique: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  requestedQuantity: {
    type: Number,
    required: true,
    min: 1
  },
  targetPricePerQuintal: {
    type: Number, // In paise
    required: true
  },
  currentProductPrice: {
    type: Number, // Snapshot of original price
    required: true
  },
  deliveryLocation: {
    type: String,
    required: true,
    trim: true
  },
  requiredByDate: {
    type: Date
  },
  buyerNotes: {
    type: String,
    maxLength: 1000
  },
  status: {
    type: String,
    enum: ["Submitted", "Under Review", "Counter Offer", "Accepted", "Rejected"],
    default: "Submitted"
  },
  counterPricePerQuintal: {
    type: Number // Admin/Supplier counter price in paise
  },
  adminNotes: {
    type: String,
    maxLength: 1000
  },
  validUntil: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days validity
  },
  timeline: [
    {
      status: String,
      comment: String,
      date: {
        type: Date,
        default: Date.now
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-generate RFQ Number pre-save
rfqSchema.pre("save", function () {
  if (!this.rfqNumber) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.rfqNumber = `RFQ-${Date.now().toString().slice(-6)}-${randomSuffix}`;
  }
  if (this.isNew && (!this.timeline || this.timeline.length === 0)) {
    this.timeline = [
      {
        status: "Submitted",
        comment: "RFQ submitted by buyer",
        date: new Date()
      }
    ];
  }
});

module.exports = mongoose.model("RFQ", rfqSchema);
