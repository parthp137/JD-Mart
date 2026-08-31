/**
 * Notifications Routes
 */
const express = require("express");
const router = express.Router();
const Notification = require("../models/notification");
const { isLoggedIn } = require("../middleware/auth");
const { parsePageValue } = require("../utils/filters");
const { NOTIFICATION_PAGE_SIZE } = require("../config/constants");

// GET /notifications
router.get("/notifications", isLoggedIn, async (req, res) => {
  try {
    const page = parsePageValue(req.query.page, 1);
    const limit = NOTIFICATION_PAGE_SIZE;

    const filter = { user: req.user._id };
    const readFilter = req.query.filter || "all";

    if (readFilter === "read") {
      filter.read = true;
    } else if (readFilter === "unread") {
      filter.read = false;
    }

    const totalNotifications = await Notification.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalNotifications / limit));
    const currentPage = Math.min(page, totalPages);
    const skip = (currentPage - 1) * limit;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
    const readCount = await Notification.countDocuments({ user: req.user._id, read: true });

    res.render("notifications", {
      notifications,
      user: req.user,
      readFilter,
      unreadCount,
      readCount,
      totalNotifications: unreadCount + readCount,
      page: currentPage,
      totalPages
    });
  } catch (err) {
    console.error("Notifications fetch error:", err);
    res.status(500).render("error", { message: "Error loading notifications" });
  }
});

// POST /notifications/mark-all-read
router.post("/notifications/mark-all-read", isLoggedIn, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true }
    );
    res.redirect("/notifications");
  } catch (err) {
    console.error("Mark all read error:", err);
    res.redirect("/notifications");
  }
});

// POST /notifications/:id/mark-read
router.post("/notifications/:id/mark-read", isLoggedIn, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true }
    );
    res.redirect("/notifications");
  } catch (err) {
    console.error("Mark read error:", err);
    res.redirect("/notifications");
  }
});

// POST /notifications/:id/delete
router.post("/notifications/:id/delete", isLoggedIn, async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    res.redirect("/notifications");
  } catch (err) {
    console.error("Delete notification error:", err);
    res.redirect("/notifications");
  }
});

// POST /notifications/bulk/delete
router.post("/notifications/bulk/delete", isLoggedIn, async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.redirect("/notifications?error=No+notifications+selected");
    }

    await Notification.deleteMany({
      _id: { $in: notificationIds },
      user: req.user._id
    });

    res.redirect("/notifications?message=Notifications+deleted");
  } catch (err) {
    console.error("Bulk delete notifications error:", err);
    res.redirect("/notifications?error=Error+deleting+notifications");
  }
});

module.exports = router;
