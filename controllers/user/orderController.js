const Cart=require('../../models/cartSchema')
const Address=require('../../models/addressSchema')
const Product=require('../../models/productSchema')
const Order=require('../../models/orderSchema')
const getNextOrderId=require('../../utils/orderIdGenerator')
const User = require('../../models/userSchema')
const PDFDocument = require("pdfkit");
const Razorpay=require('razorpay')
const crypto = require('crypto')
const Wallet = require('../../models/walletSchema')
require('dotenv').config();

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // means: we expect this type of error
  }
}


const razorpay=new Razorpay({
  key_id:process.env.RAZORPAY_KEY_ID,
  key_secret:process.env.RAZORPAY_KEY_SECRET
})

async function prepareCartForOrder(userId, cartId) {
    if (!cartId) throw new AppError("Cart not found");

    const cart = await Cart.findById(cartId).populate('items.productId');
    if (!cart) throw new AppError("Cart not found",404);

    // Check each item against product stock
    for (let item of cart.items) {
        const product = await Product.findById(item.productId._id);
        if (!product) throw new AppError(`Product not found for cart item ${item._id}`);

        //if stock is zero, don't allow order
        if (product.quantity <= 0) throw new AppError(`${product.productName} is out of stock`);
        if (item.quantity > product.quantity) {
            throw new AppError(`Not enough stock for ${product.productName}. Available: ${product.quantity}, Requested: ${item.quantity}`);
        }
    }

    // Prepare order items with itemStatus
    const orderItems = cart.items.map(item => ({
        productId: item.productId._id,
        productName: item.productId.productName,
        productImage: item.productId.productImage[0],
        quantity: item.quantity,
        price: item.productId.salePrice,
        itemStatus: "Pending" // 👈 every product starts as "Pending"
    }));

    const totalAmount = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
	console.log("totalAmout======>",totalAmount)

    return { cart, orderItems, totalAmount };
}





const createRazorPayOrder = async(req,res)=>{
	try {
		const userId=req.session.user || req.session.passport?.user;
		const {cartId}=req.body;
		if(!cartId) return res.status(400).json({message:"Cart not found"})

		// const cart=await Cart.findById(cartId).populate('items.productId');
		// if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

		
		//   // 2. Check each item against product stock
		// for (let item of cart.items) {
		//     const product = await Product.findById(item.productId._id);

		//     if (!product) {
		//         return res.status(400).json({
		//         success: false,
		//         message: `Product not found for cart item ${item._id}`,
		//         });
		//     }

		//     // ❌ if stock is zero, don’t allow order
		//     if (product.quantity <= 0) {
		//         return res.status(400).json({
		//             success: false,
		//             message: `${product.productName} is out of stock`,
		//             productId: product._id,
		//         });
		//     }

		//     if (item.quantity > product.quantity) {

		//         return res.status(400).json({
		//         success: false,
		//         message: `Not enough stock for ${product.productName}. Available: ${product.quantity}, Requested: ${item.quantity}`,
		//         productId: product._id,
		//         });
		//     }
		// }

		// // 4. Prepare order items with itemStatus
		// const orderItems = cart.items.map((item) => ({
		//     quantity: item.quantity,
		//     price: item.productId.salePrice,
		// }));

		// const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

		const {orderItems,totalAmount} = await prepareCartForOrder(userId,cartId)
		
		// 🔑 Generate custom order ID
		const customOrderId = await getNextOrderId();

		const options={
			amount:totalAmount*100,
			currency:"INR",
			receipt:customOrderId
		}
		console.log("option.amount=====>",options.amount)
		const order =await razorpay.orders.create(options);
		res.json({order,teeSpaceOrderId:customOrderId});
	} catch (error) {
		console.log("createRazorPayOrder() error=====>",error);
		if(error.isOperational){
		// ❌ Known error, safe to show to user
		return res.status(error.statusCode).json({ success: false, message: error.message });
		}

		// ❌ Unknown/internal error
		return res.status(500).json({
		success: false,
		message: "Something went wrong. Please try again later."
		});
	}
}


const verifyRazorpayPayment = async (req,res)=>{
	try {
		const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =req.body;

		const sign = razorpay_order_id + "|" + razorpay_payment_id;
		const expectedSign = crypto
			.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
			.update(sign.toString())
			.digest("hex");

		if (razorpay_signature === expectedSign) {
			res.json({ success: true, message: "Payment verified successfully" });
		} else {
			res.json({ success: false, message: "Payment verification failed" });
		}
	} catch (error) {
		console.log("verifyRazorpayPayment() error===>",error)
	}
}

