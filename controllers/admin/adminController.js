const User=require('../../models/userSchema');
const mongoose=require('mongoose');
const bcrypt=require('bcrypt');


const loadLogin=(req,res)=>{
    if(req.session.admin){
        return res.redirect('/admin')
    }
    res.render('./admin/admin-login',{title:"Admin Login",message:null})
}


const login=async (req,res)=>{
    try {
        const {email,password}=req.body;
        const admin=await User.findOne({email,isAdmin:true});
        if(admin){
            
            const passwordMatch=bcrypt.compare(password,admin.password);
            if(passwordMatch){
                req.session.admin=true;
                return res.redirect('/admin')
            }else{
                return res.redirect('/admin/login')
            }

        }else{
            return res.redirect('/admin/login')
        }
    } catch (error) {
    console.log("Login error:",error)
    return res.redirect('/admin/page-error')        
    }
}


const loadDashboard = async (req, res) => {
  try {
    if (req.session.admin) {
     return res.render("./admin/dashboard", { title: "Admin Dashboard" });
    }
    else{
        return res.redirect('/admin/login')
    }
  } catch (error) {
    res.redirect("/admin/page-error");
  }
};


const logout=async (req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err){
                console.log("Error destroying session:",err)
                return res.redirect('/admin/page-error')
            }
            res.redirect('/admin/login')
        })
    } catch (error) {
        console.log("Unexpected error during logout,",error)
        res.redirect('/admin/page-error')
    }
}


const pageError=async (req,res)=>{
    res.render('./admin/page-error',{title:"Page not found"})
}


module.exports={
    loadLogin,
    login,
    loadDashboard,
    logout,
    pageError
}