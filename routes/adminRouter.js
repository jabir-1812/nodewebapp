const express=require('express')
const router=express.Router();
const adminController=require('../controllers/admin/adminController');
const {userAuth,adminAuth}=require('../middlewares/auth');
const customerController=require('../controllers//admin/customerController')
const categoryController=require('../controllers/admin/categoryController')


//Login
router.get('/page-error',adminController.pageError);
router.get('/login',adminController.loadLogin);
router.post('/login',adminController.login);
router.get('/',adminAuth,adminController.loadDashboard);
router.get('logout',adminController.logout);

//Customer Management
router.get('/users',adminAuth,customerController.customerInfo);
router.get('/block-customer',adminAuth,customerController.customerBlocked);
router.get('/unblock-customer',adminAuth,customerController.customerUnBlocked);


//Category Management
router.get('/category',adminAuth,categoryController.categoryInfo)
router.post('/add-category',adminAuth,categoryController.addCategory)

module.exports=router;