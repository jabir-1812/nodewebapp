const User=require('../../models/userSchema')
const Wallet=require('../../models/walletSchema')

const getWallet=async (req,res)=>{
    try {
        const userId=req.session.user || req.session.passport?.user;
        const userData=await User.findOne({_id:userId});

        let userWallet=await Wallet.findOne({userId});
        if(!userWallet){
            userWallet=await Wallet.create({
                userId,
            })
        }

        res.render('user/wallet/wallet',{
            title:"Wallet",
            user:userData,
            cartLength:null,
            userWallet
        })
    } catch (error) {
        console.error("getWallet() error=====>",error);
        res.redirect('/page-not-found')
    }
}



module.exports={
    getWallet
}