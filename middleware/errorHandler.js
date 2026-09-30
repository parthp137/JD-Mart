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
  if (!err.isOperational) {
    console.error("Unhandled Application Error:", err);
  }

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || 500;
  
  let message;
  if (err.isOperational) {
    message = err.message;
  } else {
    message = DEBUG_MODE 
      ? err.message || "An internal server error occurred."
      : "Something went wrong. Please try again later.";
  }

  res.status(statusCode).render("error", {
    message
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
