/**
 * Input Validation Utilities
 */

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !regex.test(email)) {
    return "Invalid email address";
  }
  return null;
}

function validatePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 10) {
    return "Phone must be at least 10 digits";
  }
  if (digits.length > 12) {
    return "Phone is too long";
  }
  return null;
}

function validatePasswordStrength(password) {
  if (!password || password.length < 6) {
    return "Password must be at least 6 characters";
  }
  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must contain uppercase letter and number";
  }
  return null;
}

function validateDeliveryAddress(address) {
  if (!address || address.trim().length < 10) {
    return "Delivery address must be at least 10 characters";
  }
  return null;
}

function validateQuantity(qty, maxAvailable) {
  const quantity = parseInt(qty, 10);
  if (!Number.isFinite(quantity) || quantity < 1) {
    return "Quantity must be at least 1";
  }
  if (maxAvailable !== undefined && quantity > maxAvailable) {
    return `Only ${maxAvailable} units available`;
  }
  return null;
}

function sanitizeInput(value) {
  if (typeof value !== "string") return value;
  // Strip null bytes and trim
  return value.replace(/\0/g, "").trim();
}

module.exports = {
  validateEmail,
  validatePhone,
  validatePasswordStrength,
  validateDeliveryAddress,
  validateQuantity,
  sanitizeInput
};
