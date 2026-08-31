/**
 * Template Locals and Global Context Middleware
 */
const Users = require("../models/user");
const Cart = require("../models/cart");
const Notification = require("../models/notification");
const { getImageUrl, getCropPlaceholder } = require("../utils/image");
const { formatMoney, normalizeMoney } = require("../utils/money");
const { DEFAULT_PAGE_SIZE } = require("../config/constants");

async function setupLocals(req, res, next) {
  res.locals.user = null;
  res.locals.cartCount = 0;
  res.locals.notificationCount = 0;
  res.locals.search = "";
  res.locals.category = "all";
  res.locals.page = 1;
  res.locals.totalPages = 1;
  res.locals.totalProducts = 0;
  res.locals.limit = DEFAULT_PAGE_SIZE;
  res.locals.getImageUrl = getImageUrl;
  res.locals.getCropPlaceholder = getCropPlaceholder;
  res.locals.formatMoney = formatMoney;
  res.locals.normalizeMoney = normalizeMoney;
  res.locals.error = req.query.error || null;
  res.locals.message = req.query.message || null;

  if (req.session && req.session.userId) {
    try {
      req.user = await Users.findById(req.session.userId);
      res.locals.user = req.user;

      if (req.user) {
        // Fetch user's cart count
        const cart = await Cart.findOne({ user: req.user._id });
        if (cart) {
          res.locals.cartCount = cart.getTotalQuantity();
        }

        // Fetch user's unread notifications count
        const unreadCount = await Notification.countDocuments({
          user: req.user._id,
          read: false
        });
        res.locals.notificationCount = unreadCount;
      }
    } catch (err) {
      console.error("Locals middleware user fetch error:", err);
    }
  }

  next();
}

module.exports = {
  setupLocals
};
