const Products = require("../models/product");
const getDashboardStats = require("../models/dashboardStat");
const { buildProductFilter, parsePageValue } = require("../utils/filters");
const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require("../config/constants");

const redirectToProducts = (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect("/products");
  }
  res.redirect("/login");
};

const redirectListings = (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  res.redirect(`/products${query ? `?${query}` : ""}`);
};

const getProducts = async (req, res, next) => {
  try {
    const page = parsePageValue(req.query.page, 1);
    const limit = Math.min(parsePageValue(req.query.limit, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const search = (req.query.search || "").trim();
    const category = (req.query.category || "").trim();
    const priceMin = req.query.priceMin || "";
    const priceMax = req.query.priceMax || "";
    const grade = req.query.grade || "";
    const availability = req.query.availability || "";
    const sortBy = ["newest", "price-low", "price-high", "demand"].includes(req.query.sort)
      ? req.query.sort
      : "newest";

    const sort = {
      newest: { createdAt: -1 },
      "price-low": { pricePerQuintal: 1 },
      "price-high": { pricePerQuintal: -1 },
      demand: { demandLevel: -1, createdAt: -1 }
    }[sortBy];

    const filter = buildProductFilter({ search, category, priceMin, priceMax, grade, availability });
    const totalProducts = await Products.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalProducts / limit));
    const currentPage = Math.min(page, totalPages);
    const skip = (currentPage - 1) * limit;

    const allProducts = await Products.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const dashboardStats = await getDashboardStats();

    res.render("index.ejs", {
      allProducts,
      dashboardStats,
      search,
      category,
      priceMin,
      priceMax,
      grade,
      availability,
      sortBy,
      page: currentPage,
      totalPages,
      totalProducts,
      limit
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    next(err);
  }
};

const getProductDetail = async (req, res, next) => {
  try {
    const product = await Products.findById(req.params.id);
    if (!product) {
      return res.redirect("/products");
    }
    res.render("show.ejs", {
      product,
      error: req.query.error,
      message: req.query.message
    });
  } catch (err) {
    console.error("Product detail fetch error:", err);
    res.redirect("/products");
  }
};

module.exports = {
  redirectToProducts,
  redirectListings,
  getProducts,
  getProductDetail
};
