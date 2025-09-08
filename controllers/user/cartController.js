// // const Cart=require('../../models/cartSchema')
// const User=require('../../models/userSchema')
// const Product = require('../../models/productSchema');

// const loadCart=async (req,res)=>{
//     try {
//         // const userId=req.session.user || req.session.passport?.user;
//         // const userData=await User.findOne({_id:userId});
//         // const userCart=await Cart.findOne({userId:userId})
//         // console.log("userCart=====>",userCart)
//         // res.render('user/cart',{
//         //     title:"Cart",
//         //     user:userData,
//         //     cart:userCart
//         // })
//         //////////////////////////////////////////////////////////////////
//         const userId=req.session.user || req.session.passport?.user;
//         const user=await User.findById(userId);
//         res.render('user/cart',{
//             title:"Cart",
//             user,
//             cart:user.cart
//         })
//     } catch (error) {
//         console.log("loadCart() error:",error);
//         res.redirect('/page-not-found')
//     }
// }

// const addToCart=async (req,res)=>{
//     try {
//         // const productId=req.params.id;
//         // console.log("product Id:",req.params.id)
//         // const product=await Product.findById(productId);
//         // console.log(product,"======>added to cart")
//         /////////////////////////////////////////////////////////////////

//         // const userId=req.session.user || req.session.passport?.user;
//         // const productId=req.params.id;
//         // const userCart=await Cart.findOne({userId})
//         // if(userCart){
//         //     userCart.items.push({productId})
//         //     await userCart.save();
//         // }else{
//         //    const newCart=new Cart({
//         //     userId:userId,
//         //     items:[
//         //         {
//         //             productId:productId
//         //         }
//         //     ]
//         //    }) 
//         //    await newCart.save();
//         // }
//         /////////////////////////////////////////////////////////////////
//         const productId=req.body.productId;
//         const userId=req.session.user || req.session.passport?.user;

//         if(!userId) return res.redirect('/login')
//         const user=await User.findById(userId);
//         const existingItem=user.cart.find(item=>item.productId===productId);

//         if(existingItem){
//             existingItem.quantity+=1;
//         }else{
//             user.cart.push({productId,quantity:1})
//         }

//         await user.save();
//         res.status(200).json({success:true});
//     } catch (error) {
//         console.log("addToCart() error",error);
//         res.redirect("/page-not-found");
//     }
// }


// module.exports={
//     loadCart,
//     addToCart
// }
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart=require('../../models/cartSchema');
const Wishlist=require('../../models/wishlistSchema')
const mongodb = require("mongodb");
const { ObjectId } = require("mongodb");
const { default: mongoose } = require("mongoose");




// const addToCart = async (req, res) => {
//   try {
//     const productId = req.body.productId;
//     const userId=req.session.user || req.session.passport?.user;
//     const findUser = await User.findById(userId);
//     const product = await Product.findById({ _id: productId }).lean();
    
//     if (!product) {
//       return res.json({ status: "Product not found" });
//     }
    
//     if (product.quantity <= 0) {
//       return res.json({ status: "Out of stock" });
//     }

//     const cartIndex = findUser.cart.findIndex((item) => item.productId == productId);

//     if (cartIndex === -1) {
//       const quantity = 1;
//       await User.findByIdAndUpdate(userId, {
//         $addToSet: {
//           cart: {
//             productId: id,
//             quantity: quantity,
//           },
//         },
//       });
//       return res.json({ status: true, cartLength: findUser.cart.length + 1, user: userId });
//     } else {
//       const productInCart = findUser.cart[cartIndex];
//       if (productInCart.quantity < product.quantity) {
//         const newQuantity = productInCart.quantity + 1;
//         await User.updateOne(
//           { _id: userId, "cart.productId": productId },
//           { $set: { "cart.$.quantity": newQuantity } }
//         );
//         return res.json({ status: true, cartLength: findUser.cart.length, user: userId });
//       } else {
//         return res.json({ status: "Out of stock" });
//       }
//     }
//   } catch (error) {
//     console.error("addToCart() error:",error);
//     return res.redirect("/page-not-found");
//   }
// };

