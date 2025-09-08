const Cart=require('../../models/cartSchema')
const Address=require('../../models/addressSchema')
const Product=require('../../models/productSchema')
const Order=require('../../models/orderSchema')
const getNextOrderId=require('../../utils/orderIdGenerator')
const User = require('../../models/userSchema')
const PDFDocument = require("pdfkit");

const placeOrder=async (req,res)=>{
    try {
        // console.log("cartId:",req.body.cartId)
        // console.log("payment:",req.body.paymentMethod)
        // console.log("addressId",req.body.addressId)
        const userId=req.session.user || req.session.passport?.user;
        const {cartId,addressId,paymentMethod}=req.body;
        if(!cartId) return res.status(400).json({message:"Cart not found"})
        
        const cart=await Cart.findById(cartId).populate('items.productId');
        if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

        
         // 2. Check each item against product stock
        for (let item of cart.items) {
            const product = await Product.findById(item.productId._id);

            if (!product) {
                return res.status(400).json({
                success: false,
                message: `Product not found for cart item ${item._id}`,
                });
            }

            // ❌ if stock is zero, don’t allow order
            if (product.quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `${product.productName} is out of stock`,
                    productId: product._id,
                });
            }

            if (item.quantity > product.quantity) {

                return res.status(400).json({
                success: false,
                message: `Not enough stock for ${product.productName}. Available: ${product.quantity}, Requested: ${item.quantity}`,
                productId: product._id,
                });
            }
        }

        // 2. Fetch address and copy it
        const userAddressDoc = await Address.findOne(
            { userId, "address._id": addressId },
            { "address.$": 1 }
        );
        if (!userAddressDoc || userAddressDoc.address.length === 0) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }
        const selectedAddress = userAddressDoc.address[0];


        // 4. Prepare order items with itemStatus
        const orderItems = cart.items.map((item) => ({
            productId: item.productId._id,
            quantity: item.quantity,
            price: item.productId.salePrice,
            productName: item.productId.productName,
            productImage: item.productId.productImage[0],
            itemStatus: "Pending" // 👈 every product starts as "Placed"
        }));

        const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

        // 🔑 Generate custom order ID
        const customOrderId = await getNextOrderId();

        // 5. Create order
        const newOrder = new Order({
            orderId: customOrderId,
            userId,
            shippingAddress: selectedAddress.toObject(),
            paymentMethod,
            paymentStatus: "Pending", // update after payment success
            orderStatus: "Pending",
            orderItems,
            totalAmount
        });

        await newOrder.save();

        // 6. Reduce stock
        for (let item of cart.items) {
            await Product.findByIdAndUpdate(item.productId._id, {
                $inc: { quantity: -item.quantity }
            });
        }

        // 7. Clear cart
        await Cart.findByIdAndUpdate(cartId, { $set: { items: [] } });
        console.log("newOrder===>orderId====>",newOrder);

        res.json({ success: true, message: "Order placed successfully", orderId: newOrder.orderId });
    } catch (error) {
        console.log("orderController / placeOrder() error:",error);

    }
}


const showOrderSuccessPage=async (req,res)=>{
    try {
        const userId=req.session.user || req.session.passport?.user;
        const userData=await User.findById(userId)
        const order=await Order.findOne({orderId:req.params.orderId});
        if(!order) return res.redirect('/page-not-found')

        res.render('user/order-success',{
            title:"Order success",
            order,
            cartLength:null,
            user:userData

        })
    } catch (error) {
        console.log("showOrderSuccessPage() error====>",error);
        res.redirect("/page-not-found")
    }
}



const showOrders = async (req, res) => {
    try {
        const userId = req.session.user || req.session.passport?.user;
        const userData = await User.findById(userId);

        // Pagination
        const page = parseInt(req.query.page) || 1;  
        const limit = 5;  // orders per page
        const skip = (page - 1) * limit;

        // Search
        const searchQuery = req.query.search?.trim() || "";

        // Fetch orders
        const orders = await Order.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Flatten items + add order-level info
        let orderItems = [];
        orders.forEach(order => {
            // ✅ Check if all items are still pending
            const allPending = order.orderItems.every(i => i.itemStatus === "Pending");

            // ✅ If even one is shipped/delivered, hide cancel-whole-order
            const anyShippedOrDelivered = order.orderItems.some(i =>
                ["Shipped", "Out for Delivery", "Delivered"].includes(i.itemStatus)
            );

            order.canCancelWholeOrder = allPending && !anyShippedOrDelivered;

            order.orderItems.forEach(item => {
                // Filter by search query
                if (
                    !searchQuery ||
                    order.orderId.toString().includes(searchQuery) ||
                    item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.itemStatus.toLowerCase().includes(searchQuery.toLowerCase())
                ) {
                    orderItems.push({
                        orderId: order.orderId,
                        createdAt: order.createdAt,
                        orderStatus: order.orderStatus,
                        paymentMethod: order.paymentMethod,
                        totalAmount: order.totalAmount,
                        shippingAddress: order.shippingAddress,
                        item,
                        canCancelWholeOrder: order.canCancelWholeOrder   // ✅ pass flag
                    });
                }
            });
        });

        // Get total orders for pagination
        const totalOrders = await Order.countDocuments({ userId });
        const totalPages = Math.ceil(totalOrders / limit);

        res.render("user/profile/order/orders", {
            title: "My Orders",
            user: userData,
            cartLength: null,
            orderItems,
            currentPage: page,
            totalPages,
            searchQuery
        });

    } catch (error) {
        console.log("showOrders() error====>", error);
        res.redirect("/page-not-found");
    }
};


