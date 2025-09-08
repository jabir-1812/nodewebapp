// models/Wishlist.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const wishlistSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  addedAt: { type: Date, default: Date.now }
});

// Prevent duplicate product for same user
wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

const Wishlist=mongoose.model('Wishlist',wishlistSchema);
module.exports = Wishlist;

