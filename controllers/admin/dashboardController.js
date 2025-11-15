const Status=require('../../constants/statusCodes')
const Order=require('../../models/orderSchema')
const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const Brand=require('../../models/brandSchema')
const DELIVERY_STATUS=require('../../constants/deliveryStatus.enum')





const loadDashboard = async (req, res) => {
  try {

    const topProducts=await Order.aggregate([
        { $unwind: "$orderItems" },
        {$match:{"orderItems.itemStatus":DELIVERY_STATUS.DELIVERED}},
        { $group: {
            _id: "$orderItems.productId",
            totalSold: { $sum: "$orderItems.quantity" }
        }},
        // { $lookup: {
        //     from: "products",
        //     localField: "_id",
        //     foreignField: "_id",
        //     as: "product"
        // }},
        // { $unwind: "$product" },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }   // top 10 products
        ])

        await Product.populate(topProducts,{
            path:"_id",
            populate:[
                {
                    path:"brand",
                    select:"brandName brandImage"
                },
                {
                    path:"category",
                    select:"name"
                }
            ]
        })
        // db.orders.aggregate([
        //     { $unwind: "$items" },
        //     { $lookup: {
        //         from: "products",
        //         localField: "items.productId",
        //         foreignField: "_id",
        //         as: "product"
        //     }},
        //     { $unwind: "$product" },
        //     { $group: {
        //         _id: "$product.category",
        //         totalSold: { $sum: "$items.quantity" }
        //     }},
        //     { $sort: { totalSold: -1 } }
        //     ])


        // const topCategories=await Order.aggregate([
        //     {$unwind:"$orderItems"},
        //     {$match:{itemStatus:DELIVERY_STATUS.DELIVERED}},
        //     {$lookup:{
        //         foreignField:"_id",
        //         from:"products",
        //         localField:"orderItems.productId",
        //         as:"product"
        //     }},
        //     {$unwind:"$product"},
        //     {$}

        // ])
        


    return res.render("./admin/dashboard", {
            title: "Admin Dashboard",
            topProducts
            });
  } catch (error) {
        res.redirect("/admin/page-error");
  }
};

module.exports = {
    loadDashboard
};





