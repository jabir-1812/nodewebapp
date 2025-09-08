const path=require('path')
const fs=require('fs')
const Brand=require('../../models/brandSchema');
const Product=require('../../models/productSchema');



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

const addBrandOffer=async (req,res)=>{
    try {
        //percentage means offer percentage of new adding offer
        const percentage=parseInt(req.body.percentage);
        const brandId=req.body.brandId;
        const brand=await Brand.findById(brandId);

        if(!brand){
            return res.status(404).json({status:false,message:"Brand not found"});
        }
        const products=await Product.find({brand:brand._id});

        if(products.length>0){
            for(const product of products){
                if(percentage > product.productOffer && percentage > product.categoryOffer){
                    product.salePrice=product.regularPrice*(1-percentage/100)
                }
                product.brandOffer=percentage;
                await product.save()
                
            }
        }
        
        await Brand.updateOne({_id:brandId},{$set:{offer:percentage}});

        // // Apply brand offer ONLY to products with lesser existing offer
        // //if a product has less offer % than new offer %, those product will be updated to new offer %.
        // //if a product has higher offer than new offer, it stays like that.it won't be updated.
        // await Product.updateMany(
        //     {brand:brand._id,productOffer:{$lt:percentage}},
        //     [
        //         {$set:{productOffer:percentage,salePrice:{$multiply:["$regularPrice",(1-percentage/100)]}}}
        //     ]
        // );


        res.json({status:true});
    } catch (error) {
        res.status(500).json({status:false,message:"Internal Server Error"})
    }
}

const removeBrandOffer=async(req,res)=>{
     try {
        console.log("remove brand offer has started")
        const brandId=req.body.brandId;
        const brand=await Brand.findById(brandId);

        if(!brand){
            return res.status(404).json({status:false,message:"Brand not found"})
        }
        brand.offer=0;
        await brand.save();

        // const percentage=brand.offer;
        const products= await Product.find({brand:brand._id});

        if(products.length>0){
            for(const product of products){
                product.brandOffer=0;
                if(product.productOffer > product.categoryOffer){
                    product.salePrice=product.regularPrice*(1-product.productOffer/100);
                    // product.brandOffer=0;
                    // product.productOffer=product.categoryOffer;
                    // await product.save();
                }
                if(product.categoryOffer > product.productOffer){
                    product.salePrice=product.regularPrice*(1-product.categoryOffer/100);
                    // product.brandOffer=0;
                    // product.productOffer=product.categoryOffer;
                    // await product.save();
                }
                if(product.productOffer === 0 && product.categoryOffer === 0){
                    product.salePrice=product.regularPrice;
                    // product.brandOffer=0;
                    // product.productOffer=0;
                    // await product.save();
                }
                await product.save();
            }
        }
        res.json({status:true});
    } catch (error) {
        res.status(500).json({status:false,message:"Internal Server Error"})
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