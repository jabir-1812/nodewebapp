// utils/orderIdGenerator.js
const Counter = require("../models/counter");

async function getNextOrderId() {
  const counter = await Counter.findOneAndUpdate(
    { name: "order" },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  // Format: ORD2025XXXXXX
  const orderNumber = counter.value.toString().padStart(6, "0"); // 000001, 000002...
  return `ORD${new Date().getFullYear()}${orderNumber}`;
}

module.exports = getNextOrderId;
