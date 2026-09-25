/**
 * Orders and Checkout Routes
 */
const express = require("express");
const router = express.Router();
const Order = require("../models/order");
const Cart = require("../models/cart");
const Products = require("../models/product");
const Users = require("../models/user");
const Notification = require("../models/notification");
const { isLoggedIn, isAdmin } = require("../middleware/auth");
const { getOrderTimeline } = require("../utils/timeline");
const { parsePageValue } = require("../utils/filters");
const { ORDER_PAGE_SIZE } = require("../config/constants");

// GET /orders
router.get("/orders", isLoggedIn, async (req, res) => {
  try {
    const page = parsePageValue(req.query.page, 1);
    const limit = ORDER_PAGE_SIZE;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments({ user: req.user._id });
    const totalPages = Math.max(1, Math.ceil(totalOrders / limit));
    const currentPage = Math.min(page, totalPages);

    const orders = await Order.find({ user: req.user._id })
      .populate("items.product")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const allOrders = await Order.find({ user: req.user._id });
    const stats = {
      total: allOrders.length,
      transit: allOrders.filter(o => o.status === "In Transit").length,
      delivered: allOrders.filter(o => o.status === "Delivered").length,
      pending: allOrders.filter(o => o.status === "Pending").length
    };

    res.render("orders", {
      orders,
      user: req.user,
      stats,
      page: currentPage,
      totalPages,
      totalOrders,
      limit
    });
  } catch (err) {
    console.error("Orders route error:", err);
    res.redirect("/products");
  }
});

// POST /orders/buy-now/:id
router.post("/orders/buy-now/:id", isLoggedIn, async (req, res) => {
  try {
    const product = await Products.findById(req.params.id);
    const qty = parseInt(req.body.quantity, 10);

    if (!product) {
      req.flash("error", "Product not found.");
      return res.redirect(`/products`);
    }

    const actualAvailable = product.getActualAvailable();
    if (qty < 1 || qty > actualAvailable) {
      return res.redirect(`/products/${req.params.id}${buildErrorQuery(`Invalid quantity. Only ${actualAvailable} quintals available.`)}`);
    }

    req.session.buyNowItem = {
      productId: product._id,
      productName: product.name,
      quantity: qty,
      priceAtOrder: product.pricePerQuintal,
      price: product.pricePerQuintal,
      available: product.available,
      category: product.category,
      images: product.images
    };

    res.redirect("/checkout-buy-now");
  } catch (err) {
    console.error("BUY NOW ERROR:", err);
    req.flash("error", "Unable to process Buy Now request.");
      res.redirect(`/products`);
  }
});

// GET /checkout-buy-now
router.get("/checkout-buy-now", isLoggedIn, async (req, res) => {
  try {
    if (!req.session.buyNowItem) {
      req.flash("error", "No active Buy Now session.");
      return res.redirect(`/products`);
    }

    const user = await Users.findById(req.user._id);
    const item = req.session.buyNowItem;
    const subtotal = item.quantity * item.price;
    const taxAmount = Math.round(subtotal * 0.05); // 5% GST
    const shippingFee = 45000; // ₹450 Mandi Logistics fee in paise
    const totalAmount = subtotal + taxAmount + shippingFee;

    res.render("checkout-buy-now", {
      item,
      user,
      subtotal,
      taxAmount,
      shippingFee,
      totalAmount,
      error: req.query.error,
      message: req.query.message
    });
  } catch (err) {
    console.error("Checkout buy now error:", err);
    req.flash("error", "Failed to load checkout.");
      res.redirect(`/products`);
  }
});

// POST /orders/buy-now-place
router.post("/orders/buy-now-place", isLoggedIn, async (req, res) => {
  try {
    if (!req.session.buyNowItem) {
      req.flash("error", "No active Buy Now item.");
      return res.redirect(`/products`);
    }

    const { deliveryAddress, paymentMethod } = req.body;
    const item = req.session.buyNowItem;
    const product = await Products.findById(item.productId);

    if (!product) {
      delete req.session.buyNowItem;
      req.flash("error", "Product is no longer available.");
      return res.redirect(`/products`);
    }

    const actualAvailable = product.getActualAvailable();
    if (item.quantity > actualAvailable) {
      req.flash("error", `Insufficient stock. Only ${actualAvailable} units available.`);
      return res.redirect(`/checkout-buy-now`);
    }

    const subtotal = item.quantity * item.price;
    const taxAmount = Math.round(subtotal * 0.05);
    const shippingFee = 45000;
    const totalAmount = subtotal + taxAmount + shippingFee;

    const order = new Order({
      user: req.user._id,
      items: [
        {
          product: product._id,
          quantity: item.quantity,
          priceAtOrder: item.price
        }
      ],
      subtotal: subtotal,
      taxAmount: taxAmount,
      shippingFee: shippingFee,
      totalAmount: totalAmount,
      paymentMethod: paymentMethod || "Cash on Mandi Delivery / APMC Escrow",
      status: "Pending",
      deliveryAddress: deliveryAddress || req.user.defaultAddress || "Please update your delivery address",
      expectedDelivery: new Date(Date.now() + 7 * 86400000),
      timeline: getOrderTimeline("Placed")
    });

    // Atomically reduce available stock without resetting other buyers' reservations
    await Products.updateOne(
      { _id: product._id },
      {
        $inc: { available: -item.quantity }
      }
    );

    await order.save();

    // Create notification
    await Notification.create({
      user: req.user._id,
      title: "Order Placed Successfully",
      message: `Your order #${order._id.toString().slice(-6).toUpperCase()} for ${item.productName} has been placed for ₹${(totalAmount / 100).toFixed(2)}`,
      type: "order",
      relatedOrder: order._id,
      icon: "fa-check-circle"
    });

    delete req.session.buyNowItem;
    res.redirect("/orders?message=Order+placed+successfully");
  } catch (err) {
    console.error("Buy now place error:", err);
    req.flash("error", "Unable to place order. Please try again.");
      res.redirect(`/checkout-buy-now`);
  }
});

