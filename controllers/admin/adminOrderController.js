const Order=require('../../models/orderSchema');
const User=require('../../models/userSchema');
const Wallet=require('../../models/walletSchema')
const Product=require('../../models/productSchema')
const {generateInvoiceNumber}=require('../../utils/invoice')



const listAllOrders=async (req,res)=>{
    try {
        let { page = 1, limit = 10, search = "", status = "", sort = "newest" } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        const query = {};

        //  Search (orderId OR user name/email)
        if (search) {
        const users = await User.find({
            $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } }
            ]
        }).select("_id");

        const userIds = users.map(u => u._id);

        query.$or = [
            { orderId: { $regex: search, $options: "i" } },
            { userId: { $in: userIds } }
        ];
        }

        //  Filter by status
        if (status) {
        query.orderStatus = status;
        }

        //  Sorting
        let sortOption = { createdAt: -1 }; // default newest
        if (sort === "oldest") sortOption = { createdAt: 1 };
        if (sort === "amountAsc") sortOption = { totalAmount: 1 };
        if (sort === "amountDesc") sortOption = { totalAmount: -1 };

        // Pagination
        const totalOrders = await Order.countDocuments(query);
        const orders = await Order.find(query)
        .populate("userId", "name email")
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

        res.render("admin/order/orders", {
        title: "All Orders",
        orders,
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        search,
        status,
        sort
        });
    } catch (error) {
        console.log('listAllOrders()   error======>',error)
        res.redirect('page-error')
    }
}



const getOrderDetails=async (req,res)=>{
    try {
        const order = await Order.findById(req.params.orderId)
      .populate("userId", "name email phone")
      .lean();

    res.render("admin/order/order-details", { order, title: "Order Details" });
    } catch (error) {
        console.log("getOrderDetails() error=====>",error);
        res.redirect('/page-error')
    }
}

// Update item status in an order
const updateItemStatus = async (req, res) => {
    try {
        const { orderId, itemId, status } = req.body;

        // Find the order
        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        // Find item inside order
        const item = order.orderItems.id(itemId);
        if (!item) return res.status(404).json({ success: false, message: "Item not found" });

        // Update status
        item.itemStatus = status;
        if(status==="Delivered"){
            item.deliveredOn=new Date();
        }

        // --- Update overall orderStatus based on items ---
        const allStatuses = order.orderItems.map(i => i.itemStatus);

        if (allStatuses.every(s => s === "Cancelled")) {
            order.orderStatus = "Cancelled";
        } else if (allStatuses.every(s => s === "Delivered")) {
            order.orderStatus = "Delivered";
            order.deliveredOn=new Date();
            order.paymentStatus="Paid";
        } else if (allStatuses.some(s => s === "Shipped")) {
            order.orderStatus = "Partially Shipped";
        } else {
            order.orderStatus = "Pending";
        }

        // --- 🔑 Invoice logic ---
        if (!order.invoice?.generated) {
            const hasShippedOrDelivered = order.orderItems.some(
                (i) => i.itemStatus === "Shipped" || i.itemStatus === "Delivered"
            );

            if (hasShippedOrDelivered) {
                order.invoice = {
                    number: await generateInvoiceNumber(), // custom function
                    date: new Date(),
                    generated: true,
                };
            }
        }

        await order.save();

        res.json({ 
            success: true, 
            message: "Status updated", 
            orderStatus: order.orderStatus,
            invoiceGenerated: order.invoice?.generated || false 
        });
    } catch (error) {
        console.log("updateItemStatus error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};



const manageReturnRequest=async (req,res)=>{
     try {
        const { orderId, itemId, action } = req.params; // action = approve | reject

        const order = await Order.findOneAndUpdate(
        { orderId: orderId, "orderItems._id": itemId },
        { $set: { "orderItems.$.returnStatus": action === "approve" ? "Approved" : "Rejected" } },
        { new: true }
        );

        res.json({ success: true, status: action });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
}

const updateReturnStatus=async(req,res)=>{
  try {
    const { orderId, itemId, status } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) return res.json({ success: false, message: "Order not found" });

    const item = order.orderItems.id(itemId);
    console.log("item=====>",item)
    if (!item) return res.json({ success: false, message: "Item not found" });

    if(item.refundStatus==="Refunded"){
        return res.json({success:false,message:"Already refunded"})
    }

    item.returnStatus = status;

    if (status === "Refunded") {
        await Product.findByIdAndUpdate(item.productId, {
            $inc: { quantity: item.quantity }  // increase stock back
        });
      const refundAmount = item.price * item.quantity; // TODO: adjust for discounts

      if (order.paymentMethod === "Cash on Delivery") {
        // ✅ COD → refund to wallet
        let wallet = await Wallet.findOne({ userId: order.userId });
        if (!wallet) {
          wallet = new Wallet({ userId: order.userId, balance: 0, transactions: [] });
        }

        wallet.balance += refundAmount;
        wallet.transactions.push({
          amount: refundAmount,
          type: "credit",
          description: `Refund for ${item.productName} (Order ${order.orderId})`
        });

        await wallet.save();
        item.refundStatus="Refunded";
        item.refundedOn= new Date();
      } else if (order.paymentMethod === "Online Payment" && paymentStatus==="Paid") {
        // ✅ Online payment → just mark refunded (no wallet credit)
        item.refundStatus = "Refunded";
        item.refundedOn = new Date();
      }
    }

    await order.save();
    res.json({ success: true });

  }catch (error) {
    console.error("updateReturnStatus() error=====>",error);
    res.json({ success: false, message: "Error updating return status" });
  }
}


module.exports={
    listAllOrders,
    getOrderDetails,
    updateItemStatus,
    manageReturnRequest,
    updateReturnStatus
}
