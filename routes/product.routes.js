/**
 * Product Catalog and Public Browsing Routes
 */
const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");
const productController = require("../controllers/product.controller");

// GET / -> Root redirect
router.get("/", productController.redirectToProducts);

// GET /listings alias
router.get("/listings", productController.redirectListings);

// GET /products
router.get("/products", isLoggedIn, productController.getProducts);

// GET /products/:id -> Product detail
router.get("/products/:id", isLoggedIn, productController.getProductDetail);

module.exports = router;
