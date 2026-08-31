/**
 * MongoDB Database Connection Manager
 */
const mongoose = require("mongoose");
const { MONGO_URL } = require("./constants");

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("Connected to MongoDB successfully");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
    throw err;
  }
}

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected. Attempting reconnect...");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error event:", err);
});

module.exports = {
  connectDB,
  MONGO_URL
};
