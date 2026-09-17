const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  priceAtOrder: {
    type: Number,
    required: true
  }
});

const timelineSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["Pending", "Placed", "Confirmed", "Processing", "Shipped", "In Transit", "Delivered"],
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  items: [orderItemSchema],

  subtotal: {
    type: Number,
    default: 0
  },

  taxAmount: {
    type: Number,
    default: 0
  },

  shippingFee: {
    type: Number,
    default: 0
  },

  totalAmount: {
    type: Number,
    required: true
  },

  paymentMethod: {
    type: String,
    default: "Cash on Mandi Delivery / APMC Escrow"
  },

  status: {
    type: String,
    enum: ["Pending", "Processing", "In Transit", "Delivered"],
    default: "Pending"
  },

  deliveryAddress: {
    type: String,
    required: true
  },

  expectedDelivery: {
    type: Date
  },

  timeline: [timelineSchema],

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-generate order id
orderSchema.pre("save", function () {
  if (!this.orderId) {
    this.orderId = "ORD-" + Math.floor(100 + Math.random() * 900);
  }
});


module.exports = mongoose.model("Order", orderSchema);