const showOrderDetails=async(req,res)=>{
    try {
        const userId=req.session.user || req.session.passport?.user;
        const userData=await User.findById(userId)

        const orderId = req.params.orderId;

        const order = await Order.findOne({ orderId, userId }).lean();
        if (!order) return res.redirect("/page-not-found");

        res.render("user/profile/order/order-details", {
        title: "Order Details",
        order,
        user:userData,
        cartLength:''
        });

    } catch (error) {
        console.log("showOrderDetails() error======>",error)
        res.redirect("/page-not-found")
    }
}

// helper
async function restoreStock(orderItems) {
  const updates = orderItems
    .filter(item => item.itemStatus === "Pending")
    .map(item => {
      item.itemStatus = "Cancelled";
      return Product.findByIdAndUpdate(item.productId, {
        $inc: { quantity: item.quantity }
      });
    });

  return Promise.all(updates);
}


// Cancel a single product in an order
const cancelOrderItem = async (req, res) => {
  try {
    const userId = req.session.user || req.session.passport?.user;
    if (!userId) return res.status(401).json({ success: false, message: "Login required" });

    const { orderId, itemId } = req.body;

    const order = await Order.findOne({ orderId, userId });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const item = order.orderItems.id(itemId); // find subdocument
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    if (item.itemStatus !== "Pending") {
      return res.status(400).json({ success: false, message: "Item cannot be cancelled at this stage" });
    }


    await restoreStock([item]);

    // ✅ check if ALL items are cancelled
    const allCancelled = order.orderItems.every(i => i.itemStatus === "Cancelled");
    if (allCancelled) {
    order.orderStatus = "Cancelled";
    } else if (order.orderItems.some(i => i.itemStatus === "Cancelled")) {
    order.orderStatus = "Partially Cancelled";
    }


    await order.save();

    res.json({ success: true, message: "Item cancelled successfully" });
  } catch (error) {
    console.log("cancelOrderItem() error =>", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};


// Cancel entire order
const cancelWholeOrder = async (req, res) => {
  try {
    const userId = req.session.user || req.session.passport?.user;
    if (!userId) return res.status(401).json({ success: false, message: "Login required" });

    const { orderId } = req.body;

    const order = await Order.findOne({ orderId, userId });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // ❌ Extra safety: block if any shipped/delivered items exist
    if (order.orderItems.some(i => ["Shipped", "Delivered"].includes(i.itemStatus))) {
      return res.status(400).json({ success: false, message: "Some items are already shipped/delivered. Order cannot be cancelled." });
    }

    if (!["Pending", "Partially Cancelled"].includes(order.orderStatus)) {
        return res.status(400).json({ success: false, message: "Order cannot be cancelled at this stage" });
    }


    await restoreStock(order.orderItems);

    // update status
    const allCancelled = order.orderItems.every(i => i.itemStatus === "Cancelled");
    order.orderStatus = allCancelled ? "Cancelled" : "Partially Cancelled";

    await order.save();
    res.json({ success: true, message: "Order cancelled and stock updated" });

  } catch (error) {
    console.log("cancelWholeOrder() error =>", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};


const getInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("userId");
    if (!order) return res.status(404).send("Order not found");
    if (!order.invoice?.generated) return res.status(400).send("Invoice not generated yet");

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${order.invoice.number}.pdf`);

    // Create PDF
    const doc = new PDFDocument();
    doc.pipe(res);

    // Header
    doc.fontSize(18).text("Invoice", { align: "center" });
    doc.moveDown();

    // Invoice info
    doc.fontSize(12).text(`Invoice Number: ${order.invoice.number}`);
    doc.text(`Invoice Date: ${order.invoice.date.toDateString()}`);
    doc.text(`Order ID: ${order.orderId}`);
    doc.moveDown();

    // Buyer info
    doc.text(`Customer: ${order.userId.name}`);
    doc.text(`Shipping Address: ${order.shippingAddress.street}, ${order.shippingAddress.city}`);
    doc.moveDown();

    // Items
    doc.text("Items:");
    order.orderItems.forEach(item => {
      doc.text(`${item.productName} - Qty: ${item.quantity} - Price: ₹${item.price}`);
    });
    doc.moveDown();

    // Total
    doc.fontSize(14).text(`Total Amount: ₹${order.totalAmount}`, { align: "right" });

    // End and send
    doc.end();
  } catch (error) {
    console.error("getInvoice error:", error);
    res.status(500).send("Internal server error");
  }
};


const returnOrderItem = async (req, res) => {
  try {
    const { orderId, itemId, reason } = req.body;
    const userId = req.session.user || req.session.passport?.user;

    const order = await Order.findOne({ orderId, userId });
    if (!order) return res.json({ success: false, message: "Order not found" });

    const item = order.orderItems.id(itemId);
    if (!item) return res.json({ success: false, message: "Item not found" });

    if (item.itemStatus !== "Delivered") {
      return res.json({ success: false, message: "Only delivered items can be returned" });
    }

    
    item.returnStatus = "Requested";
    item.returnReason = reason;
    item.returnRequestedAt = new Date();

    await order.save();

    // You could also notify admin/seller here
    res.json({ success: true, message: "Return request submitted" });
  } catch (error) {
    console.error("returnOrderItem() error:", error.message, error.stack);
    res.json({ success: false, message: "Something went wrong" });
  }
};





module.exports={
    placeOrder,
    showOrders,
    showOrderSuccessPage,
    showOrderDetails,
    cancelOrderItem,
    cancelWholeOrder,
    getInvoice,
    returnOrderItem
}

