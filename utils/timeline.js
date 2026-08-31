/**
 * Order Status Timeline Utilities
 */

function getOrderTimeline(status, existingTimeline = []) {
  const timeline = Array.isArray(existingTimeline) ? existingTimeline.filter(Boolean) : [];
  if (!timeline.some(entry => entry.status === "Placed")) {
    timeline.unshift({ status: "Placed", date: new Date() });
  }
  if (!timeline.some(entry => entry.status === "Confirmed")) {
    timeline.push({ status: "Confirmed", date: new Date() });
  }
  if (status && !timeline.some(entry => entry.status === status)) {
    timeline.push({ status, date: new Date() });
  }
  return timeline.map(entry => ({
    status: entry.status,
    date: entry.date || entry.timestamp || new Date()
  }));
}

module.exports = {
  getOrderTimeline
};
