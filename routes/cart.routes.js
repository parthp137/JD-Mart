/**
 * Shopping Cart Routes
 */
const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cart.controller");
const { isLoggedIn } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { cartAddSchema, cartUpdateSchema } = require("../middleware/schemas");

// GET /cart
router.get("/cart", isLoggedIn, cartController.getCart);

// POST /cart/add/:id
router.post("/cart/add/:id", isLoggedIn, validate(cartAddSchema), cartController.addToCart);

// POST /cart/update/:productId
router.post("/cart/update/:productId", isLoggedIn, validate(cartUpdateSchema), cartController.updateCart);

// POST /cart/remove/:productId
router.post("/cart/remove/:productId", isLoggedIn, cartController.removeFromCart);

// POST /cart/clear
router.post("/cart/clear", isLoggedIn, cartController.clearCart);

module.exports = router;
