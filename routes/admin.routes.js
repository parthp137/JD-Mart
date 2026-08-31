/**
 * Admin Dashboard & Product Management Routes
 */
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const Products = require("../models/product");
const Order = require("../models/order");
const Users = require("../models/user");
const Notification = require("../models/notification");
const { isLoggedIn, isAdmin } = require("../middleware/auth");
const { upload, uploadDir } = require("../config/multer");
const { getImageUrl, getCropPlaceholder } = require("../utils/image");
const { parsePageValue, buildErrorQuery } = require("../utils/filters");
const { ADMIN_ORDER_PAGE_SIZE } = require("../config/constants");

// Apply admin guard to all admin routes
router.use(isLoggedIn, isAdmin);

// GET /admin -> Admin Dashboard Home
router.get("/admin", async (req, res) => {
  try {
    const totalProducts = await Products.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalUsers = await Users.countDocuments();

    const lowStockProducts = await Products.countDocuments({
      $expr: { $lte: ["$available", 5] }
    });

    res.render("admin-dashboard", {
      section: "dashboard",
      stats: {
        totalProducts,
        totalOrders,
        totalUsers,
        lowStockProducts
      },
      user: req.user
    });
  } catch (err) {
    console.error("Admin dashboard error:", err);
    res.redirect("/");
  }
});

// GET /admin/products -> Admin Products List
router.get("/admin/products", async (req, res) => {
  try {
    const products = await Products.find().sort({ createdAt: -1 });

    res.render("admin-dashboard", {
      section: "products",
      products,
      user: req.user,
      error: req.query.error,
      message: req.query.message,
      getImageUrl,
      getCropPlaceholder
    });
  } catch (err) {
    console.error("Admin products error:", err);
    res.redirect(`/admin${buildErrorQuery("Unable to fetch products")}`);
  }
});

// GET /admin/products/create -> Create Product Form
router.get("/admin/products/create", (req, res) => {
  res.render("admin-product-form", {
    isEdit: false,
    product: {},
    error: req.query.error
  });
});

// POST /admin/products/create -> Create Product Submit
router.post("/admin/products/create", async (req, res) => {
  try {
    const {
      name,
      category,
      grade,
      description,
      pricePerQuintal,
      oldPrice,
      belowMarketPercent,
      available,
      demandLevel,
      deliveryTimeMin,
      deliveryTimeMax,
      moq,
      supplierName,
      supplierLocation,
      mandiLicense,
      fssaiNumber
    } = req.body;

    if (!name || !category || !pricePerQuintal || !available) {
      return res.redirect(`/admin/products/create${buildErrorQuery("Missing required fields")}`);
    }

    const product = new Products({
      name,
      category,
      grade: grade || "A",
      description,
      pricePerQuintal: parseInt(pricePerQuintal, 10),
      oldPrice: parseInt(oldPrice, 10) || 0,
      belowMarketPercent: parseFloat(belowMarketPercent) || 0,
      moq: parseInt(moq, 10) || 1,
      available: parseInt(available, 10),
      demandLevel: demandLevel || "Medium",
      deliveryTime: {
        minDays: parseInt(deliveryTimeMin, 10) || 1,
        maxDays: parseInt(deliveryTimeMax, 10) || 7
      },
      supplier: {
        name: supplierName || "JD Certified Mandi Farmer",
        location: supplierLocation || "APMC Mandi Hub",
        mandiLicense: mandiLicense || "APMC-GJ-2024-8841",
        fssaiNumber: fssaiNumber || "10020021000142",
        isVerified: true
      },
      tieredPricing: [
        { minQty: 10, discountPercent: 5 },
        { minQty: 25, discountPercent: 10 }
      ],
      images: []
    });

    await product.save();
    res.redirect(`/admin/products?message=${encodeURIComponent("Product created successfully")}`);
  } catch (err) {
    console.error("Create product error:", err);
    res.redirect(`/admin/products/create${buildErrorQuery("Unable to create product")}`);
  }
});

// GET /admin/products/:id/edit -> Edit Product Form
router.get("/admin/products/:id/edit", async (req, res) => {
  try {
    const product = await Products.findById(req.params.id);
    if (!product) {
      return res.redirect(`/admin/products${buildErrorQuery("Product not found")}`);
    }

    res.render("admin-product-form", {
      isEdit: true,
      product,
      error: req.query.error
    });
  } catch (err) {
    console.error("Edit product form error:", err);
    res.redirect(`/admin/products${buildErrorQuery("Unable to load product")}`);
  }
});

