const User=require('../models/userSchema');


// const userAuth=(req,res,next)=>{
//     if(req.session.user){
//         User.findById(req.session.user)
//         .then(data=>{
//             if(data && !data.isBlocked){
//                 next();
//             }else{
//                 res.redirect('/login')
//             }
//         })
//         .catch(error=>{
//             console.log("Error in user auth middleware")
//             res.status(500).send("Internal server error")
//         })
//     }else{
//         res.redirect('/login')
//     }
// }
const userAuth = async (req, res, next) => {
    try {
        // 1. Check if session exists
        if (!req.session.user) {
            console.log("if case working==========***")
            // If it's an AJAX request, send JSON instead of redirect
            if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
                return res.status(401).json({ status: false, message: 'Login required' });
            }

            return res.redirect('/login');
        }

        // 2. Check if user exists in DB
        const user = await User.findById(req.session.user);
        if (!user) {
            return res.redirect('/login');
        }

        // 3. Check if user is blocked
        if (user.isBlocked) {
            return res.redirect('/login');
        }

        // ✅ Everything is fine → allow request
        next();
    } catch (err) {
        console.log("Error in userAuth:", err);
        res.status(500).send("Internal Server Error");
    }
};



// const adminAuth=(req,res,next)=>{
//     User.findOne({isAdmin:true})
//     .then(data=>{
//         if(data){
//             next();
//         }else{
//             res.redirect('/admin/login')
//         }
//     })
//     .catch(error=>{
//         console.log("Error in admin auth middleware")
//         res.status(500).send("Internal Server Error")
//     })
// }

const adminAuth = async (req, res, next) => {
    try {
        console.log('session=======>',req.session)
        // 1. Check if session exists
        if (!req.session.admin) {
            return res.redirect('/admin/login');
        }

        // 2. Get user from DB
        const admin = await User.findById(req.session.admin);
        if (!admin) {
            return res.redirect('/admin/login');
        }

        // 3. Check if user is admin
        if (!admin.isAdmin) {
            return res.redirect('/admin/login');
        }

        // 4. Check if admin is blocked
        if (admin.isBlocked) {
            return res.redirect('/admin/login');
        }

        // ✅ Passed all checks → continue
        next();
    } catch (err) {
        console.log("Error in adminAuth:", err);
        res.status(500).send("Internal Server Error");
    }
};




module.exports={
    userAuth,
    adminAuth
}