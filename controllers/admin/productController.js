const path=require('path');
const fs=require('fs')
const Brand = require("../../models/brandSchema");
const Category=require('../../models/categorySchema');
const Product = require("../../models/productSchema");
const { cloudinary } = require("../../config/cloudinaryProduct");
const sharp = require('sharp');

// const loadAddProductPage = async (req,res)=>{
//     try {
//         const category=await Category.find({isDeleted:false});
//         const brand=await Brand.find({isBlocked:false})

//         res.render('./admin/products/add-product',{
//             title:"Add Product",
//             brand:brand,
//             category:category
//         })
//     } catch (error) {
//         console.log('error loading the add-product page:',error);
//         res.redirect('/admin/page-error');
//     }
// }




// const addProduct=async (req,res)=>{
//     try {
//         const product=req.body;
//         const {productName}=req.body;
//         const isProductExists=await Product.findOne({
//             productName:productName
//         })

//         if(!isProductExists){
//             const images=[];
//             if(!req.files || req.files.length<3){
//                 console.log("uploaded images are less than 3.required atleast 3")
//                 throw new Error("required atleast 3 images to add a product")
//             }
//             // if(req.files && req.files.length>=3){
//             //     for(let i=0;i<req.files.length;i++){
//             //         const originalImagePath=req.files[i].path;
//             //         console.log("original path:",originalImagePath);
//             //         const resizedImagePath=path.join('public','uploads','product-images',req.files[i].filename);
//             //         await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath);
//             //         images.push(req.files[i].filename);//pushing filename after resizing.not the file
//             //         //because the image with that filename stored in the /product-images.
//             //         //we render the product images from the /product-images folder, for that we need the actual filenames.
//             //         console.log("images[]:",images);
//             //     }
//             // }
//             const imageUrls=req.files.map(file=>file.path)

//             const category=await Category.findOne({name:product.category});

//             if(!category){
//                 console.log("error adding product:invalid category name")
//                 return res.status(400).json('Invalid category name')
//             }

//             const brand=await Brand.findOne({brandName:product.brand})
//             if(!brand){
//                 console.log("Error adding product:invalid brand name")
//                 return res.status(400).json("Invalid brand name");
//             }

//             const newProduct=new Product({
//                 productName:product.productName,
//                 description:product.productDescription,
//                 brand:brand._id,
//                 category:category._id,
//                 regularPrice:product.regularPrice,
//                 salePrice:product.salePrice,
//                 createdOn:new Date(),
//                 quantity:product.quantity,
//                 size:product.size,
//                 color:product.color,
//                 productImage:imageUrls,
//                 status:"Available",
//             })
//             await newProduct.save();
//             console.log("new product saved");
//             res.redirect('/admin/add-products')
//         }else{
//             console.log("error adding/saving product")
//             return  res.status(400).json("Product name already exist");
//         }
//     } catch (error) {
//         console.log("error adding/saving product:",error)
//         res.redirect('/admin/page-error')
//     }
// }






const loadAddProductPage = async (req,res)=>{
    try {
        const category=await Category.find({isDeleted:false});
        const brand=await Brand.find({isBlocked:false})

        res.render('./admin/products/2add-product',{
            title:"Add Product",
            brand:brand,
            category:category
        })
    } catch (error) {
        console.log('error loading the add-product page:',error);
        res.redirect('/admin/page-error');
    }
}



const addProduct=async (req,res)=>{
    try {
        const product=req.body;
        const {productName}=req.body;
        const isProductExists=await Product.findOne({
            productName:productName
        })

        if(!isProductExists){
            const images=[];
            if(!req.files || req.files.length<3){
                console.log("uploaded images are less than 3.required atleast 3")
                throw new Error("required atleast 3 images to add a product")
            }
            // if(req.files && req.files.length>=3){
            //     for(let i=0;i<req.files.length;i++){
            //         const originalImagePath=req.files[i].path;
            //         console.log("original path:",originalImagePath);
            //         const resizedImagePath=path.join('public','uploads','product-images',req.files[i].filename);
            //         await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath);
            //         images.push(req.files[i].filename);//pushing filename after resizing.not the file
            //         //because the image with that filename stored in the /product-images.
            //         //we render the product images from the /product-images folder, for that we need the actual filenames.
            //         console.log("images[]:",images);
            //     }
            // }
            const productImages=req.files.map(file=>({
                url:file.path,
                public_id:file.filename
            }));


            const category=await Category.findOne({name:product.category});

            if(!category){
                console.log("error adding product:invalid category name")
                return res.status(400).json('Invalid category name')
            }

            const brand=await Brand.findOne({brandName:product.brand})
            if(!brand){
                console.log("Error adding product:invalid brand name")
                return res.status(400).json("Invalid brand name");
            }

            const newProduct=new Product({
                productName:product.productName,
                description:product.productDescription,
                brand:brand._id,
                category:category._id,
                regularPrice:product.regularPrice,
                salePrice:product.salePrice,
                createdOn:new Date(),
                quantity:product.quantity,
                size:product.size,
                color:product.color,
                productImage:productImages,
                status:"Available",
            })
            await newProduct.save();
            console.log("new product saved");
            res.redirect('/admin/add-products')
        }else{
            console.log("error adding/saving product")
            return  res.status(400).json("Product name already exist");
        }
    } catch (error) {
        console.log("error adding/saving product:",error)
        res.redirect('/admin/page-error')
    }
}



