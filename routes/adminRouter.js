const express=require('express')
const router=express.Router();
const adminController=require('../controllers/admin/adminController');
const {userAuth,adminAuth}=require('../middlewares/auth');
const customerController=require('../controllers//admin/customerController');
const categoryController=require('../controllers/admin/categoryController');
const brandController=require('../controllers/admin/brandController');
const productController=require('../controllers/admin/productController');
const bannerController=require('../controllers/admin/bannerController');
const orderController=require('../controllers/admin/adminOrderController');
const multer=require('multer');
const storage=require('../helpers/multer');
const uploads=multer({storage:storage});


//404
router.get('/page-error',adminController.pageError);


//Login
router.get('/login',adminController.loadLogin);
router.post('/login',adminController.login);
router.get('/',adminAuth,adminController.loadDashboard);
router.get('logout',adminController.logout);



//Customer Management
router.get('/users',adminAuth,customerController.customerInfo);
router.post('/block-customer',adminAuth,customerController.blockCustomer);
router.post('/unblock-customer',adminAuth,customerController.unblockCustomer);



//Category Management
router.get('/category',adminAuth,categoryController.categoryInfo)
router.get('/add-category',adminAuth,categoryController.loadAddCategoryPage);
router.post('/add-category',adminAuth,categoryController.addCategory);
router.get('/edit-category/:id',adminAuth,categoryController.loadEditCategory);
router.post('/edit-category/:id',adminAuth,categoryController.editCategory);
router.post('/add-category-offer',adminAuth,categoryController.addCategoryOffer)
router.post('/remove-category-offer',adminAuth,categoryController.removeCategoryOffer);
router.post('/list-category',adminAuth,categoryController.listCategory);
router.post('/unlist-category',adminAuth,categoryController.unlistCategory);



//Brand Management
router.get('/brands',adminAuth,brandController.loadAllBrands);
router.get('/add-brand',adminAuth,brandController.loadAddBrandPage);
router.post('/add-brand',adminAuth,uploads.single("image"),brandController.addBrand);
router.post('/add-brand-offer',adminAuth,brandController.addBrandOffer);
router.post('/remove-brand-offer',adminAuth,brandController.removeBrandOffer);
router.get('/edit-brand/:id',adminAuth,brandController.loadEditBrand);
router.post('/edit-brand/:id',adminAuth,uploads.single("image"),brandController.editBrand);
router.post('/block-brand',adminAuth,brandController.blockBrand);
router.post('/unblock-brand',adminAuth,brandController.unblockBrand);
// router.get('/delete-brand',adminAuth,brandController.deleteBrand);



//Product Management
router.get('/add-products',adminAuth,productController.loadAddProductPage);
router.post('/add-products',adminAuth,uploads.array('images',4),productController.addProduct);
router.get('/products',adminAuth,productController.loadAllProductsPage);
router.post('/add-product-offer',adminAuth,productController.addProductOffer);
router.post('/remove-product-offer',adminAuth,productController.removeProductOffer);
router.post('/block-unblock-product/:id',adminAuth,productController.blockUnblockProduct);
router.post('/block-product',adminAuth,productController.blockProduct);
router.post('/unblock-product',adminAuth,productController.unblockProduct);
router.get('/edit-product/:id',adminAuth,productController.loadEditProductPage);
router.post('/edit-product/:id',adminAuth,uploads.array('images',4),productController.editProduct);


//Banner Management
router.get('/banners',adminAuth,bannerController.getBannerPage);
router.get('/add-banner',adminAuth,bannerController.loadAddBannerPage);
router.post('/add-banner',adminAuth,uploads.single('image'),bannerController.addBanner);
router.get('/edit-banner/:id',adminAuth,bannerController.loadEditBannerPage);
router.post('/edit-banner/:id',adminAuth,uploads.single('image'),bannerController.editBanner);
router.get('/delete-banner',adminAuth,bannerController.deleteBanner)



//order management
router.get('/orders',adminAuth,orderController.listAllOrders)
router.get('/orders/order-details/:orderId',adminAuth,orderController.getOrderDetails)
router.post('/orders/order-details/update-item-status',adminAuth,orderController.updateItemStatus)
router.post('/orders/:orderId/return/:itemId/:action',adminAuth,orderController.manageReturnRequest)
router.post('/orders/return/update-status',adminAuth,orderController.updateReturnStatus);

module.exports=router; 