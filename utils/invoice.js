// utils/invoice.js
const Counter = require("../models/counter");

async function generateInvoiceNumber() {
    const counter = await Counter.findOneAndUpdate(
        { name: "invoice" },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
    );
    return `INV-${new Date().getFullYear()}-${counter.value}`;
}

module.exports = { generateInvoiceNumber };
