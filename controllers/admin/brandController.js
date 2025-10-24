const path=require('path')
const fs=require('fs')
const Brand=require('../../models/brandSchema');
const Product=require('../../models/productSchema');
const Offer = require('../../models/offerSchema')



const loadAllBrands=async (req,res)=>{
    try {
        const ITEMS_PER_PAGE=5;
        const page=parseInt(req.query.page) || 1;
        const search = req.query.search || '';

        const totalBrands=await Brand.countDocuments({brandName:{$regex:".*"+search+".*",$options:"i"}})
        const totalPages=Math.ceil(totalBrands/ITEMS_PER_PAGE);
        const brands=await Brand.find({brandName:{$regex:".*"+search+".*",$options:"i"}})
        .sort({createdAt:-1})
        .skip((page-1)*ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)

        res.render('./admin/brand/3brands',{
            title:"Brands",
            brands,
            totalBrands,
            totalPages,
            search,
            currentPage:page

        })
    } catch (error) {
        console.log("error in loadAllBrands:",error);
        res.redirect('/admin/page-error');
    }
}

const loadAddBrandPage=async (req,res)=>{
    try {
        res.render('./admin/brand/add-brand',{
            title:"Add brand",
            error:null,
            formData:{}
        })
    } catch (error) {
        console.log("error in loading the add-brand page:",error)
        res.redirect('/admin/page-error')
    }
}

const addBrand=async (req,res)=>{
    try {
        const {name}=req.body;
        const image=req.file.filename;
        const brand = new Brand({brandName:name,brandImage:image});
        await brand.save();
        
        res.status(200).json({ message: "Brand added successfully" });

    } catch (error) {
        if(error.name==='ValidationError'){
            const errorMessages=Object.values(error.errors).map(err=>({msg:err.message}));
            return res.status(400).json({ message: "Brand name already exists", errors: errorMessages });
        }else{
            
            console.log("addBrand error:",error)
            res.redirect('/admin/page-error')
        }
    }
}

// const addBrandOffer=async (req,res)=>{
//     try {
//         //percentage means offer percentage of new adding offer
//         const percentage=parseInt(req.body.percentage);
//         const brandId=req.body.brandId;
//         const brand=await Brand.findById(brandId);

//         if(!brand){
//             return res.status(404).json({status:false,message:"Brand not found"});
//         }
//         const products=await Product.find({brand:brand._id});

//         if(products.length>0){
//             for(const product of products){
//                 if(percentage > product.productOffer && percentage > product.categoryOffer){
//                     product.salePrice=product.regularPrice*(1-percentage/100)
//                 }
//                 product.brandOffer=percentage;
//                 await product.save()
                
//             }
//         }
        
//         await Brand.updateOne({_id:brandId},{$set:{offer:percentage}});

//         // // Apply brand offer ONLY to products with lesser existing offer
//         // //if a product has less offer % than new offer %, those product will be updated to new offer %.
//         // //if a product has higher offer than new offer, it stays like that.it won't be updated.
//         // await Product.updateMany(
//         //     {brand:brand._id,productOffer:{$lt:percentage}},
//         //     [
//         //         {$set:{productOffer:percentage,salePrice:{$multiply:["$regularPrice",(1-percentage/100)]}}}
//         //     ]
//         // );


//         res.json({status:true});
//     } catch (error) {
//         res.status(500).json({status:false,message:"Internal Server Error"})
//     }
// }

