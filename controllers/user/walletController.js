const User=require('../../models/userSchema')
const Wallet=require('../../models/walletSchema')
const Razorpay=require('razorpay')
const crypto = require('crypto')
require('dotenv').config();



const razorpay=new Razorpay({
  key_id:process.env.RAZORPAY_KEY_ID,
  key_secret:process.env.RAZORPAY_KEY_SECRET
})


const createRazorPayOrder=async(req,res)=>{
    try {
        const userId=req.session.user || req.session.passport?.user;
		const {walletAmount}=req.body;
        if(!walletAmount)return res.status(400).json({success:false,message:"Enter an amount"})
        
        const options={
            amount:walletAmount*100,
            currency:"INR"
        }
        console.log("option.amount=====>",options.amount)

        const order=await razorpay.orders.create(options);
        res.json(order)
    } catch (error) {
        console.log("walletController / createRazorPayOrder() error=====>",error);
        return res.status(500).json({success:false,message:"Something went wrong. Please try again later"})
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

const getWallet=async (req,res)=>{
    try {
        const userId=req.session.user || req.session.passport?.user;
        const userData=await User.findOne({_id:userId});

        let userWallet=await Wallet.findOne({userId});
        if (userWallet && userWallet.transactions) {
            // sort in place (descending: newest → oldest)
            userWallet.transactions.sort((a, b) => b.date - a.date);
        }
        if(!userWallet){
            userWallet=await Wallet.create({
                userId,
            })
        }

        res.render('user/wallet/wallet',{
            title:"Wallet",
            user:userData,
            cartLength:null,
            userWallet,
            razorPayKeyId:process.env.RAZORPAY_KEY_ID
        })
    } catch (error) {
        console.error("getWallet() error=====>",error);
        res.redirect('/page-not-found')
    }
}


const addMoney=async (req,res)=>{
    try {
        const userId=req.session.user || req.session.passport?.user;
        const {amount}=req.body;
        const userWallet=await Wallet.findOne({userId});
        
        if(!userWallet){
            userWallet=await Wallet.create({
                userId,
            })
        }
        userWallet.balance+=parseInt(amount);
        userWallet.transactions.push({
            amount:amount,
            type:"credit",
            description:'Money added'
        })

        await userWallet.save();
        res.status(200).json({success:true,message:"Money added to your wallet successfully"})
        
    } catch (error) {
        console.log("addMoney() error======>",error);
        res.status(500).json({success:false,message:"Something went wrong"})
    }
}



module.exports={
    getWallet,
    createRazorPayOrder,
    verifyRazorpayPayment,
    addMoney
}