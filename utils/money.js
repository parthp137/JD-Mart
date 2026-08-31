/**
 * Money and Pricing Utility Functions
 */

function normalizeMoney(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function formatMoney(value) {
  return `₹${(normalizeMoney(value) / 100).toFixed(2)}`;
}

module.exports = {
  normalizeMoney,
  formatMoney
};
