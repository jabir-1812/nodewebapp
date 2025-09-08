const Category=require('../../models/categorySchema');
const Product =require('../../models/productSchema')

const 
categoryInfo = async (req,res)=>{
    try {
        // Get all categories with pagination and search
        const ITEMS_PER_PAGE = 5;
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';

        const totalCategories = await Category.countDocuments({name:{$regex:".*"+search+".*",$options:"i"}})
        const categories=await Category.find({name:{$regex:".*"+search+".*",$options:"i"}})
        .sort({createdAt:-1})
        .skip((page - 1)* ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)

        res.render('./admin/category/2category',{
            title:"Categories",
            categories,
            totalCategories,
            search,
            totalPages:Math.ceil(totalCategories/ITEMS_PER_PAGE),
            currentPage:page
        })
        
    } catch (error) {
        console.log("error loading the category page:",error)
        res.redirect('/admin/page-error')
    }
}

//load add-category page
const loadAddCategoryPage = async (req,res)=>{
    try {
        res.render('./admin/category/add-category',{
            title:"Add Category",
            errors: null, 
            formData: {} 
        })
    } catch (error) {
        console.log("error loading the add-category page:",error)
        res.redirect('/admin/page-error');
    }
}

//add category
const addCategory = async (req,res)=>{
    try {
        const { categoryName, description } = req.body;
        
        const category = new Category({ name:categoryName, description:description || "NA" });
        await category.save();

        res.redirect('/admin/category');
    } catch (error) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => ({ msg: err.message }));
            res.render('./admin/category/add-category', {
                title:"Add category",
                errors,
                formData: req.body
            });
        } else {
            res.status(500).send('Server Error');
            console.log("catch block error in adding category:",error);
            res.redirect("/admin/page-error");
        }
    }
}


//load edit category page
const loadEditCategory = async (req,res)=>{
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.redirect('/admin/category');
        }
        res.render('./admin/category/edit-category',{
            title:"Edit Category",
            category,
            errors: null
        })
    } catch (error) {
        console.log("edit-category page laoding error:",error)
        res.redirect('/admin/page-error')
    }
}

//edit category or update category
const editCategory = async (req,res)=>{
    try {
        const { categoryName, description } = req.body;
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.redirect('/admin/category');
        }
        
        category.name = categoryName;
        category.description = description;
        await category.save();
        
        res.redirect('/admin/category');
    } catch (error) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => ({ msg: err.message }));
            const category = await Category.findById(req.params.id);
            res.render('./admin/category/edit-category', {
                title:"Edit Category",
                category,
                errors
            });
        } else {
            res.redirect('/admin/page-error');
        }
    }
}


const addCategoryOffer=async (req,res)=>{
    try {
        const percentage=parseInt(req.body.percentage);
        const categoryId=req.body.categoryId;
        const category=await Category.findById(categoryId);

        if(!category){
            return res.status(404).json({status:false,message:"Category not found"});
        }
        const products=await Product.find({category:category._id});
        if(products.length>0){
            for(const product of products){
                if(percentage > product.productOffer && percentage > product.brandOffer){
                    product.salePrice=product.regularPrice*(1-percentage/100);
                }
                product.categoryOffer=percentage;
                await product.save();
            }
        }
        
        await Category.updateOne({_id:categoryId},{$set:{offer:percentage}});

        // Apply category offer ONLY to products with lesser existing offer
        //if a product has less offer % than new offer %, those product will be updated to new offer %.
        //if a product has higher offer than new offer, it stays like that.it won't be updated.
        // await Product.updateMany(
        //     {category:category._id,productOffer:{$lt:percentage}},
        //     [
        //         {$set:{productOffer:percentage,salePrice:{$multiply:["$regularPrice",(1-percentage/100)]}}}
        //     ]
        // );

        res.json({status:true});
    } catch (error) {
        res.status(500).json({status:false,message:"Internal Server Error"})
    }
}


const removeCategoryOffer=async (req,res)=>{
    try {
        console.log("remove category offer has started")
        const categoryId=req.body.categoryId;
        const category=await Category.findById(categoryId);

        if(!category){
            return res.status(404).json({status:false,message:"Category not found"})
        }
        category.offer=0;
        await category.save();

        // const percentage=category.offer;
        const products= await Product.find({category:category._id});

        if(products.length>0){
            for(const product of products){
                product.categoryOffer=0;
                if(product.productOffer > product.brandOffer){
                    product.salePrice=product.regularPrice*(1-product.productOffer/100);
                    // product.categoryOffer=0;
                    // product.productOffer=product.productOffer;
                    // await product.save();                    
                }
                if(product.brandOffer > product.productOffer){
                    product.salePrice=product.regularPrice*(1-product.brandOffer/100);
                    // product.categoryOffer=0;
                    // product.productOffer=product.brandOffer;
                    // await product.save();
                }
                if(product.brandOffer === 0 && product.productOffer === 0){
                    product.salePrice=product.regularPrice;
                    // product.categoryOffer=0;
                    // product.productOffer=0;
                    // await product.save();
                }
            }
        }
        res.json({status:true});
    } catch (error) {
        res.status(500).json({status:false,message:"Internal Server Error"})
    }
}


const listCategory = async (req,res)=>{
    try {
        const {categoryId}=req.body;
        await Category.updateOne({_id:categoryId},{$set:{isDeleted:false}});
        res.json({success:true,message:"Category listed successfully"})
    } catch (error) {
        res.status(500).json({success:false,message:"error listing the category"})
        console.log("listCategory error:",error);
    }
}


