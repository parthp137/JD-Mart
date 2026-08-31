/**
 * Authentication and Authorization Middlewares
 */

function isLoggedIn(req, res, next) {
  if (!req.user) {
    return res.redirect("/login");
  }
  next();
}

function isAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).render("error", { message: "Access denied: Admin privileges required." });
  }
  next();
}

module.exports = {
  isLoggedIn,
  isAdmin
};