const loadAllProductsPage = async (req, res) => {
    try {
        // Get all products with pagination and search
        const ITEMS_PER_PAGE = 5;
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || "";

        const categoryObj = await Category.findOne({
        name: { $regex: ".*" + search + ".*", $options: "i" },
        });

        const brandObj=await Brand.findOne({
            brandName:{$regex:".*"+search+".*",$options:"i"}
        });

        const orConditions = [
        { productName: { $regex: ".*" + search + ".*", $options: "i" } }
        ];

        if (categoryObj) {
        orConditions.push({ category: categoryObj._id });
        }
        if(brandObj){
            orConditions.push({brand:brandObj._id});
        }

        const totalProducts = await Product.countDocuments({ $or: orConditions });

        const product = await Product.find({ $or: orConditions })
        .sort({ createdAt: -1 })
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
        .populate("category")
        .populate("brand")
        .exec();

        // console.log("producttttttt:", product);

        res.render("./admin/products/product", {
        title: "Products",
        product,
        search,
        totalProducts,
        totalPages: Math.ceil(totalProducts / ITEMS_PER_PAGE),
        currentPage: page,
        });
    } catch (error) {
        console.log("error loading the product management page:", error);
        res.redirect("/admin/page-error");
    }
};




const addProductOffer=async (req,res)=>{
    try {
        const percentage=parseInt(req.body.percentage);
        const productId=req.body.productId;
        const product=await Product.findById(productId);

        if(!product){
            return res.status(404).json({status:false,message:"Product not found"});
        }

        if(product){
            product.productOffer=percentage;
            if(percentage < product.categoryOffer || percentage < product.brandOffer){
                const higherOffer=product.brandOffer > product.categoryOffer ? `Brand Offer:${product.brandOffer}%` : `Product Offer${product.categoryOffer}%`;
                await product.save();
                return res.json({
                    status:true,
                    message:`Note:Product has an higer offer already.<br>
                            The product has ${higherOffer}<br>
                            so the higher offer will be applied`,
                    categoryOffer:product.categoryOffer,
                    brandOffer:product.brandOffer,
                    salePrice:product.salePrice
                })
            }
            product.salePrice=product.regularPrice*(1-percentage/100);
            await product.save();
            res.json({status:true,message:"",categoryOffer:product.categoryOffer,brandOffer:product.brandOffer,salePrice:product.salePrice})
        }
    } catch (error) {
        res.status(500).json({status:false,message:"Internal Server Error"})
    }
}


const removeProductOffer = async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ status: false, message: "Product not found" });
    }

    // Remove the product offer
    product.productOffer = 0;

    // Find which offer (brand/category) is higher
    const highestOffer = Math.max(product.brandOffer, product.categoryOffer);

    if (highestOffer > 0) {
      product.salePrice = product.regularPrice * (1 - highestOffer / 100);
    } else {
      product.salePrice = product.regularPrice;
    }

    await product.save();

    res.json({ status: true, salePrice: product.salePrice });
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};


const blockUnblockProduct= async (req,res)=>{
    try {
        const product = await Product.findOne({_id:req.params.id});
        console.log("product:",product);
        console.log("product isBlocked:",product.isBlocked);

        if(product.isBlocked===false){
            await Product.findByIdAndUpdate(req.params.id,{isBlocked:true});
            return res.redirect('/admin/products');
        }
        if(product.isBlocked===true){
            await Product.findByIdAndUpdate(req.params.id,{isBlocked:false});
            return res.redirect('/admin/products');
        }
    } catch (error) {
        console.log("error blocking the product",error);
        res.redirect('/admin/page-error')
    }
}

const unblockProduct = async (req,res)=>{
    try {
        const {productId}=req.body;
        await Product.updateOne({_id:productId},{$set:{isBlocked:false,status:"Available"}});
        res.json({success:true,message:"Product unblocked successfully"});
    } catch (error) {
        res.status(500).json({success:false,message:"Error unblocking the product"})
        console.log("unblockBrand error:",error)
    }
}


const blockProduct = async (req,res)=>{
    try {
        const {productId}=req.body;
        await Product.updateOne({_id:productId},{$set:{isBlocked:true,status:"Unavailable"}});
        res.json({success:true,message:"Product blocked successfully"});
    } catch (error) {
        res.status(500).json({success:false,message:"Error blocking the product"})
        console.log("blockBrand error:",error)
    }
}

// const loadEditProductPage = async (req,res)=>{
//     try {
//         const id=req.params.id;
//         const product = await Product.findOne({_id:id});
//         const category = await Category.find({})
//         const brand = await Brand.find({})