const placeOnlinePaidOrder = async(req,res)=>{
	try {
		const userId=req.session.user || req.session.passport?.user;
        const {cartId,addressId,paymentMethod,orderId}=req.body;

		const cart = await Cart.findById(cartId).populate('items.productId');

		// Prepare order items with itemStatus
		const orderItems = cart.items.map(item => ({
			productId: item.productId._id,
			productName: item.productId.productName,
			productImage: item.productId.productImage[0],
			quantity: item.quantity,
			price: item.productId.salePrice,
			itemStatus: "Pending" // 👈 every product starts as "Pending"
		}));

		const totalAmount = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

		const userAddressDoc = await Address.findOne(
            { userId, "address._id": addressId },
            { "address.$": 1 }
        );

		if (!userAddressDoc || userAddressDoc.address.length === 0) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }
        const selectedAddress = userAddressDoc.address[0];

		// 5. Create order
        const newOrder = new Order({
            orderId: orderId,
            userId,
            shippingAddress: selectedAddress.toObject(),
            paymentMethod:"Online Payment",
            paymentStatus: "Paid", // update after payment success
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
		res.json({ success: true, message: "Order placed successfully", orderId: newOrder.orderId });

	} catch (error) {
		console.log("placeOnlinePaidOrder() error====>",error);
		res.json({success:false,message:"Something went wrong"})
	}
}

const place_cod_order=async (req,res)=>{
    try {
        // console.log("cartId:",req.body.cartId)
        // console.log("payment:",req.body.paymentMethod)
        // console.log("addressId",req.body.addressId)
        const userId=req.session.user || req.session.passport?.user;
        const {cartId,addressId,paymentMethod}=req.body;
        const {cart,orderItems,totalAmount}=await prepareCartForOrder(userId,cartId)
        // if(!cartId) return res.status(400).json({message:"Cart not found"})
        
        // const cart=await Cart.findById(cartId).populate('items.productId');
        // if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

        
         // 2. Check each item against product stock
        // for (let item of cart.items) {
        //     const product = await Product.findById(item.productId._id);

        //     if (!product) {
        //         return res.status(400).json({
        //         success: false,
        //         message: `Product not found for cart item ${item._id}`,
        //         });
        //     }

            // ❌ if stock is zero, don’t allow order
            // if (product.quantity <= 0) {
            //     return res.status(400).json({
            //         success: false,
            //         message: `${product.productName} is out of stock`,
            //         productId: product._id,
            //     });
            // }

            // if (item.quantity > product.quantity) {

            //     return res.status(400).json({
            //     success: false,
            //     message: `Not enough stock for ${product.productName}. Available: ${product.quantity}, Requested: ${item.quantity}`,
            //     productId: product._id,
            //     });
            // }
        // }

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
        // const orderItems = cart.items.map((item) => ({
        //     productId: item.productId._id,
        //     quantity: item.quantity,
        //     price: item.productId.salePrice,
        //     productName: item.productId.productName,
        //     productImage: item.productId.productImage[0],
        //     itemStatus: "Pending" // 👈 every product starts as "Pending"
        // }));

        // const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

        // 🔑 Generate custom order ID
        const customOrderId = await getNextOrderId();

        // 5. Create order
        const newOrder = new Order({
            orderId: customOrderId,
            userId,
            shippingAddress: selectedAddress.toObject(),
            paymentMethod:"Cash on Delivery",
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
        console.error("orderController / placeOrder() error:",error);
        if(error.isOperational){
          // ❌ Known error, safe to show to user
          return res.status(error.statusCode).json({ success: false, message: error.message });
        }

        // ❌ Unknown/internal error
        return res.status(500).json({
          success: false,
          message: "Something went wrong. Please try again later."
        });

    }
}

const placeWalletPaidOrder = async (req,res)=>{
  try {
      const userId=req.session.user || req.session.passport?.user;
      const userWallet=await Wallet.findOne({userId})
      if(!userWallet)return res.status(500).json({success:false,message:"Your wallet is not found"})

      
      const {cartId,addressId,paymentMethod}=req.body;
      const {cart,orderItems,totalAmount}=await prepareCartForOrder(userId,cartId)

      // 2. Fetch address and copy it
      const userAddressDoc = await Address.findOne(
          { userId, "address._id": addressId },
          { "address.$": 1 }
      );
      if (!userAddressDoc || userAddressDoc.address.length === 0) {
          return res.status(404).json({ success: false, message: "Address not found" });
      }
      const selectedAddress = userAddressDoc.address[0];


      // 🔑 Generate custom order ID
      const customOrderId = await getNextOrderId();

      userWallet.balance-=totalAmount;
      userWallet.transactions.push({
        amount:totalAmount,
        type:"debit",
        description:`Paid for ${customOrderId}`
      })

      // 5. Create order
      const newOrder = new Order({
          orderId: customOrderId,
          userId,
          shippingAddress: selectedAddress.toObject(),
          paymentMethod:"TeeSpace Wallet",
          paymentStatus: "Paid", // update after payment success
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

      await userWallet.save();

      // 7. Clear cart
      await Cart.findByIdAndUpdate(cartId, { $set: { items: [] } });
      console.log("newOrder===>orderId====>",newOrder);

      res.json({ success: true, message: "Order placed successfully", orderId: newOrder.orderId });
  } catch (error) {
      console.error("orderController / placeOrder() error:",error);
      if(error.isOperational){
        // ❌ Known error, safe to show to user
        return res.status(error.statusCode).json({ success: false, message: error.message });
      }

      // ❌ Unknown/internal error
      return res.status(500).json({
        success: false,
        message: "Something went wrong. Please try again later."
      });

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
  console.log("orderItems===>",orderItems);
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
    if (!userId) {
      return res.status(401).json({ success: false, message: "Login required" });
    }

    const { orderId, itemId } = req.body;

    const order = await Order.findOne({ orderId, userId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const item = order.orderItems.id(itemId); // find subdocument
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    if (item.itemStatus !== "Pending") {
      return res.status(400).json({ success: false, message: "Item cannot be cancelled at this stage" });
    }

    //  Restore stock
    await restoreStock([item]);

    //  Update item refund status (only if paid & online)
    if (order.paymentMethod === "Online Payment" && order.paymentStatus === "Paid") {
      item.refundStatus = "Refunded";
      item.refundedOn=new Date();
    }

    if(order.paymentMethod === "TeeSpace Wallet" && order.paymentStatus === "Paid"){
      const userWallet=await Wallet.findOne({userId})
      userWallet.balance+=item.price;
      userWallet.transactions.push({
        amount:item.price,
        type:"credit",
        description:`Refund for ${item.productName} (Order ${order.orderId})`
      });
      await userWallet.save();
      item.refundStatus = "Refunded";
      item.refundedOn = new Date();
    }

    //  Update order status
    const allCancelled = order.orderItems.every(i => i.itemStatus === "Cancelled");
    const someCancelled = order.orderItems.some(i => i.itemStatus === "Cancelled");

    if (allCancelled) {
      order.orderStatus = "Cancelled";
    } else if (someCancelled) {
      order.orderStatus = "Partially Cancelled";
    }

    //  Update order refund summary
    const allRefunded = order.orderItems.every(i => i.refundStatus === "Refunded");
    const someRefunded = order.orderItems.some(i => i.refundStatus === "Refunded");

    if (allRefunded) {
      order.refundStatus = "Refunded";
    } else if (someRefunded) {
      order.refundStatus = "Partially Refunded";
    }

    await order.save();

    res.json({ success: true, message: "Item cancelled successfully" });

  } catch (error) {
    console.log("cancelOrderItem() error =>", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};


const refundToWallet = async (userId, amount, orderId) => {
  let wallet = await Wallet.findOne({ userId });

  wallet.balance += amount;
  wallet.transactions.push({
    type: "Credit",
    amount,
    description: `Refund for Order ${orderId}`
  });

  return wallet.save();
};


// Cancel entire order
const cancelWholeOrder = async (req, res) => {
  try {
    const userId = req.session.user || req.session.passport?.user;
    if (!userId) return res.status(401).json({ success: false, message: "Login required" });

    const { orderId } = req.body;

    const order = await Order.findOne({ orderId, userId });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // Block cancellation if shipped/delivered items exist
    if (order.orderItems.some(i => ["Shipped", "Delivered"].includes(i.itemStatus))) {
      return res.status(400).json({
        success: false,
        message: "Some items are already shipped/delivered. Order cannot be cancelled."
      });
    }

    // Allow cancel only if order is in these statuses
    if (!["Pending", "Partially Cancelled"].includes(order.orderStatus)) {
      return res.status(400).json({ success: false, message: "Order cannot be cancelled at this stage" });
    }

    // Restore stock for all Pending items
    await restoreStock(order.orderItems);

    // Track total refunded (for wallet)
    let totalWalletRefund = 0;

    // Loop through each item
    order.orderItems.forEach(item => {
      if (item.itemStatus === "Cancelled") {
        if (order.paymentMethod === "Online Payment" && order.paymentStatus === "Paid") {
          item.refundStatus = "Refunded";
          item.refundedOn = new Date();
        } else if (order.paymentMethod === "Cash on Delivery") {
          item.refundStatus = "Not Initiated";
        } else if (order.paymentMethod === "TeeSpace Wallet" && order.paymentStatus === "Paid") {
          if (item.refundStatus !== "Refunded") {
            totalWalletRefund += item.price * item.quantity;
            item.refundStatus = "Refunded";
            item.refundedOn = new Date();
          }
        }
      }
    });

    // Refund wallet if needed
    if (totalWalletRefund > 0) {
      const userWallet = await Wallet.findOne({ userId });
      if (userWallet) {
        userWallet.balance += totalWalletRefund;
        userWallet.transactions.push({
          type: "credit",
          amount: totalWalletRefund,
          description: `Refund for cancelled order ${order.orderId}`,
          createdAt: new Date()
        });
        await userWallet.save();
      }
    }

    // Determine order-level status
    const allCancelled = order.orderItems.every(i => i.itemStatus === "Cancelled");
    const anyRefunded = order.orderItems.some(i => i.refundStatus === "Refunded");

    if (allCancelled) {
      order.orderStatus = "Cancelled";
      order.refundStatus = anyRefunded ? "Refunded" : "Not Initiated";
    } else {
      order.orderStatus = "Partially Cancelled";
      order.refundStatus = anyRefunded ? "Partially Refunded" : "Not Initiated";
    }

    await order.save();

    res.json({
      success: true,
      message: "Order cancelled successfully",
      refundedAmount: totalWalletRefund > 0 ? totalWalletRefund : undefined
    });

  } catch (error) {
    console.error("cancelWholeOrder() error =>", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};



// const cancelWholeOrder = async (req, res) => {
//   try {
//     const userId = req.session.user || req.session.passport?.user;
//     if (!userId) return res.status(401).json({ success: false, message: "Login required" });

//     const { orderId } = req.body;
//     const order = await Order.findOne({ orderId, userId });
//     if (!order) return res.status(404).json({ success: false, message: "Order not found" });

//     // Block if any shipped/delivered items exist
//     if (order.orderItems.some(i => ["Shipped", "Delivered"].includes(i.itemStatus))) {
//       return res.status(400).json({ success: false, message: "Some items are already shipped/delivered. Order cannot be cancelled." });
//     }

//     // Allow only Pending or Partially Cancelled orders
//     if (!["Pending", "Partially Cancelled"].includes(order.orderStatus)) {
//       return res.status(400).json({ success: false, message: "Order cannot be cancelled at this stage" });
//     }

//     // Cancel only Pending items
//     const itemsToCancel = order.orderItems.filter(i => i.itemStatus === "Pending");
//     await restoreStock(itemsToCancel);

//     // Refund logic per item
//     itemsToCancel.forEach(item => {
//       item.itemStatus = "Cancelled";

//       if (order.paymentMethod === "Online Payment" && order.paymentStatus === "Paid") {
//         item.refundStatus = "Refunded";
//         item.refundedOn = new Date();
//       } else if (order.paymentMethod === "Cash on Delivery") {
//         item.refundStatus = "Not Initiated";
//       } else if (order.paymentMethod === "TeeSpace Wallet" && order.paymentStatus === "Paid") {
//         item.refundStatus = "Refunded";
//         item.refundedOn = new Date();
//       }
//     });

//     // Determine overall order status
//     const allCancelled = order.orderItems.every(i => i.itemStatus === "Cancelled");

//     if (allCancelled) {
//       order.orderStatus = "Cancelled";

//       if (order.paymentMethod === "Online Payment" && order.paymentStatus === "Paid") {
//         order.refundStatus = "Refunded";
//       } else if (order.paymentMethod === "TeeSpace Wallet" && order.paymentStatus === "Paid") {
//         order.refundStatus = "Refunded";

//         // 💰 Refund full amount to wallet
//         await refundToWallet(userId, order.totalAmount, order.orderId);
//       } else {
//         order.refundStatus = "Not Initiated";
//       }

//     } else {
//       order.orderStatus = "Partially Cancelled";

//       if (order.paymentMethod === "Online Payment" && order.paymentStatus === "Paid") {
//         order.refundStatus = "Partially Refunded";
//       } else if (order.paymentMethod === "TeeSpace Wallet" && order.paymentStatus === "Paid") {
//         order.refundStatus = "Partially Refunded";

//         // 💰 Refund only for newly cancelled items
//         const refundAmount = itemsToCancel.reduce((sum, i) => sum + i.price * i.quantity, 0);
//         await refundToWallet(userId, refundAmount, order.orderId);
//       } else {
//         order.refundStatus = "Not Initiated";
//       }
//     }

//     await order.save();
//     res.json({ success: true, message: "Order cancelled and refund processed" });

//   } catch (error) {
//     console.log("cancelWholeOrder() error =>", error);
//     res.status(500).json({ success: false, message: "Something went wrong" });
//   }
// };



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
    createRazorPayOrder,
	verifyRazorpayPayment,
	placeOnlinePaidOrder,
    place_cod_order,
    placeWalletPaidOrder,
    showOrders,
    showOrderSuccessPage,
    showOrderDetails,
    cancelOrderItem,
    cancelWholeOrder,
    getInvoice,
    returnOrderItem
}