const unlistCategory = async (req,res)=>{
    try {
        const {categoryId}=req.body;
        await Category.updateOne({_id:categoryId},{$set:{isDeleted:true}});
        res.json({success:true,message:"Category unlisted successfully"})
    } catch (error) {
        res.status(500).json({success:false,message:"error unlisting the category"})
        console.log("unlistCategory error:",error);
    }
}


module.exports={
    categoryInfo,
    loadAddCategoryPage,
    addCategory,
    loadEditCategory,
    editCategory,
    addCategoryOffer,
    removeCategoryOffer,
    listCategory,
    unlistCategory,
}
// const categoryInfo=async (req,res)=>{
//     try {
//         let search="";
//         if(req.query.search){
//             search=req.query.search;
//         }

//         const page=parseInt(req.query.page) || 1;
//         const limit=5;
//         const skip=(page-1)*limit;

//         const categoryData=await Category.find({name:{$regex:".*"+search+".*",$options:"i"}})
//         .sort({createdAt:-1})
//         .skip(skip)
//         .limit(limit);

//         const totalCategories =await Category.countDocuments({name:{$regex:".*"+search+".*",$options:"i"}});
//         const totalPages=Math.ceil(totalCategories/limit);
//         res.render('./admin/category',{
//             title:"Category",
//             cat:categoryData,
//             currentPage:page,
//             totalPages:totalPages,
//             totalCategories:totalCategories,
//             search:search
//         });
//     } catch (error) {
//         console.error(error);
//         res.redirect('/admin/page-error')
//     }
// }


// const addCategory=async (req,res)=>{
//     const {name,description}=req.body;
//     try {
//         const existingCategory=await Category.findOne({name});
//         if(existingCategory){
//             return res.status(404).json({error:"Category already exists"})
//         }
//         const newCategory=new Category({
//             name,
//             description
//         })

//         await newCategory.save();
//         return res.json({message:"Category added successfully"})
//     } catch (error) {
//         return res.status(500).json({error:"Internal Server Error"})            
//     }
// }

// const addCategoryOffer=async (req,res)=>{
//     try {
//         const percentage=parseInt(req.body.percentage);
//         const categoryId=req.body.categoryId;
//         const category=await Category.findById(categoryId);

//         if(!category){
//             return res.status(404).json({status:false,message:"Category not found"});
//         }
//         const products=await Product.find({category:category._id});
//         const hasProductOffer=products.some((product)=>product.productOffer > percentage);
//         if(hasProductOffer){
//             return res.json({status:false,message:"Products within this category already have product offers"})
//         }
//         await Category.updateOne({_id:categoryId},{$set:{categoryOffer:percentage}});

//         for(const product of products){
//             product.productOffer=0;
//             product.salePrice=product.regularPrice;
//             await product.save();
//         }
//         res.json({status:true});
//     } catch (error) {
//         res.status(500).json({status:false,message:"Internal Server Error"})
//     }
// }


// const removeCategoryOffer=async (req,res)=>{
//     try {
//         console.log("remove category offer has started")
//         const categoryId=req.body.categoryId;
//         const category=await Category.findById(categoryId);

//         if(!category){
//             return res.status(404).json({status:false,message:"Category not found"})
//         }

//         const percentage=category.categoryOffer;
//         const products= await Product.find({category:category._id});

//         if(products.length>0){
//             for(const product of products){
//                 product.salePrice+=Math.floor(product.regularPrice*(percentage/100));
//                 product.productOffer=0;
//                 await product.save();
//             }
//         }
//         category.categoryOffer=0;
//         await category.save();
//         res.json({status:true});
//     } catch (error) {
//         res.status(500).json({status:false,message:"Internal Server Error"})
//     }
// }


// const getListCategory=async (req,res)=>{
//     try {
//         let id=req.query.id;
//         await Category.updateOne({_id:id},{$set:{isListed:false}});
//         res.redirect("/admin/category");
//     } catch (error) {
//         res.redirect('/admin/page-error')
//     }
// }


// const getUnlistCategory=async (req,res)=>{
//     try {
//         let id=req.query.id;
//         await Category.updateOne({_id:id},{$set:{isListed:true}});
//         res.redirect('/admin/category');
//     } catch (error) {
//         res.redirect('/admin/page-error')
//     }
// }

// const getEditCategory=async (req,res)=>{
//     try {
//         console.log('getEditCategory has started')
//         const id=req.query.id;
//         console.log("id:",id)
//         const category=await Category.findOne({_id:id});
//         console.log("category:",category)
//         res.render('./admin/edit-category',{title:"Edit category",category:category})
//     } catch (error) {
//         res.redirect('/admin/page-error')
//     }
// }

// const editCategory=async (req,res)=>{
//     try {
//         console.log("edit category has started")
//         const id=req.params.id;
//         console.log("id:",id)
//         const {categoryName,description}=req.body;
//         const existingCategory=await Category.findOne({name:categoryName});

//         if(existingCategory){
//             return res.status(400).json({error:"Category exists, Please choose another name"})
//         }
//         const updateCategory =await Category.findByIdAndUpdate(id,{
//             name:categoryName,
//             description:description,
//         },{new:true});

//         if(updateCategory){
//             res.redirect("/admin/category");
//         }else{
//             res.status(404).json({error:"Category not found"})
//         }
//     } catch (error) {
//         res.status(500).json({error:"Internal sever error"})
//     }
// }

// module.exports={
//     categoryInfo,
//     addCategory,
//     addCategoryOffer,
//     removeCategoryOffer,
//     getListCategory,
//     getUnlistCategory,
//     getEditCategory,
//     editCategory
// }