const User=require('../../models/userSchema');
const Product=require('../../models/productSchema');
const Address=require('../../models/addressSchema');
const Cart=require('../../models/cartSchema');
const Wallet=require('../../models/walletSchema')
const { ObjectId } = require('mongodb');
const { default: mongoose } = require("mongoose");
require('dotenv').config();


// const loadCheckoutPage=async(req,res)=>{
//     try {
//         const userId=req.session.user || req.session.passport?.user;
//         const user=await User.findById(userId);
//         if(!user) return res.status(404).send("User not found");
        
//         let grandTotal=0;

//         const findAddresses=await Address.findOne({userId:userId});
//         // console.log("findAddresses=====>",findAddresses);
//         const addresses=[]
//         if(findAddresses){
//             for(const address of findAddresses.address){
//                 addresses.push(address);
//             }
//         }

//         const userCart = await Cart.aggregate([
//             // Match only the current user's cart
//             { 
//                 $match: { userId: new mongoose.Types.ObjectId(String(userId)) } 
//             },

//             // Break "items" array into separate documents
//             { 
//                 $unwind: "$items" 
//             },

//             // Lookup product details for each item
//             {
//                 $lookup: {
//                 from: "products",
//                 localField: "items.productId",
//                 foreignField: "_id",
//                 as: "productDetails"
//                 }
//             },

//             // Take the first matching product (since $lookup returns an array)
//             { 
//                 $unwind: "$productDetails" 
//             },

//             // Group back into one cart document
//             {
//                 $group: {
//                 _id: "$_id",
//                 userId: { $first: "$userId" },
//                 items: {
//                     $push: {
//                     quantity: "$items.quantity",
//                     productDetails: "$productDetails"
//                     }
//                 }
//                 }
//             }
//         ]);

//         // console.log("userCart=====>",userCart);
//         // console.log("userCart.items[0]=====>",userCart[0].items[0]);
//         // console.log("userCart.items[0].productDetails=====>",userCart[0].items[0].productDetails);

//         userCart[0].items.forEach((item)=>{
//             grandTotal+=item.quantity * item.productDetails.salePrice;
//         })


//         res.render('user/2checkout',{
//             title:"Checkout page",
//             addresses,
//             user:user,
//             userCart,
//             cartLength:"",
//             grandTotal
//         })
//     } catch (error) {
//         console.log('loadCheckoutPage() error:',error);
//         res.redirect('/page-not-found');
//     }
// }

const loadCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user || req.session.passport?.user;
    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found");

    const userWallet=await Wallet.findOne({userId})
    if(!userWallet){
      userWallet=await Wallet.create({userId})
    }

    let grandTotal = 0;

    // Fetch addresses
    const findAddresses = await Address.findOne({ userId });
    const addresses = findAddresses ? findAddresses.address : [];

    // Fetch cart with product details
    let userCart = await Cart.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(String(userId)) } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: "$_id",
          userId: { $first: "$userId" },
          items: {
            $push: {
              productId: "$productDetails._id",
              quantity: "$items.quantity",
              productDetails: "$productDetails"
            }
          }
        }
      }
    ]);
    //after aggregation, the userCart will look like this:
    // [
    //     {
    //         "_id": "cart1",
    //         "userId": "user1",
    //         "items": [
    //         {
    //             "productId": "p1",
    //             "quantity": 2,
    //             "productDetails": { "_id": "p1", "name": "Laptop", "price": 50000 }
    //         },
    //         {
    //             "productId": "p2",
    //             "quantity": 1,
    //             "productDetails": { "_id": "p2", "name": "Mouse", "price": 1000 }
    //         }
    //         ]
    //     }
    // ]


    if (!userCart.length) {
      return res.render("user/checkout/7checkout", {
        title: "Checkout page",
        addresses,
        user,
        userCart: null,
        cartLength: 0,
        grandTotal: 0,
        razorPayKeyId:process.env.RAZORPAY_KEY_ID,
        userWallet
      });
    }

    userCart = userCart[0]; // aggregated result is in array

    let cartUpdated = false;

    // Re-check product stock
    for (let i = 0; i < userCart.items.length; i++) {
      let item = userCart.items[i];
      if (item.quantity > item.productDetails.quantity) {
        item.quantity = item.productDetails.quantity; // adjust to stock
        cartUpdated = true;
      }
      grandTotal += item.quantity * item.productDetails.salePrice;
    }

    // If any update, reflect in DB
    if (cartUpdated) {
      await Cart.updateOne(
        { _id: userCart._id, "items.productId": { $exists: true } },
        {
          $set: {
            items: userCart.items.map(it => ({
              productId: it.productId,
              quantity: it.quantity
            }))
          }
        }
      );
    }

    res.render("user/checkout/7checkout", {
      title: "Checkout page",
      addresses,
      user,
      userCart,
      cartLength: userCart.items.length,
      grandTotal,
      razorPayKeyId:process.env.RAZORPAY_KEY_ID,
      userWallet
    });
  } catch (error) {
    console.log("loadCheckoutPage() error:", error);
    res.redirect("/page-not-found");
  }
};