const addBrandOffer = async(req,res)=>{
    try{
        const { brandId, percentage, startDate, endDate, description } = req.body;

        // 1️⃣ Check if brand exists
        const brand = await Brand.findById(brandId);
        if (!brand) {
        return res.status(404).json({ status: false, message: "Brand not found" });
        }

        // 2️⃣ Find products in this brand
        const products = await Product.find({ brand: brand._id });

        // 3️⃣ Update each product's brandOffer & salePrice if needed
        if (products.length > 0) {
            const bulkOps = products.map((product) => {
                const update = { brandOffer: percentage };
                if (percentage > product.productOffer && percentage > product.categoryOffer) {
                update.salePrice = product.regularPrice * (1 - percentage / 100);
                }
                return {
                    updateOne: {
                        filter: { _id: product._id },
                        update: { $set: update },
                    },
                };
            });

            if (bulkOps.length > 0) {
                await Product.bulkWrite(bulkOps);
            }
        }

        // 4️⃣ Update category with offer info
        await Brand.updateOne(
            { _id: brandId },
            {
                $set: {
                offer: percentage,
                offerStartDate: startDate || null,
                offerEndDate: endDate || null,
                offerDescription: description || "",
                },
            }
        );

        // 5️⃣ Sync to Offer collection (centralized)
        await Offer.findOneAndUpdate(
            { refId: brand._id, type: "brand" },
            {
                name: brand.brandName,
                type: "brand",
                refId: brand._id,
                percentage,
                startDate: startDate || null,
                endDate: endDate || null,
                description: description || "",
                active: true,
            },
            { upsert: true } // create if not exists
        );

        // 6️⃣ Send response
        res.json({ status: true, message: "Brand offer added successfully" });
  } catch (error) {
        console.error("Error adding brand offer:", error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
  }
}



const removeBrandOffer=async(req,res)=>{
     try {
    const brandId = req.body.brandId;

    // Step 1: Find the category
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res
        .status(404)
        .json({ status: false, message: "Brand not found" });
    }

    // Step 2: Reset category offer
    brand.offer = 0;
    await brand.save();

    // Step 3: Find all products in this category
    const products = await Product.find({ brand: brand._id });

    if (products.length > 0) {
      for (const product of products) {
        // Reset category offer
        product.brandOffer = 0;

        // Recalculate salePrice based on other active offers
        const maxOffer = Math.max(product.productOffer || 0, product.categoryOffer || 0);

        if (maxOffer > 0) {
          product.salePrice = product.regularPrice * (1 - maxOffer / 100);
        } else {
          product.salePrice = product.regularPrice;
        }

        await product.save();
      }
    }

    // Step 4: Deactivate the Offer document (if any)
    await Offer.deleteMany(
      { type: "brand", refId: brand._id, isActive: true },
      { $set: { isActive: false } }
    );

    // Step 5: Respond to client
    res.json({ status: true, message: "Brand offer removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
}


const loadEditBrand=async (req,res)=>{
    try {
        const id=req.params.id;
        const brand=await Brand.findOne({_id:id});

        if(!brand) return res.redirect('/admin/page-error');

        res.render('./admin/brand/edit-brand',{
            title:"Edit Brand",
            brand:brand,
            error:null,
        })
    } catch (error) {
        console.log("loadEditBrand error:",error);
        res.redirect('/admin/page-error')
    }
}

const editBrand = async (req, res) => {
    try {
        const brandId = req.params.id;
        const { name, removeExisting } = req.body;
        const brand = await Brand.findById(brandId);

        if (!brand) {
            return res.status(404).json({ message: 'Brand not found' });
        }

        // Update brand name
        brand.brandName = name;

        // Remove all existing images if user clicked "remove"
        if (removeExisting === 'true' && Array.isArray(brand.brandImage)) {
            for (const filename of brand.brandImage) {
                const filePath = path.join(__dirname, '../../public/uploads/brandImages/', filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            brand.brandImage = []; // clear the array
        }

        // Handle new image upload
        if (req.file) {
            const uploadedFile = req.file.filename;

            // Optional: remove old images if replacing (but user didn’t click remove)
            if (removeExisting !== 'true' && Array.isArray(brand.brandImage)) {
                for (const filename of brand.brandImage) {
                    const filePath = path.join(__dirname, '../../public/uploads/brandImages/', filename);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
                brand.brandImage = []; // clear previous ones
            }

            // Add the new image
            brand.brandImage.push(uploadedFile);
        }

        await brand.save();
        return res.json({ success: true });
    } catch (error) {
        if(error.name==='ValidationError'){
            const errors=Object.values(error.errors).map(err=>({msg:err.message}));
            const brand=await Brand.findById(req.params.id);
            res.status(404).json({message:"Brand name already exists"})
        }
        console.error('Edit Brand Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const blockBrand=async (req,res)=>{
    try {
        const {brandId}=req.body;
        await Brand.updateOne({_id:brandId},{$set:{isBlocked:true}});
        res.json({success:true,message:"Brand blocked successfully"});
    } catch (error) {
        res.status(500).json({success:false,message:"error blocking the brand"})
        console.log("blockBrand error:",error);
    }
}

const unblockBrand=async (req,res)=>{
    try {
        const {brandId}=req.body;
        await Brand.updateOne({_id:brandId},{$set:{isBlocked:false}});
        res.json({success:true,message:"Brand unblocked successfully"});
    } catch (error) {
        res.status(500).json({success:false,message:"error unblocking the brand"})
        console.log("unblockBrand error:",error);
    }
}

const deleteBrand=async (req,res)=>{
    try {
        const {id}=req.query;
        if(!id){
            return res.status(400).redirect('/admin/page-error')
        }
        await Brand.deleteOne({_id:id});
        res.redirect('/admin/brands')
    } catch (error) {
        console.error("Error deleting brand:",error)
        res.status(500).redirect("/admin/page-error")
    }
}
module.exports={
    loadAllBrands,
    loadAddBrandPage,
    addBrand,
    addBrandOffer,
    removeBrandOffer,
    loadEditBrand,
    editBrand,
    blockBrand,
    unblockBrand,
    deleteBrand,
}