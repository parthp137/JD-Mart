/**
 * B2B Wholesale Request For Quote (RFQ) Routes
 */
const express = require("express");
const router = express.Router();
const RFQ = require("../models/rfq");
const Products = require("../models/product");
const Notification = require("../models/notification");
const { isLoggedIn, isAdmin } = require("../middleware/auth");
const { buildErrorQuery } = require("../utils/filters");
const { sanitizeInput } = require("../utils/validation");

// GET /rfqs -> Buyer Quotes Dashboard
router.get("/rfqs", isLoggedIn, async (req, res) => {
  try {
    const rfqs = await RFQ.find({ buyer: req.user._id })
      .populate("product")
      .sort({ createdAt: -1 });

    res.render("rfqs", {
      rfqs,
      user: req.user
    });
  } catch (err) {
    console.error("Fetch RFQs error:", err);
    res.redirect("/products");
  }
});

// POST /rfq/submit -> Submit Request for Quote
router.post("/rfq/submit", isLoggedIn, async (req, res) => {
  try {
    const {
      productId,
      requestedQuantity,
      targetPricePerQuintal,
      deliveryLocation,
      buyerNotes
    } = req.body;

    const product = await Products.findById(productId);
    if (!product) {
      return res.redirect(`/products${buildErrorQuery("Product not found.")}`);
    }

    const qty = parseInt(requestedQuantity, 10);
    const targetPrice = Math.round(parseFloat(targetPricePerQuintal) * 100); // convert ₹ to paise

    if (!qty || qty < 1 || isNaN(targetPrice) || targetPrice <= 0) {
      return res.redirect(`/products/${productId}${buildErrorQuery("Please provide valid quantity and target price.")}`);
    }

    const rfq = new RFQ({
      buyer: req.user._id,
      product: product._id,
      requestedQuantity: qty,
      targetPricePerQuintal: targetPrice,
      currentProductPrice: product.pricePerQuintal,
      deliveryLocation: sanitizeInput(deliveryLocation || req.user.defaultAddress || "Location pending"),
      buyerNotes: sanitizeInput(buyerNotes || "")
    });

    await rfq.save();

    // Create notification for buyer
    await Notification.create({
      user: req.user._id,
      title: "Quote Request Submitted",
      message: `Your RFQ (${rfq.rfqNumber}) for ${qty} quintals of ${product.name} at ₹${(targetPrice / 100).toFixed(2)}/q has been submitted.`,
      type: "order",
      icon: "fa-handshake"
    });

    res.redirect(`/rfqs?message=${encodeURIComponent("Quote request submitted successfully!")}`);
  } catch (err) {
    console.error("Submit RFQ error:", err);
    res.redirect(`/products${buildErrorQuery("Unable to submit quote request.")}`);
  }
});

// POST /rfqs/:id/accept-counter -> Buyer accepts counter offer
router.post("/rfqs/:id/accept-counter", isLoggedIn, async (req, res) => {
  try {
    const rfq = await RFQ.findOne({ _id: req.params.id, buyer: req.user._id }).populate("product");
    if (!rfq) {
      return res.redirect(`/rfqs${buildErrorQuery("Quote request not found.")}`);
    }

    if (rfq.status !== "Counter Offer") {
      return res.redirect(`/rfqs${buildErrorQuery("No active counter offer to accept.")}`);
    }

    rfq.status = "Accepted";
    rfq.timeline.push({
      status: "Accepted",
      comment: "Buyer accepted supplier counter offer",
      date: new Date()
    });
    await rfq.save();

    // Store in buy-now session with negotiated counter price
    req.session.buyNowItem = {
      productId: rfq.product._id,
      productName: `${rfq.product.name} (Negotiated RFQ: ${rfq.rfqNumber})`,
      quantity: rfq.requestedQuantity,
      priceAtOrder: rfq.counterPricePerQuintal || rfq.targetPricePerQuintal,
      price: rfq.counterPricePerQuintal || rfq.targetPricePerQuintal,
      available: rfq.product.available,
      category: rfq.product.category,
      images: rfq.product.images
    };

    res.redirect("/checkout-buy-now");
  } catch (err) {
    console.error("Accept counter error:", err);
    res.redirect(`/rfqs${buildErrorQuery("Unable to process quote acceptance.")}`);
  }
});

// Admin RFQ routes
router.post("/admin/rfqs/:id/respond", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { action, counterPrice, adminNotes } = req.body;
    const rfq = await RFQ.findById(req.params.id).populate("buyer").populate("product");

    if (!rfq) {
      return res.redirect(`/admin${buildErrorQuery("RFQ not found.")}`);
    }

    if (action === "accept") {
      rfq.status = "Accepted";
      rfq.counterPricePerQuintal = rfq.targetPricePerQuintal;
      rfq.adminNotes = sanitizeInput(adminNotes || "Price approved as requested");
      rfq.timeline.push({
        status: "Accepted",
        comment: "Target price accepted by supplier",
        date: new Date()
      });
    } else if (action === "counter") {
      rfq.status = "Counter Offer";
      rfq.counterPricePerQuintal = Math.round(parseFloat(counterPrice) * 100);
      rfq.adminNotes = sanitizeInput(adminNotes || "Counter price proposed");
      rfq.timeline.push({
        status: "Counter Offer",
        comment: `Supplier offered ₹${counterPrice}/quintal`,
        date: new Date()
      });
    } else if (action === "reject") {
      rfq.status = "Rejected";
      rfq.adminNotes = sanitizeInput(adminNotes || "Quote rejected");
      rfq.timeline.push({
        status: "Rejected",
        comment: "Quote declined by supplier",
        date: new Date()
      });
    }

    await rfq.save();

    await Notification.create({
      user: rfq.buyer._id,
      title: `RFQ Update: ${rfq.status}`,
      message: `Your RFQ ${rfq.rfqNumber} status is now: ${rfq.status}.`,
      type: "order",
      icon: "fa-handshake"
    });

    res.redirect(`/rfqs?message=${encodeURIComponent("RFQ responded successfully.")}`);
  } catch (err) {
    console.error("Admin RFQ respond error:", err);
    res.redirect(`/rfqs${buildErrorQuery("Unable to respond to RFQ.")}`);
  }
});

module.exports = router;
