/**
 * Shopping Cart Routes
 */
const express = require("express");
const router = express.Router();
const Cart = require("../models/cart");
const Products = require("../models/product");
const { isLoggedIn } = require("../middleware/auth");
const { buildErrorQuery } = require("../utils/filters");

// GET /cart
router.get("/cart", isLoggedIn, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
    const totalAmount = cart ? cart.getTotalAmount() : 0;

    res.render("cart", {
      cart,
      user: req.user,
      totalAmount
    });
  } catch (err) {
    console.error("Cart fetch error:", err);
    res.redirect("/products");
  }
});

// POST /cart/add/:id
router.post("/cart/add/:id", isLoggedIn, async (req, res) => {
  try {
    const product = await Products.findById(req.params.id);
    const quantity = parseInt(req.body.quantity, 10) || 1;

    if (!product) {
      return res.redirect(`/products${buildErrorQuery("Product not found.")}`);
    }

    if (quantity < 1) {
      return res.redirect(`/products/${product._id}${buildErrorQuery("Quantity must be at least 1.")}`);
    }

    const actualAvailable = product.getActualAvailable();
    if (quantity > actualAvailable) {
      return res.redirect(`/products/${product._id}${buildErrorQuery(`Only ${actualAvailable} units available.`)}`);
    }

    let cart = await Cart.findOne({ user: req.user._id });
    let previousQuantity = 0;

    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const existingItem = cart.items.find(
      item => item.product.toString() === product._id.toString()
    );

    if (existingItem) {
      previousQuantity = existingItem.quantity;
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > actualAvailable) {
        return res.redirect(`/products/${product._id}${buildErrorQuery(`Only ${actualAvailable} units available in total.`)}`);
      }
      existingItem.quantity = newQuantity;
    } else {
      cart.items.push({
        product: product._id,
        quantity: quantity,
        priceAtAdd: product.pricePerQuintal
      });
    }

    const quantityDifference = (existingItem ? existingItem.quantity : quantity) - previousQuantity;
    if (quantityDifference > 0) {
      await product.reserve(quantityDifference);
    }

    await cart.save();
    res.redirect("/cart");
  } catch (err) {
    console.error("Add to cart error:", err);
    res.redirect(`/products${buildErrorQuery("Unable to add item to cart.")}`);
  }
});

// POST /cart/update/:productId
router.post("/cart/update/:productId", isLoggedIn, async (req, res) => {
  try {
    const { quantity } = req.body;
    const qty = parseInt(quantity, 10);

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.redirect("/cart");
    }

    const item = cart.items.find(
      i => i.product.toString() === req.params.productId
    );

    if (item) {
      const product = await Products.findById(item.product);
      const actualAvailable = product ? product.getActualAvailable() : 0;
      const oldQuantity = item.quantity;

      if (qty < 1) {
        cart.items = cart.items.filter(
          i => i.product.toString() !== req.params.productId
        );
        if (product) {
          await product.releaseReserve(oldQuantity);
        }
      } else if (qty > actualAvailable) {
        item.quantity = actualAvailable;
        if (product) {
          if (item.quantity < oldQuantity) {
            await product.releaseReserve(oldQuantity - item.quantity);
          } else if (item.quantity > oldQuantity) {
            await product.reserve(item.quantity - oldQuantity);
          }
        }
      } else {
        const difference = qty - oldQuantity;
        if (product) {
          if (difference > 0) {
            await product.reserve(difference);
          } else if (difference < 0) {
            await product.releaseReserve(-difference);
          }
        }
        item.quantity = qty;
      }
    }

    await cart.save();
    res.redirect("/cart");
  } catch (err) {
    console.error("Update cart error:", err);
    res.redirect(`/cart${buildErrorQuery("Unable to update cart item.")}`);
  }
});

// POST /cart/remove/:productId
router.post("/cart/remove/:productId", isLoggedIn, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.redirect("/cart");
    }

    const removedItem = cart.items.find(
      item => item.product.toString() === req.params.productId
    );

    if (removedItem) {
      const product = await Products.findById(req.params.productId);
      if (product) {
        await product.releaseReserve(removedItem.quantity);
      }
    }

    cart.items = cart.items.filter(
      item => item.product.toString() !== req.params.productId
    );

    await cart.save();
    res.redirect("/cart");
  } catch (err) {
    console.error("Remove from cart error:", err);
    res.redirect(`/cart${buildErrorQuery("Unable to remove item from cart.")}`);
  }
});

// POST /cart/clear
router.post("/cart/clear", isLoggedIn, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      for (const item of cart.items) {
        const product = await Products.findById(item.product);
        if (product) {
          await product.releaseReserve(item.quantity);
        }
      }
    }
    await Cart.findOneAndDelete({ user: req.user._id });
    res.redirect("/cart");
  } catch (err) {
    console.error("Clear cart error:", err);
    res.redirect("/cart");
  }
});

module.exports = router;