// GET /checkout
router.get("/checkout", isLoggedIn, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      req.flash("error", "Your cart is empty.");
      return res.redirect(`/cart`);
    }

    for (const item of cart.items) {
      if (!item.product) continue;
      const actualAvailable = item.product.getActualAvailable();
      if (item.quantity > actualAvailable) {
        req.flash("error", `${item.product.name}: Only ${actualAvailable} units available.`);
      return res.redirect(`/cart`);
      }
    }

    const subtotal = cart.getTotalAmount();
    const taxAmount = Math.round(subtotal * 0.05);
    const shippingFee = 45000;
    const totalAmount = subtotal + taxAmount + shippingFee;
    const user = await Users.findById(req.user._id);

    res.render("checkout", {
      cart,
      user,
      subtotal,
      taxAmount,
      shippingFee,
      totalAmount,
      error: req.query.error,
      message: req.query.message
    });
  } catch (err) {
    console.error("Checkout page error:", err);
    req.flash("error", "Failed to load checkout.");
      res.redirect(`/cart`);
  }
});

// POST /orders/place
router.post("/orders/place", isLoggedIn, async (req, res) => {
  try {
    const { deliveryAddress, paymentMethod } = req.body;
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      req.flash("error", "Your cart is empty.");
      return res.redirect(`/cart`);
    }

    for (const item of cart.items) {
      if (!item.product) continue;
      const actualAvailable = item.product.getActualAvailable();
      if (item.quantity > actualAvailable) {
        req.flash("error", `${item.product.name}: Only ${actualAvailable} units available.`);
      return res.redirect(`/checkout`);
      }
    }

    const subtotal = cart.getTotalAmount();
    const taxAmount = Math.round(subtotal * 0.05);
    const shippingFee = 45000;
    const totalAmount = subtotal + taxAmount + shippingFee;

    const order = new Order({
      user: req.user._id,
      items: cart.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        priceAtOrder: item.priceAtAdd
      })),
      subtotal: subtotal,
      taxAmount: taxAmount,
      shippingFee: shippingFee,
      totalAmount: totalAmount,
      paymentMethod: paymentMethod || "Cash on Mandi Delivery / APMC Escrow",
      status: "Pending",
      deliveryAddress: deliveryAddress || req.user.defaultAddress || "Please update your delivery address",
      expectedDelivery: new Date(Date.now() + 7 * 86400000),
      timeline: getOrderTimeline("Placed")
    });

    // Atomically reduce stock and release reserve for all cart items
    for (const item of cart.items) {
      const product = item.product;
      if (!product) continue;
      await Products.updateOne(
        { _id: product._id },
        {
          $inc: { available: -item.quantity, reserved: -item.quantity }
        }
      );
      // Ensure reserved stock does not drop below 0
      await Products.updateOne(
        { _id: product._id, reserved: { $lt: 0 } },
        { $set: { reserved: 0 } }
      );
    }

    await order.save();

    await Notification.create({
      user: req.user._id,
      title: "Order Placed Successfully",
      message: `Your order #${order._id.toString().slice(-6).toUpperCase()} has been placed for ₹${(totalAmount / 100).toFixed(2)}`,
      type: "order",
      relatedOrder: order._id,
      icon: "fa-check-circle"
    });

    await Cart.findOneAndDelete({ user: req.user._id });
    res.redirect("/orders?message=Order+placed+successfully");
  } catch (err) {
    console.error("Place order error:", err);
    req.flash("error", "Unable to place order right now.");
      res.redirect(`/checkout`);
  }
});

// POST /orders/:id/status -> Admin update order status
router.post("/orders/:id/status", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["Pending", "Processing", "In Transit", "Delivered"];

    if (!allowedStatuses.includes(status)) {
      req.flash("error", "Invalid order status.");
      return res.redirect(`/orders`);
    }

    const order = await Order.findById(req.params.id).populate("user");
    if (!order) {
      req.flash("error", "Order not found.");
      return res.redirect(`/orders`);
    }

    order.status = status;
    order.timeline = getOrderTimeline(status, order.timeline);
    await order.save();

    await Notification.create({
      user: order.user._id,
      title: `Order status updated to ${status}`,
      message: `Your order ${order.orderId || order._id} is now ${status}.`,
      type: "order",
      relatedOrder: order._id,
      icon: status === "Delivered" ? "fa-check-circle" : "fa-box"
    });

    req.flash("error", "Order status updated.");
      return res.redirect(`/orders`);
  } catch (err) {
    console.error("Update order status error:", err);
    req.flash("error", "Unable to update order status.");
      return res.redirect(`/orders`);
  }
});

module.exports = router;
