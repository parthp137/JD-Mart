/**
 * Central Error Handler Middleware
 */
const { DEBUG_MODE } = require("../config/constants");

function notFoundHandler(req, res) {
  res.status(404).render("error", {
    message: "Page not found (404). The requested resource does not exist."
  });
}

function errorHandler(err, req, res, next) {
  console.error("Unhandled Error:", err);
  
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || 500;
  const message = DEBUG_MODE 
    ? err.message || "An internal server error occurred."
    : "Something went wrong. Please try again later.";

  res.status(statusCode).render("error", {
    message
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
