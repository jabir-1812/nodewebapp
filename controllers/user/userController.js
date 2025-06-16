const User=require('../../models/userSchema');
const nodemailer=require('nodemailer');
const env=require('dotenv').config();
const bcrypt=require('bcrypt')


const pageNotFound=async (req,res) => {
    try {
        res.render("./user/page-404",{title:"Page not found"})
    } catch (error) {
        res.redirect('/page-not-found')
    }
}



const loadSignup=async(req,res)=>{
    try {
        return res.render('./user/signup',{title:"Sign Up",message:""});
    } catch (error) {
        console.log("Home page not loading:",error)
        res.status(500).send("Server Error")
    }
}



function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // <-- Add this line to ignore self-signed cert errors
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP: ${otp}</b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
}


// const signup =async(req,res)=>{
//     try {
//         const {name,email,phone,password} =req.body;
//         const user=await User.findOne({email});

//         if(user){
//             return res.render('./user/signup',{title:"Sign Up",message:"This email already has an account"})
//         }

//         const otp=generateOTP();

//         const emailSent=await sendVerificationEmail(email,otp);
//         if(!emailSent){
//             return res.json("email-error")
//         }

//         req.session.userOtp=otp;
//         req.session.userData={email,password};

//         // res.render('verify-otp');
//         console.log("OTP Sent:",otp)
//     } catch (error) {
//         console.error("sign up error:",error)
//         res.redirect('/pageNotFound');
//     }
// }


const signup =async(req,res)=>{
    try {
        const {name,email,phone,password} =req.body;
        const user=await User.findOne({email});

        if(user){
            return res.render('./user/signup',{title:"Sign Up",message:"This email already has an account"})
        }

        const otp=generateOTP();

        const emailSent=await sendVerificationEmail(email,otp);
        if(!emailSent){
            return res.json("email-error")
        }

        req.session.userOtp=otp;
        req.session.userData={name,email,phone,password};

        res.render('./user/otp-verification',{title:"OTP Verification"});
        console.log("OTP Sent:",otp)
    } catch (error) {
        console.error("sign up error:",error)
        res.redirect('/pageNotFound');
    }
}

const securePassword=async (password)=>{
    try {
        const passwordHash=await bcrypt.hash(password,10)
        return passwordHash;
    } catch (error) {
        
    }
}

const verifyOtp=async(req,res)=>{
    try {
        const {otp}=req.body;

        if(otp === req.session.userOtp){
            const user=req.session.userData;
            const passwordHash=await securePassword(user.password);

            const saveUserData=new User({
                name:user.name,
                email:user.email,
                phone:user.phone,
                password:passwordHash
            })

            await saveUserData.save();
            req.session.user=saveUserData._id;
            res.json({success:true,redirectUrl:"/"})
        }else{
            res.status(400).json({success:false,message:"Invalid OTP, Please try again"})
        }
    } catch (error) {
        console.error("Error Verifying OTP",error);
        res.status(500).json({success:false,message:"An error occued"})
    }
}

const resendOtp=async (req,res)=>{
    try {
        const {email}=req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})
        }

        const otp=generateOTP();
        req.session.userOtp=otp;

        const emailSent=await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend OTP:",otp);
            res.status(200).json({success:true,message:"OTP Resend Successfully"})
        }else{
            res.status(500).json({success:false,message:"Failed to resend to OTP. Please try again"})
        }
    } catch (error) {
    console.error("Error resending OTP",error);
    res.status(500).json({success:false,message:"Internal Server Error. Please try again"})        
    }
}


const laodLogin=async (req,res)=>{
    try {
        if(!req.session.user){
            return res.render('./user/login',{title:"Log in",message:"",passwordMsg:""})
        }else{
            res.redirect('/')
        }
    } catch (error) {
        res.redirect('/page-not-found')
    }
}

const login=async (req,res)=>{
    try {

        const {email,password}=req.body;

        const findUser=await User.findOne({isAdmin:0,email:email});

        
        if(!findUser){
            return res.render('./user/login',{title:"Log in",message:"User not found",passwordMsg:""})
        }


        if(findUser.isBlocked){
           return res.render('./user/login',{title:'Log in',message:'User is blocked by admin',passwordMsg:""})
        }

        const passwordMatch=await bcrypt.compare(password,findUser.password);

        if(!passwordMatch){
            return res.render('./user/login',{title:"Login",message:"",passwordMsg:"Incorrect Password"})
        }

        req.session.user=findUser._id;
        res.redirect('/')


    } catch (error) {
        console.log("login error:",error)
        res.render('./user/login',{title:"Login",message:"Login failed, Please try again later",passwordMsg:""})
    }
}

const loadShopping=async (req,res)=>{
    try{
        return res.render('shop')
    }catch(error){
        console.log("Shopping page not loading:",error)
        res.status(500).send("Server Error");
    }
}


const loadHomepage=async (req,res)=>{
    try {

        const user=req.session.user;
        if(user){
            const userData=await User.findOne({_id:user});
            res.render('./user/home',{title:"Home",user:userData})
        }else{
            return res.render('./user/home',{title:"Home",user:""});
        }
        
    } catch (error) {
        console.log('Home page not found')
        res.status(500).send("Server error")
    }
}


const logout=async (req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("Session destruction error:",err.message);
                return res.redirect('/page-not-found')
            }
            return res.redirect('/login')
        })
    } catch (error) {
        console.log("Logout error:",error)
        res.redirect('/page-not-found')
    }
}


module.exports ={
    loadHomepage,
    pageNotFound,
    loadSignup,
    // loadShopping,
    signup,
    verifyOtp,
    resendOtp,
    laodLogin,
    login,
    logout
}