const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema(
  {
    orderId: { type: String, unique: true }, 
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    shippingAddress: { type: Object, required: true },
    paymentMethod: { type: String, required: true },
    paymentStatus: { type: String, default: "Pending" }, // Paid, Pending, Failed
    refundStatus:{
      type:String,
      enum:["Not Initiated","Partially Refunded","Refunded","Refunded to your wallet"],
      default:"Not Initiated"
    },
    orderStatus: { type: String, default: "Pending" }, // Pending, Shipped, Delivered, Cancelled
    cancelReason:{type:String},
    orderItems: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true },
        mrp:{type:Number,required:true},
        offerDiscount:{type:Number,required:true,default:0},
        couponDiscount:{type:Number,required:true, default:0},
        price: { type: Number, required: true },
        productName: { type: String },
        productImage: { type: String },
        itemStatus: { type: String, default: "Pending" },
        cancelReason:{type:String},
        deliveredOn:{type:Date},
        //  Return-related fields
        returnReason: { type: String },       // Why user returned
        returnStatus: {
          type: String,
          enum: [
            "Requested", 
            "Approved", 
            "Pickup Scheduled",
            "Picked Up",
            "In Transit",
            "Received",
            "Refunded",
            "Replacement Shipped",
            "Rejected"
          ],
          default: null
        },

        returnRequestedAt: { type: Date },    // When user initiated
        returnResolvedAt: { type: Date },     // When admin approved/rejected
        refundStatus: { type: String, enum: ["Not Initiated", "Refunded","Refunded to your wallet"], default: null },
        refundedOn:{type:Date}
      }
      
    ],
    totalMrp:{type:Number,required:true},
    totalOfferDiscount:{type:Number,required:true,default:0},
    totalCouponDiscount:{type:Number,default:0},
    totalPrice:{type:Number,required:true},
    totalAmount: { type: Number, required: true },

    //  Invoice-related fields
    invoice: {
      number: { type: String }, // e.g., INV-2025-0001
      date: { type: Date },
      fileUrl: { type: String }, // optional: store generated PDF URL if you save it
      generated: { type: Boolean, default: false }, // has invoice been created?
    },
    deliveredOn:{type:Date}
  },
  { timestamps: true }
);


const Order = mongoose.model("Order", orderSchema);
module.exports=Order;
