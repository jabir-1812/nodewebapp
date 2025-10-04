const express=require('express');
const router=express.Router();
const passport=require('passport');
const userController=require('../controllers/user/userController')
const profileController=require('../controllers/user/profileController');
const productController=require('../controllers/user/productController');
const wishlistController=require('../controllers/user/wishlistController')
const cartController=require('../controllers/user/cartController');
const checkoutController=require('../controllers/user/checkoutController')
const orderController=require('../controllers/user/orderController');
const walletController=require('../controllers/user/walletController')
const { userAuth} = require('../middlewares/auth');

router.get('/page-not-found',userController.pageNotFound)

//Register
router.get('/signup',userController.loadSignup);//
router.post('/signup',userController.signup);//
router.post('/verify-otp',userController.verifyOtp);//
router.post('/resend-otp',userController.resendOtp);//

//tells google to access profile, email from the user
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
//route after login
//if fails the login , go to /signup
//if success, go to '/'
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
});

//login
router.get('/login',userController.loadLogin);//
router.post('/login',userController.login);//
router.get('/logout',userController.logout);//

//profile management
router.get('/user-profile',userAuth,profileController.userProfile)
router.post('/change-username',userAuth,profileController.changeUsername)
router.post('/change-phone-number',userAuth,profileController.changePhoneNumber)
//change email
router.get('/change-email',userAuth,profileController.loadChangeEmailPage)//
router.post('/change-email/verify-current-email',userAuth,profileController.verifyCurrentEmail)//
router.get('/change-email/verify-email-otp',userAuth,profileController.getEmailOtpVerficationPage)//
router.post('/change-email/resend-otp',userAuth,profileController.resendOtp)
router.post('/change-email/verify-email-otp',userAuth,profileController.verifyEmailOtp);
router.get('/change-email/enter-new-email',userAuth,profileController.getUpdateEmailPage)
router.post('/change-email/update-email',userAuth,profileController.updateEmail)
//change password
router.get('/change-password',userAuth,profileController.laodChangePasswordPage)
router.post('/verify-current-password',userAuth,profileController.verifyCurrentPassword)
router.post('/verify-change-password-otp',userAuth,profileController.verifyChangePasswordOtp);
//forgot password
router.get('/forgot-password',profileController.getForgotPasswordPage);//
router.post('/forgot-password/verify-email',profileController.verifyEmail);
router.get('/forgot-password/email-otp-verification',profileController.getEmailOtpVerficationPage)
router.post('/forgot-password/verify-otp',profileController.verifyForgotPasswordOtp);
router.get('/reset-password',profileController.getResetPasswordPage);
router.post('/forgot-password/resend-otp',profileController.resendOtp)
router.post('/reset-password',profileController.postNewPassword)

//address Management
router.get('/user-profile/addresses',userAuth,profileController.showAddresses)
router.get('/add-address',userAuth,profileController.loadAddAddressPage);
router.post('/add-address',userAuth,profileController.addAddress);
router.get('/edit-address',userAuth,profileController.loadEditAddressPage);
router.put('/edit-address',userAuth,profileController.editAddress);
router.delete('/delete-address',userAuth,profileController.deleteAddress);

//home page & shop page
router.get('/',userController.loadHomepage);
router.get('/shop',userAuth,userController.loadShoppingPage);
router.get('/filter',userAuth,userController.filterProduct);
router.get('/filterPrice',userAuth,userController.filterByPrice);
router.post('/search',userAuth,userController.searchProducts)

router.get('/product-details',userAuth,productController.productDetails);


//wishlist
router.get('/wishlist',userAuth,wishlistController.showWishlist);
router.post('/wishlist/add/:id',userAuth,wishlistController.addToWishlist)
router.delete('/wishlist/remove/:id',userAuth,wishlistController.removeFromWishlist);

//cart
router.get('/cart',userAuth,cartController.loadCart);
router.post('/add-to-cart',userAuth,cartController.addToCart);
router.post('/change-cart-quantity',userAuth,cartController.changeCartQuantity)
router.delete("/delete-cart-item/:id", userAuth, cartController.deleteCartItem)


//checkout
router.get('/checkout',userAuth,checkoutController.loadCheckoutPage);
router.post('/edit-address-in-checkout',userAuth,checkoutController.editAddress);
router.post('/add-address-in-checkout',userAuth,checkoutController.addNewAddress);


//order
router.post('/create-razorpay-order',userAuth,orderController.createRazorPayOrder);
router.post('/verify-razorpay-payment',userAuth,orderController.verifyRazorpayPayment)
router.post('/place-online-paid-order',userAuth,orderController.placeOnlinePaidOrder)
router.post('/place-cod-order',userAuth,orderController.place_cod_order);
router.post('/place-wallet-paid-order',userAuth,orderController.placeWalletPaidOrder)
router.get('/orders',userAuth,orderController.showOrders);
router.get('/order-success/:orderId',userAuth,orderController.showOrderSuccessPage);
router.get('/user-profile/orders',userAuth,orderController.showOrders);
router.get('/user-profile/orders/order-details/:orderId',userAuth,orderController.showOrderDetails)
router.post('/user-profile/orders/order-details/cancel-item',userAuth,orderController.cancelOrderItem)
router.post('/user-profile/orders/order-details/cancel-orders',userAuth,orderController.cancelWholeOrder)
router.get('/orders/:id/invoice',userAuth,orderController.getInvoice);
router.post('/user-profile/orders/order-details/return-item',userAuth,orderController.returnOrderItem)


//wallet
router.get('/user-profile/wallet',userAuth,walletController.getWallet);
router.post('/user-profile/wallet/create-razorpay-order',userAuth,walletController.createRazorPayOrder)
router.post('/user-profile/wallet/verify-razorpay-payment',userAuth,walletController.verifyRazorpayPayment)
router.post('/user-profile/wallet/add-money',userAuth,walletController.addMoney)
module.exports=router;