const mongoose = require("mongoose");
const Product = require("./product");

const getDashboardStats = async () => {
  const stats = await Product.aggregate([
    {
      $facet: {
        totalCategories: [
          { $group: { _id: "$category" } }, 
          { $count: "count" }
        ],
        inStock: [
          { $match: { available: { $gt: 0 } } },
          { $count: "count" }
        ],
        belowMarket: [
          { $match: { belowMarketPercent: { $gt: 0 } } },
          { $count: "count" }
        ],
        gradeA: [
          { $match: { grade: "A" } },
          { $count: "count" }
        ]
      }
    }
  ]);
  return stats[0];
};

module.exports = getDashboardStats;