//         res.render('./admin/products/2edit-product',{
//             title:"Edit Product",
//             product:product,
//             category:category,
//             brand:brand
//         })
        
//     } catch (error) {
//         console.log("error rendering the edit-product page:",error)
//         res.redirect('/admin/page-error')
//     }
// }

// const editProduct=async (req,res)=>{
//     try {
//         console.log("editProduct has started");
//         const productId=req.params.id;
//         const product=await Product.findById(productId);
//         if(!product) return res.status(404).json({message:"Product not found"})

//         const existingImages=JSON.parse(req.body.existingImages || [])

//         //remove deleted images from file system
//         const removedImages=product.productImage.filter(img=> !existingImages.includes(img));
//         removedImages.forEach(img=>{
//             const imgPath=path.join('public','uploads','product-images',img);
//             if(fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
//         })

//         //Process new uploaded images
//         const newFilenames=[];
//         for(let file of req.files){
//             //const filename=`${Date.now()-${file.originalname}`};
//             const originalImagePath=file.path;
//             const outputPath=path.join('public','uploads','product-images',file.originalname);

//             await sharp(originalImagePath)
//             .resize({width:440,height:440})
//             .toFile(outputPath);

//             newFilenames.push(file.originalname);
//         }

//         const updatedImages=[...existingImages, ...newFilenames];
//         if(updatedImages.length<3){
//             return res.status(404).json({success:false,message:"At least 3 images are required"})
//         }

//         //Update product
//         product.productName=req.body.productName;
//         product.description=req.body.productDescription;
//         const brand=await Brand.findOne({brandName:req.body.brand})
//         if(!brand) throw new Error("Brand not found")
//         product.brand=brand._id;
//         const category=await Category.findOne({name:req.body.category})
//         if(!category) throw new Error("category not found")
//         product.category=category._id;
//         product.regularPrice=req.body.regularPrice;
//         product.salePrice=req.body.salePrice;
//         product.quantity=req.body.quantity;
//         product.color=req.body.color;
//         product.productImage=updatedImages;
//         await product.save();

//         res.status(200).json({success:false,message:"Product updated"})
//         console.log("product updated successfully")

//     } catch (error) {
//         console.log("error in editProduct:",error);
//         res.redirect('/amdin/page-error');
//     }
// }





const loadEditProductPage = async (req,res)=>{
    try {
        const id=req.params.id;
        const product = await Product.findOne({_id:id});
        const category = await Category.find({})
        const brand = await Brand.find({})

        res.render('./admin/products/3edit-product',{
            title:"Edit Product",
            product:product,
            category:category,
            brand:brand
        })
        
    } catch (error) {
        console.log("error rendering the edit-product page:",error)
        res.redirect('/admin/page-error')
    }
}

const editProduct=async (req,res)=>{
    try {
        console.log("editProduct has started");
        const productId=req.params.id;
        const product=await Product.findById(productId);
        if(!product) return res.status(404).json({message:"Product not found"})

        const removedImages=JSON.parse(req.body.removedImages || "[]")

       // ✅ 2. Helper function to delete from Cloudinary
        async function deleteFromCloud(publicId) {
            try {
                await cloudinary.uploader.destroy(publicId);
                console.log("Deleted from Cloudinary:", publicId);
            } catch (err) {
                console.error("Cloudinary delete error:", err);
            }
        }

       // ✅ 3. Remove deleted images (both from DB and Cloudinary)
        for (let url of removedImages) {
            // Find image in DB
            const img = product.productImage.find((img) => img.url === url);
            if (img && img.public_id) {
                await deleteFromCloud(img.public_id);
                product.productImage = product.productImage.filter((i) => i.url !== url);
            }
        }


        // ✅ 4. Upload new images to Cloudinary
        if (req.files && req.files.length > 0) {
            for (let file of req.files) {
                // NOTE: You don’t need a manual uploadToCloud() when using multer-storage-cloudinary
                // Multer + CloudinaryStorage already upload automatically and add `.path` and `.filename`
                product.productImage.push({
                url: file.path,
                public_id: file.filename,
                });
            }
        }

        //Update product
        product.productName=req.body.productName;
        product.description=req.body.productDescription;
        const brand=await Brand.findOne({brandName:req.body.brand})
        if(!brand) throw new Error("Brand not found")
        product.brand=brand._id;
        const category=await Category.findOne({name:req.body.category})
        if(!category) throw new Error("category not found")
        product.category=category._id;
        product.regularPrice=req.body.regularPrice;
        product.salePrice=req.body.salePrice;
        product.quantity=req.body.quantity;
        product.color=req.body.color;

        await product.save();

        res.status(200).json({success:true,message:"Product updated"})
        console.log("✅ product updated successfully")

    } catch (error) {
        console.log("❌ error in editProduct:",error);
        res.redirect('/amdin/page-error');
    }
}





module.exports={
    loadAddProductPage,
    addProduct,
    loadAllProductsPage,
    addProductOffer,
    removeProductOffer,
    blockUnblockProduct,
    loadEditProductPage,
    editProduct,
    blockProduct,
    unblockProduct
}
