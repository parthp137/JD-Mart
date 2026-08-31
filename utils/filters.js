/**
 * Product and Route Filtering Utilities
 */

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildProductFilter({ search = "", category = "", priceMin = "", priceMax = "", grade = "", availability = "" } = {}) {
  const filter = {};

  if (category && category !== "all") {
    filter.category = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  }

  if (search) {
    const safeSearch = new RegExp(escapeRegExp(search.trim()), "i");
    filter.$or = [
      { name: safeSearch },
      { description: safeSearch },
      { category: safeSearch }
    ];
  }

  // Price range filter (convert from ₹/kg to paise - 1 rupee = 100 paise)
  const priceFilters = {};
  if (priceMin && !isNaN(priceMin)) {
    priceFilters.$gte = Math.ceil(parseFloat(priceMin) * 100);
  }
  if (priceMax && !isNaN(priceMax)) {
    priceFilters.$lte = Math.floor(parseFloat(priceMax) * 100);
  }
  if (Object.keys(priceFilters).length > 0) {
    filter.pricePerQuintal = priceFilters;
  }

  // Grade filter
  if (grade && grade !== "") {
    filter.grade = grade.toUpperCase();
  }

  // Availability filter
  if (availability === "in-stock") {
    filter.$expr = { $gt: [{ $subtract: ["$available", { $ifNull: ["$reserved", 0] }] }, 0] };
  } else if (availability === "low-stock") {
    filter.$expr = {
      $and: [
        { $lte: [{ $subtract: ["$available", { $ifNull: ["$reserved", 0] }] }, 5] },
        { $gt: [{ $subtract: ["$available", { $ifNull: ["$reserved", 0] }] }, 0] }
      ]
    };
  }

  return filter;
}

function parsePageValue(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildErrorQuery(message) {
  return `?error=${encodeURIComponent(message)}`;
}

module.exports = {
  escapeRegExp,
  buildProductFilter,
  parsePageValue,
  buildErrorQuery
};
