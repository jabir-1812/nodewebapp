const User=require('../../models/userSchema')
const Wishlist=require('../../models/wishlistSchema')
const Cart=require('../../models/cartSchema')

const showWishlist = async (req, res) => {
  try {
    const userId = req.session.user || req.session.passport?.user;

    const userData = await User.findById(userId);
    const userCart = await Cart.findOne({ userId });

    // ✅ Pagination setup
    const page = parseInt(req.query.page) || 1; // current page
    const limit = 5; // items per page
    const skip = (page - 1) * limit;

    // Count total items
    const totalItems = await Wishlist.countDocuments({ userId });

    // Fetch with pagination
    const wishlistData = await Wishlist.find({ userId })
      .populate("productId")
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalItems / limit);

    res.render("user/wishlist/wishlist", {
      title: "Wishlist",
      cartLength: userCart ? userCart.items.length : 0,
      user: userData,
      wishlistData,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    console.log("showWishlist() error:", error);
    res.redirect("/page-not-found");
  }
};



const addToWishlist=async (req,res)=>{
    try {
        const userId=req.session.user || req.session.passport?.user;
        const productId=req.params.id;

        await Wishlist.create({ userId, productId });

        res.status(200).json({success:true,message:"Added to Wishlist"});
  } catch (err) {
    if (err.code === 11000) {
      // duplicate entry
      return res.status(400).json({ success: false, message: "Already in wishlist" });
    }
    res.status(500).json({ success: false, message: "Error adding to wishlist" });
  }
}


const removeFromWishlist=async (req,res)=>{
    try {
        const userId=req.session.user || req.session.passport?.user;
        const productId=req.params.id;

        const result = await Wishlist.findOneAndDelete({ userId, productId });

        if (!result) {
            return res.status(404).json({ success: false, message: "Item not found in wishlist" });
        }
        return res.json({ success: true, message: "Removed from wishlist" });
    } catch (error) {
        console.log("removeFromWishlist() error:",error);
        res.status(500).json({success:false,message:"Internal Server error"})
    }
}

module.exports={
    showWishlist,
    addToWishlist,
    removeFromWishlist
}