// POST /admin/products/:id/update -> Update Product Submit
router.post("/admin/products/:id/update", async (req, res) => {
  try {
    const {
      name,
      category,
      grade,
      description,
      pricePerQuintal,
      oldPrice,
      belowMarketPercent,
      available,
      demandLevel,
      deliveryTimeMin,
      deliveryTimeMax
    } = req.body;

    if (!name || !category || !pricePerQuintal) {
      return res.redirect(`/admin/products/${req.params.id}/edit${buildErrorQuery("Missing required fields")}`);
    }

    await Products.findByIdAndUpdate(
      req.params.id,
      {
        name,
        category,
        grade: grade || "A",
        description,
        pricePerQuintal: parseInt(pricePerQuintal, 10),
        oldPrice: parseInt(oldPrice, 10) || 0,
        belowMarketPercent: parseFloat(belowMarketPercent) || 0,
        available: parseInt(available, 10),
        demandLevel: demandLevel || "Medium",
        deliveryTime: {
          minDays: parseInt(deliveryTimeMin, 10) || 1,
          maxDays: parseInt(deliveryTimeMax, 10) || 7
        }
      },
      { new: true }
    );

    res.redirect(`/admin/products?message=${encodeURIComponent("Product updated successfully")}`);
  } catch (err) {
    console.error("Update product error:", err);
    res.redirect(`/admin/products/${req.params.id}/edit${buildErrorQuery("Unable to update product")}`);
  }
});

// POST /admin/products/:id/delete -> Delete Product
router.post("/admin/products/:id/delete", async (req, res) => {
  try {
    const product = await Products.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.redirect(`/admin/products${buildErrorQuery("Product not found")}`);
    }

    res.redirect(`/admin/products?message=${encodeURIComponent("Product deleted successfully")}`);
  } catch (err) {
    console.error("Delete product error:", err);
    res.redirect(`/admin/products${buildErrorQuery("Unable to delete product")}`);
  }
});

// POST /admin/products/:id/upload-image
router.post("/admin/products/:id/upload-image", upload.single("productImage"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const product = await Products.findById(req.params.id);
    if (!product) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Product not found" });
    }

    const imageEntry = {
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
      uploadedAt: new Date()
    };

    product.images.push(imageEntry);
    await product.save();

    res.json({
      success: true,
      message: "Image uploaded successfully",
      image: imageEntry
    });
  } catch (err) {
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error("File cleanup error:", e);
      }
    }
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// POST /admin/products/:id/delete-image/:imageIndex
router.post("/admin/products/:id/delete-image/:imageIndex", async (req, res) => {
  try {
    const product = await Products.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const imageIndex = parseInt(req.params.imageIndex, 10);
    if (isNaN(imageIndex) || imageIndex < 0 || imageIndex >= product.images.length) {
      return res.status(400).json({ error: "Invalid image index" });
    }

    const image = product.images[imageIndex];
    const filePath = path.join(uploadDir, image.filename);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.warn(`Could not delete file ${filePath}:`, e.message);
    }

    product.images.splice(imageIndex, 1);
    await product.save();

    res.json({
      success: true,
      message: "Image deleted successfully"
    });
  } catch (err) {
    console.error("Delete image error:", err);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// GET /admin/products/:id/images
router.get("/admin/products/:id/images", async (req, res) => {
  try {
    const product = await Products.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({
      success: true,
      images: product.images || []
    });
  } catch (err) {
    console.error("Get images error:", err);
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

// GET /admin/orders
router.get("/admin/orders", async (req, res) => {
  try {
    const page = parsePageValue(req.query.page, 1);
    const limit = ADMIN_ORDER_PAGE_SIZE;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments();
    const totalPages = Math.max(1, Math.ceil(totalOrders / limit));
    const currentPage = Math.min(page, totalPages);

    const orders = await Order.find()
      .populate("user")
      .populate("items.product")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render("admin-dashboard", {
      section: "orders",
      orders,
      user: req.user,
      page: currentPage,
      totalPages,
      totalOrders
    });
  } catch (err) {
    console.error("Admin orders error:", err);
    res.redirect("/admin");
  }
});

// GET /admin/users
router.get("/admin/users", async (req, res) => {
  try {
    const users = await Users.find().sort({ createdAt: -1 });

    res.render("admin-dashboard", {
      section: "users",
      users,
      user: req.user
    });
  } catch (err) {
    console.error("Admin users error:", err);
    res.redirect("/admin");
  }
});

// GET /admin/notifications
router.get("/admin/notifications", async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate("user")
      .sort({ createdAt: -1 })
      .limit(100);

    res.render("admin-dashboard", {
      section: "notifications",
      notifications,
      user: req.user
    });
  } catch (err) {
    console.error("Admin notifications error:", err);
    res.redirect("/admin");
  }
});

module.exports = router;