// const loadCart2 = async (req, res) => {
//   try {
//     // const id = req.session.user;
//     // const id = String(req.session.user);
//     const id=String(req.session.user) || String(req.session.passport?.user);
//     const user = await User.findOne({ _id: id });
//     const productIds = user.cart.map((item) => item.productId);
//     const products = await Product.find({ _id: { $in: productIds } })
//     .populate('brand').populate('category');
//     const oid = new mongodb.ObjectId(id);

//     let data = await User.aggregate([
//       { $match: { _id: oid } },
//       { $unwind: "$cart" },
//       {
//         $project: {
//           proId: { $toObjectId: "$cart.productId" },
//           quantity: "$cart.quantity"
//         }
//       },
//       {
//         $lookup: {
//           from: "products",
//           localField: "proId",
//           foreignField: "_id",
//           as: "productDetails"
//         }
//       },
//       {
//         $unwind: "$productDetails"
//       },
//       {
//         $lookup: {
//           from: "categories", // or whatever your categories collection is called
//           localField: "productDetails.category",
//           foreignField: "_id",
//           as: "categoryDetails"
//         }
//       },
//       {
//         $lookup: {
//           from: "brands", // or whatever your brands collection is called
//           localField: "productDetails.brand",
//           foreignField: "_id",
//           as: "brandDetails"
//         }
//       },
//       {
//         $unwind: {
//           path: "$categoryDetails",
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       {
//         $unwind: {
//           path: "$brandDetails",
//           preserveNullAndEmptyArrays: true
//         }
//       }
//     ]);
//     // console.log('data========>',data)

//     let quantity = 0;
//     for (const i of user.cart) {
//       quantity += i.quantity;
//     }
//     let grandTotal = 0;
//     for (let i = 0; i < data.length; i++) {
//       if (data[i].productDetails && data[i].productDetails.quantity>0) {
//         grandTotal += data[i].productDetails.salePrice * data[i].quantity;
//       }

//       req.session.grandTotal = grandTotal;
//     }
//     res.render("user/cart", {
//       title:"Cart",
//       user,
//       quantity,
//       data,
//       grandTotal,
//       cartLength:user.cart.length
//     });
//   } catch (error) {
//     console.log("loadCart() error:",error)
//     res.redirect("/page-not-found");
//   }
// };

const loadCart = async (req, res) => {
  try {
    const userId = req.session.user || req.session.passport?.user;
    const user = await User.findById(userId);

    let userCart = await Cart.findOne({ userId })
      .populate({
        path: "items.productId",
        populate: [
          { path: "brand", select: "brandName" },
          { path: "category", select: "name" }
        ]
      });

    if (!userCart) {
      return res.render("user/2cart", { title: "Cart", user, userCart: null, grandTotal: 0, cartLength: 0 });
    }

    let grandTotal = 0;
    let cartUpdated = false;

    // Check each item quantity vs stock
    for (let i = 0; i < userCart.items.length; i++) {
      let item = userCart.items[i];
      if (item.productId && item.quantity > item.productId.quantity) {
        item.quantity = item.productId.quantity; // reduce to available stock
        cartUpdated = true;
      }
      grandTotal += (item.productId ? item.productId.salePrice : 0) * item.quantity;
    }

    // If any change happened, save updated cart
    if (cartUpdated) {
      await userCart.save();
    }

    // Convert to plain object for rendering
    userCart = userCart.toObject();

    res.render("user/2cart", {
      title: "Cart",
      user,
      userCart,
      grandTotal,
      cartLength: userCart.items.length
    });

  } catch (error) {
    console.log("loadCart() error:", error);
    res.redirect("/page-not-found");
  }
};


// const addToCart = async (req, res) => {
//   try {
//     const productId = req.body.productId;
//     const userId=req.session.user || req.session.passport?.user;
//     const findUser = await User.findById(userId);
//     const product = await Product.findById({ _id: productId }).lean();
    
//     if (!product) {
//       return res.json({ status:false,message: "Product not found" });
//     }
    
//     if (product.quantity <= 0) {
//       return res.json({ status:false,message: "Out of stock" });
//     }

//     const cartIndex = findUser.cart.findIndex((item) => item.productId == productId);

//     if (cartIndex === -1) {
//       const quantity = 1;
//       await User.findByIdAndUpdate(userId, {
//         $addToSet: {
//           cart: {
//             productId: productId,
//             quantity: quantity,
//           },
//         },
//       });
//       return res.json({ status: true, cartLength: findUser.cart.length + 1, user: userId });
//     } else {
//       const productInCart = findUser.cart[cartIndex];
//       if (productInCart.quantity < product.quantity) {
//         const newQuantity = productInCart.quantity + 1;
//         if(newQuantity>3){
//           return res.json({status:false,message:"Cart limit exceeded"})
//         }
//         await User.updateOne(
//           { _id: userId, "cart.productId": productId },
//           { $set: { "cart.$.quantity": newQuantity } }
//         );
//         return res.json({ status: true, cartLength: findUser.cart.length, user: userId });
//       } else {
//         return res.json({ status:false,message: "Out of stock" });
//       }
//     }
//   } catch (error) {
//     console.error("addToCart() error:",error);
//     return res.redirect("/page-not-found");
//   }
// };

const addToCart = async (req, res) => {
  try {
    const productId = req.body.productId;
    const userId = req.session.user || req.session.passport?.user;

    let userCart = await Cart.findOne({ userId: userId }); // safer than findById

    // If no cart exists, create a new one
    if (!userCart) {
      userCart = await Cart.create({
        userId: userId,
        items: []
      });
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.json({ status: false, message: "Product not found" });
    }

    if (product.quantity <= 0) {
      return res.json({ status: false, message: "Out of stock" });
    }

    const cartItemIndex = userCart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (cartItemIndex === -1) {
      const quantity = 1;
      await Cart.updateOne(
        { userId: userId },
        {
          $push: {
            items: { productId: productId, quantity: quantity },
          },
        }
      );

      await Wishlist.deleteOne(
        {userId,productId}
      );
      return res.json({ status: true, cartLength: userCart.items.length + 1 });
    } else {
      const productInCart = userCart.items[cartItemIndex];
      if (productInCart.quantity < product.quantity) {
        const newQuantity = productInCart.quantity + 1;
        if (newQuantity > 3) {
          return res.json({ status: false, message: "Cart limit exceeded" });
        }
        await Cart.updateOne(
          { userId: userId, "items.productId": productId },
          { $set: { "items.$.quantity": newQuantity } }
        );
        return res.json({ status: true, cartLength: userCart.items.length });
      } else {
        return res.json({ status: false, message: "Out of stock" });
      }
    }
  } catch (error) {
    console.error("addToCart() error:", error);
    return res.redirect("/page-not-found");
  }
};



// const changeCartQuantity2 = async (req, res) => {
//   try {
//     const id = req.body.productId;
//     // const user = req.session.user;
//     const user=String(req.session.user) || String(req.session.passport?.user);
//     const count = req.body.count;
//     // count(-1,+1)
//     const findUser = await User.findOne({ _id: user });
//     const findProduct = await Product.findOne({ _id: id }).populate('brand').populate('category');
//     const oid = new mongodb.ObjectId(user);
//     if (findUser) {
//       const productExistinCart = findUser.cart.find(
//         (item) => item.productId === id
//       );
//       let newQuantity;
//       if (productExistinCart) {
//         if (count == 1) {
//           newQuantity = productExistinCart.quantity + 1;
//         } else if (count == -1) {
//           newQuantity = productExistinCart.quantity - 1;
//         } else {
//           return res
//             .status(400)
//             .json({ status: false, error: "Invalid count" });
//         }
//       } else {
//       }
//       if (newQuantity > 0 && newQuantity <= findProduct.quantity) {
//         let quantityUpdated = await User.updateOne(
//           { _id: user, "cart.productId": id },
//           {
//             $set: {
//               "cart.$.quantity": newQuantity,
//             },
//           }
//         );
//         const totalAmount = findProduct.salePrice * newQuantity;
//         const grandTotal = await User.aggregate([
//           { $match: { _id: oid } },
//           { $unwind: "$cart" },
//           {
//             $project: {
//               proId: { $toObjectId: "$cart.productId" },
//               quantity: "$cart.quantity",
//             },
//           },
//           {
//             $lookup: {
//               from: "products",
//               localField: "proId",
//               foreignField: "_id",
//               as: "productDetails",
//             },
//           },
//           {
//             $unwind: "$productDetails", // Unwind the array created by the $lookup stage
//           },

//           {
//             $group: {
//               _id: null,
//               totalQuantity: { $sum: "$quantity" },
//               totalPrice: {
//                 $sum: { $multiply: ["$quantity", "$productDetails.salePrice"] },
//               }, 
//             },
//           },
//         ]);
//         if (quantityUpdated) {
//           res.json({
//             status: true,
//             quantityInput: newQuantity,
//             count: count,
//             totalAmount: totalAmount,
//             grandTotal: grandTotal[0].totalPrice,
//           });
//         } else {
//           res.json({ status: false, error: "cart quantity is less" });
//         }
//       } else {
//         res.json({ status: false, error: "out of stock" });
//       }
//     }
//   } catch (error) {
//     console.log("changeCartQuantity() error:",error)
//     res.redirect("/page-not-found");
//     return res.status(500).json({ status: false, error: "Server error" });
//   }
// };

const changeCartQuantity = async (req, res) => {
  try {
    const userId = req.session.user || req.session.passport?.user;
    const { productId, count } = req.body;
    console.log('count======>',count)
    console.log('type of count======>',typeof count)

    // Find the product in the user's cart
    const cartProduct = await Cart.findOne(
      {
        userId: new mongoose.Types.ObjectId(String(userId)),
        "items.productId": new mongoose.Types.ObjectId(String(productId))
      },
      { "items.$": 1 }
    );

    if (!cartProduct || !cartProduct.items.length) {
      return res.status(404).json({ status: false, message: "Product not in cart" });
    }

    let cartProductQty = cartProduct.items[0].quantity;
    let updatedCartProductQty=cartProductQty;// final quantity to send to Front-end

    // Check product stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ status: false, message: "Product not found" });
    }

    let status = true;

    if (product.quantity >= cartProductQty + count && product.quantity > 0) {
      updatedCartProductQty = cartProductQty + count;
      await Cart.updateOne(
        {
          userId: new mongoose.Types.ObjectId(String(userId)),
          "items.productId": new mongoose.Types.ObjectId(String(productId))
        },
        { $inc: { "items.$.quantity": count } }
      );
    } else {
      updatedCartProductQty = product.quantity;
      status = false; // adjustment happened
      await Cart.updateOne(
        {
          userId: new mongoose.Types.ObjectId(String(userId)),
          "items.productId": new mongoose.Types.ObjectId(String(productId))
        },
        { $set: { "items.$.quantity": updatedCartProductQty } }
      );
    }

    const updatedCart = await Cart.findOne({ userId }).populate("items.productId");
    const grandTotal = updatedCart.items.reduce((sum, item) => {
      return sum + (item.productId ? item.productId.salePrice * item.quantity : 0);
    }, 0);

    res.status(200).json({
      status,
      message: status ? "Quantity updated" : "Adjusted to available stock",
      updatedCartProductQty, // send final quantity
      grandTotal
    });

  } catch (error) {
    console.log("changeCartQuantity() error:", error);
    res.status(500).json({ status: false, error: "Server error" });
  }
};


const deleteCartItem =async (req,res)=>{
 try {
    const userId = req.session.user || req.session.passport?.user;
    const productId = req.params.id;

    await Cart.updateOne(
      { userId: new mongoose.Types.ObjectId(String(userId)) },
      { $pull: { items: { productId: new mongoose.Types.ObjectId(String(productId)) } } }
    );

    res.status(200).json({ status: true, message: "Item removed" });
  } catch (error) {
    console.log('deleteCartItem() error:', error);
    res.status(500).json({ status: false, error: "Server error" });
  }
}





module.exports = {
  loadCart,
  addToCart,
  changeCartQuantity,
  deleteCartItem
};