// // Get single address by id
// const getAddress=async (req,res)=>{
//     try {
//         const addressId = req.params.id;
//         const userId = req.session.user || req.session.passport?.user;

//         const userAddresses = await Address.findOne(
//             { userId, "address._id": addressId },
//             { "address.$": 1 } // only return the matching address in the array
//         );

//         if (!userAddresses || !userAddresses.address.length) {
//             return res.status(404).json({ success: false, message: "Address not found" });
//         }

//         res.json({
//             success: true,
//             address: userAddresses.address[0]
//         });
//     } catch (error) {
//         console.log("Error in /get-address/:id", error);
//         res.status(500).json({ success: false, message: "Something went wrong" });
//     }
// }



const editAddress = async (req, res) => {
    try {
        const { addressId, addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;
        console.log('addressId & addressType====>', addressId, addressType);

        const userId = req.session.user || req.session.passport?.user;
        const user = await User.findById(userId);
        if (!user) return res.status(404).send("User not found");

        // Update in DB
        await Address.updateOne(
            { userId, "address._id": addressId },
            {
                $set: {
                    "address.$.addressType": addressType,
                    "address.$.name": name,
                    "address.$.city": city,
                    "address.$.landMark": landMark,
                    "address.$.state": state,
                    "address.$.pincode": pincode,
                    "address.$.phone": phone,
                    "address.$.altPhone": altPhone
                }
            }
        );

        // Fetch the updated address
        const updatedDoc = await Address.findOne(
            { userId, "address._id": addressId },
            { "address.$": 1 } // only return the matching address
        );

        const updatedAddress = updatedDoc.address[0];

        // Send updated address to frontend
        // res.json({
        //     success: true,
        //     address: updatedAddress
        // });

        //Fetch all the addresses
        const findAddresses = await Address.findOne({ userId });
        const addresses = findAddresses ? findAddresses.address : [];
        res.render("user/checkout/checkout-partials/3address-forms",{
            title:"Checkout Page",
            addresses,
            user
        })


    } catch (error) {
        console.log("error in editAddress() in checkoutController====>", error);
        res.status(500).json({success:false, message: "Something went wrong" });
    }
};



const addNewAddress = async (req, res) => {
    try {
        const userId = req.session.user || req.session.passport?.user;
        const user = await User.findById(userId);
        if (!user) return res.status(404).send("User not found");
        const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;

        console.log("addressType & name:=====>", addressType, name, "userId:", userId);

        let newAddressEntry = { addressType, name, city, landMark, state, pincode, phone, altPhone };

        const findUserAddress = await Address.findOne({ userId: userId });

        if (!findUserAddress) {
            // User has no addresses yet
            const newAddress = new Address({
                userId: userId,
                address: [newAddressEntry]
            });
            // savedAddress = (await newAddress.save()).address[0]; // first address
            await newAddress.save();
        } else {
            // Push new address to existing list
            findUserAddress.address.push(newAddressEntry);
            await findUserAddress.save();
            // savedAddress = findUserAddress.address[findUserAddress.address.length - 1]; // last added address
        }

        // res.json({
        //     success: true,
        //     address: savedAddress // send the new address to frontend
        // });
        //Fetch all the addresses
        const findAddresses = await Address.findOne({ userId });
        const addresses = findAddresses ? findAddresses.address : [];
        res.render("user/checkout/checkout-partials/3address-forms",{
            title:"Checkout Page",
            addresses,
            user
        })

    } catch (error) {
        console.log("checkoutController====>addNewAddress() error:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
};



module.exports={
    loadCheckoutPage,
    editAddress,
    addNewAddress
}