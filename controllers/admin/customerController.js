const User=require('../../models/userSchema');

const customerInfo=async (req,res)=>{
    try {
        let search="";
        if(req.query.search){
            search=req.query.search;
        }
        let page=1;
        if(req.query.page){
            page=req.query.page;
        }
        const limit=3;
        const userData=await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:".*"+search+".*"}},
                {email:{$regex:".*"+ search +".*"}}
            ]
        })
        .limit(limit*1)
        .skip((page-1)*limit)
        .exec();

        const count=await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:".*"+search+".*"}},
                {email:{$regex:".*"+ search +".*"}}
            ]
        }).countDocuments();
        res.render('./admin/customers',{
            title:"Customers",
            data:userData,
            totalPages:Math.ceil(count/limit),
            currentPage:page
        })
    } catch (error) {
        
    }
}

const customerBlocked=async (req,res)=>{
    try {
        let id=req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/admin/page-error')
    }
}

const customerUnBlocked=async (req,res)=>{
    try {
        let id=req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/admin/page-error')
    }
}

module.exports={
    customerInfo,
    customerBlocked,
    customerUnBlocked
}