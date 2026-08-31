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
const { parsePageValue, buildErrorQuery } = require("../utils/filters");
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

    if (!product || qty < 1 || qty > product.available) {
      return res.redirect(`/products/${req.params.id}`);
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
    res.redirect("/products");
  }
});

// GET /checkout-buy-now
router.get("/checkout-buy-now", isLoggedIn, async (req, res) => {
  try {
    if (!req.session.buyNowItem) {
      return res.redirect("/products");
    }

    const user = await Users.findById(req.user._id);
    const item = req.session.buyNowItem;
    const totalAmount = item.quantity * item.price;

    res.render("checkout-buy-now", {
      item,
      user,
      totalAmount
    });
  } catch (err) {
    console.error("Checkout buy now error:", err);
    res.redirect("/products");
  }
});

// POST /orders/buy-now-place
router.post("/orders/buy-now-place", isLoggedIn, async (req, res) => {
  try {
    if (!req.session.buyNowItem) {
      return res.redirect("/products");
    }

    const { deliveryAddress } = req.body;
    const item = req.session.buyNowItem;
    const product = await Products.findById(item.productId);

    if (!product) {
      return res.redirect("/products");
    }

    const actualAvailable = product.getActualAvailable();
    if (item.quantity > actualAvailable) {
      return res.redirect("/checkout-buy-now");
    }

    const totalAmount = item.quantity * item.price;

    const order = new Order({
      user: req.user._id,
      items: [
        {
          product: product._id,
          quantity: item.quantity,
          priceAtOrder: item.price
        }
      ],
      totalAmount: totalAmount,
      status: "Pending",
      deliveryAddress: deliveryAddress || req.user.defaultAddress || "Please update your delivery address",
      expectedDelivery: new Date(Date.now() + 7 * 86400000),
      timeline: getOrderTimeline("Confirmed")
    });

    // Atomically reduce stock
    await Products.updateOne(
      { _id: product._id },
      {
        $inc: { available: -item.quantity },
        $set: { reserved: 0 }
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
    res.redirect("/orders");
  } catch (err) {
    console.error("Buy now place error:", err);
    res.redirect("/checkout-buy-now");
  }
});

// GET /checkout
router.get("/checkout", isLoggedIn, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.redirect(`/cart${buildErrorQuery("Your cart is empty.")}`);
    }

    for (const item of cart.items) {
      const actualAvailable = item.product.getActualAvailable();
      if (item.quantity > actualAvailable) {
        return res.redirect(`/cart${buildErrorQuery(`${item.product.name}: Only ${actualAvailable} units available.`)}`);
      }
    }

    const totalAmount = cart.getTotalAmount();
    const user = await Users.findById(req.user._id);

    res.render("checkout", {
      cart,
      user,
      totalAmount,
      error: req.query.error,
      message: req.query.message
    });
  } catch (err) {
    console.error("Checkout page error:", err);
    res.redirect("/cart");
  }
});

// POST /orders/place
router.post("/orders/place", isLoggedIn, async (req, res) => {
  try {
    const { deliveryAddress } = req.body;
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.redirect(`/cart${buildErrorQuery("Your cart is empty.")}`);
    }

    for (const item of cart.items) {
      const actualAvailable = item.product.getActualAvailable();
      if (item.quantity > actualAvailable) {
        return res.redirect(`/checkout${buildErrorQuery(`${item.product.name}: Only ${actualAvailable} units available.`)}`);
      }
    }

    const totalAmount = cart.getTotalAmount();

    const order = new Order({
      user: req.user._id,
      items: cart.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        priceAtOrder: item.priceAtAdd
      })),
      totalAmount: totalAmount,
      status: "Pending",
      deliveryAddress: deliveryAddress || req.user.defaultAddress || "Please update your delivery address",
      expectedDelivery: new Date(Date.now() + 7 * 86400000),
      timeline: getOrderTimeline("Confirmed")
    });

    // Atomically reduce stock for all items
    for (const item of cart.items) {
      const product = item.product;
      await Products.updateOne(
        { _id: product._id },
        {
          $inc: { available: -item.quantity },
          $set: { reserved: Math.max(0, (product.reserved || 0) - item.quantity) }
        }
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
    res.redirect("/orders");
  } catch (err) {
    console.error("Place order error:", err);
    res.redirect(`/checkout${buildErrorQuery("Unable to place order right now.")}`);
  }
});

// POST /orders/:id/status -> Admin update order status
router.post("/orders/:id/status", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["Pending", "Processing", "In Transit", "Delivered"];

    if (!allowedStatuses.includes(status)) {
      return res.redirect(`/orders${buildErrorQuery("Invalid order status.")}`);
    }

    const order = await Order.findById(req.params.id).populate("user");
    if (!order) {
      return res.redirect(`/orders${buildErrorQuery("Order not found.")}`);
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

    return res.redirect(`/orders${buildErrorQuery("Order status updated.")}`);
  } catch (err) {
    console.error("Update order status error:", err);
    return res.redirect(`/orders${buildErrorQuery("Unable to update order status.")}`);
  }
});

module.exports = router;
