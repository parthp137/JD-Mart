process.env.NODE_ENV = "test";
const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../app");

const utils = app.__utils;

test("normalizeMoney rounds and coerces values", () => {
  assert.equal(utils.normalizeMoney("1250"), 1250);
  assert.equal(utils.normalizeMoney(1250.4), 1250);
  assert.equal(utils.normalizeMoney(null), 0);
});

test("formatMoney converts minor units to rupees", () => {
  assert.equal(utils.formatMoney(1250), "₹12.50");
  assert.equal(utils.formatMoney("300"), "₹3.00");
});

test("buildErrorQuery encodes messages safely", () => {
  assert.equal(utils.buildErrorQuery("Hello world"), "?error=Hello%20world");
});

test("buildProductFilter supports search and category", () => {
  const filter = utils.buildProductFilter({ search: "wheat", category: "grains" });

  assert.equal(filter.category, "Grains");
  assert.ok(Array.isArray(filter.$or));
  assert.equal(filter.$or.length, 3);
});

test("getOrderTimeline always includes placed and confirmed entries", () => {
  const timeline = utils.getOrderTimeline("Delivered");

  assert.ok(timeline.some((entry) => entry.status === "Placed"));
  assert.ok(timeline.some((entry) => entry.status === "Confirmed"));
  assert.ok(timeline.some((entry) => entry.status === "Delivered"));
});
