const User = require("../../models/userSchema");
const Address=require('../../models/addressSchema');
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");
const { response } = require("express");

function generateOTP() {
  const digits = "1234567890";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}


const sendVerificationEmail = async (email, otp) => {
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
      }
    });

    const mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Your OTP for password reset",
      text: `Your OTP is ${otp}`,
      html: `<b><h4>Your OTP:${otp}</h4><br></b>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
};

const securePassword=async (password)=>{
    try {
        const passwordHash=await bcrypt.hash(password,10);
        return passwordHash;
    } catch (error) {
        
    }
}



const getForgotPasswordPage = async (req, res) => {
  try {
    res.render("./user/forgot-password", {
      title: "Forgot Password",
      user: "",
      message:"",
      user:""
    });
  } catch (error) {
    res.redirect("/page-not-found");
  }
};



const forgotEmailValid = async (req, res) => {
  try {
    const { email } = req.body;
    const findUser = await User.findOne({ email: email });
    if (findUser) {
      const otp = generateOTP();
      const emailSent = await sendVerificationEmail(email, otp);
      if (emailSent) {
        req.session.userOtp = otp;
        req.session.email = email;
        res.render("./user/forgot-password-otp", {
          title: "Forgot password OTP",
          user:""
        });
        console.log("OTP:", otp);
      } else {
        res.json({
          success: false,
          message: "Failed to send OTP. Please try again",
        });
      }
    } else {
      res.render("./user/forgot-password", {
        title: "Forgot Password",
        message: "User with this email does not exist",
        user:""
      });
    }
  } catch (error) {
    console.log("error:",error)
    res.redirect("/page-not-found");
  }
};


const verifyForgotPasswordOtp=async (req,res)=>{
    try {
        console.log('verify Forgot Password otp has started')
        const enteredOtp=req.body.otp;
        if(enteredOtp===req.session.userOtp){
            res.json({success:true,redirectUrl:'/reset-password'});
        }else{
            res.json({success:false,message:"OTP not matching"})
        }
    } catch (error) {
        res.status(500).json({success:false,message:"An error occured. Please try again"});
    }
}


const getResetPasswordPage=async (req,res)=>{
    try {
        res.render('./user/reset-password',{title:"Reset password",user:''});
    } catch (error) {
        res.redirect('/page-not-found')
    }
}



const resendOtp=async (req,res)=>{
    try {
        const otp=generateOTP();
        req.session.userOtp=otp;
        const email=req.session.email;
        console.log("Resending OTP to email:",email);
        const emailSent=await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend OTP:",otp);
            res.status(200).json({success:true,message:"Resend OTP successful"});
            
        }
    } catch (error) {
        console.error('Error in resend OTP:',error);
        res.status(500).json({success:false,message:"Internal server error"})
    }
}


const postNewPassword=async (req,res)=>{
    try {
        const {newPass1,newPass2}=req.body;
        const email=req.session.email;
        if(newPass1===newPass2){
            const passwordHash=await securePassword(newPass1);
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHash}}
            )
            res.redirect('/login')
        }else{
            res.render('./user/reset-password',{message:'Password do not match'})
        }
    } catch (error) {
        res.redirect('/page-not-found');
    }
}


const userProfile= async (req,res)=>{
  try {
    const userId=req.session.user || req.session.passport?.user;
    const userData=await User.findById(userId);
    // const addressData=await Address.findOne({userId})

    res.render('./user/profile/2profile',{
      title:"Profile",
      user:userData,
      cartLength:''
    })

  } catch (error) {
    console.log("userProfile() error:",error);
    res.redirect('/page-not-found')
  }
}

const changeUsername= async (req,res)=>{
  try {
    const userId=req.session.user || req.session.passport?.user;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({success:false,message:"User not found"});

    const {username}=req.body;
    await User.findByIdAndUpdate(userId,{name:username});
    res.status(200).json({success:true,username:username})
  } catch (error) {
    console.log("changeUsername() error====>",error);
    res.status(500).json({success:false,message:"Something went wrong"})
  }
}

const changePhoneNumber= async (req,res)=>{
  try {
    const userId=req.session.user || req.session.passport?.user;
    const user =await User.findById(userId)
    if(!user) return res.status(404).json({success:false,message:"User not found"});

    const {phone}=req.body;
    await User.findByIdAndUpdate(userId,{phone:phone});
    res.status(200).json({success:true,phone:phone})
  } catch (error) {
    console.log("changePhoneNumber() error====>",error);
    res.status(500).json({success:false,message:"Something went wrong"})
  }
}


const showAddresses=async (req,res)=>{
  try {
    const userId=req.session.user || req.session.passport?.user;
    const userData=await User.findById(userId);
    const addressData=await Address.findOne({userId})

    res.render('./user/profile/address/addresses',{
      title:"Addresses",
      user:userData,
      userAddress:addressData,
      cartLength:""
    })
  } catch (error) {
    console.log('showAddresses() error===>',error);
    res.redirect('/page-not-found')
  }
}

const loadChangeEmailPage=async (req,res)=>{
  try {
    const userId=req.session.user || req.session.passport?.user;
    const userData=await User.findById(userId);

    res.render('./user/change-email',{
      title:"Change Email",
      user:userData,
      message:"",
      cartLength:userData.cart.length
    })
  } catch (error) {
    console.log("laodChangeEmailPage() error:",error)
    res.redirect('/page-not-found')
  }
}

const changeEmail=async (req,res)=>{
  try {

    const userId=req.session.user || req.session.passport?.user;
    const userData=await User.findById(userId);

    const {email}=req.body;
    const userExists=await User.findOne({email});

    if(userExists){
      const otp=generateOTP();
      const emailSent=await sendVerificationEmail(email,otp);
      if(emailSent){
        req.session.userOtp=otp;
        req.session.userData=req.body;
        req.session.email=email;
        res.render('./user/change-email-otp',{
          title:"OTP verification to change email",
          user:userData,
          cartLength:userData.cart.length
        });
        console.log("Email sent:",email);
        console.log('OTP:',otp)
      }else{
        res.json('email-error')
      }
    }else{
      res.render('./user/change-email',{
        title:"Change Email",
        message:"User with this email is not exists",
        user:userData,
        cartLength:userData.cart.length
      })
    }
  } catch (error) {
    console.log("changeEmail() error:",error)
    res.redirect('/page-not-found');
  }
}

const verifyEmailOtp =async (req,res)=>{
  try {
    const enteredOtp=req.body.otp;
    if(enteredOtp===req.session.userOtp){
      req.session.userData=req.body.userData;
      const userId=req.session.user;
      const userData=await User.findById(userId);
      res.render('./user/new-email',{
        title:"New Email",
        user:req.session.userData,
        cartLength:userData.cart.length
      })
    }else{
      res.render('./user/change-email-otp',{
        title:"Change Email",
        message:"OTP not matching",
        user:req.session.userData,
        cartLength:""
      })
    }
  } catch (error) {
    console.log("verifyEmailOtp() error:",error)
    res.redirect('/page-not-found')
  }
}

const updateEmail=async (req,res)=>{
  try {
    const newEmail=req.body.newEmail;
    const userId=req.session.user;
    await User.findByIdAndUpdate(userId,{email:newEmail});
    res.redirect('/user-profile')
  } catch (error) {
    console.log("updateEmail() error:",error);
    res.redirect('/page-not-found')
  }
}

const laodChangePasswordPage= async (req,res)=>{
  try {
    const userId=req.session.user || req.session.passport?.user;
    const userData=await User.findById(userId);
    res.render('./user/change-password',{
      title:"Change password",
      user:userData,
      cartLength:userData.cart.length
    })
  } catch (error) {
    console.log("changePassword() error:",error);
    res.redirect('/page-not-found')
  }
}

const changePassword=async (req,res)=>{
  try {
    const userId=req.session.user || req.session.passport?.user;
    const userData=await User.findById(userId);

    const {email}=req.body;
    const userExists=await User.findOne({email});
    if(userExists){
      const otp=generateOTP();
      const emailSent=await sendVerificationEmail(email,otp);
      if(emailSent){
        req.session.userOtp=otp;
        req.session.userData=req.body;
        req.session.email=email;
        res.render('./user/change-password-otp',{
          title:"Change Password OTP",
          user:userData,
          cartLength:userData.cart.length

        })
        console.log("OTP:",otp);
      }else{
        res.json({
          success:false,
          message:"Failed to send OTP. Please try again"
        })
      }
    }else{
      res.render('./user/change-password',{
        title:"Change Password",
        message:"User with this email does not exist",
        user:userData,
        cartLength:userData.cart.length
      })
    }
  } catch (error) {
    console.log("changePassword() error:",error)
    res.status(500).json({success:false,message:"An error occured. Please try again later"})
  }
}

const verifyChangePasswordOtp=async (req,res)=>{
  try {
    const enteredOtp=req.body.otp;
    if(enteredOtp===req.session.userOtp){
      res.json({success:true,redirectUrl:'/reset-password'})
    }else{
      res.json({success:false,message:"OTP not matching"})
    }
  } catch (error) {
    console.log("verifyChangePasswordOtp() error:",error)
    res.redirect('/page-not-found')
  }
}

const loadAddAddressPage =async (req,res)=>{
  try {
    const userId=req.session.user || req.session.passport?.user;
    const userData=await User.findById(userId);

    res.render('./user/profile/address/add-address',{
      title:"Add Address",
      user:userData,
      cartLength: userData.cart.length
    })
  } catch (error) {
    console.log("loadAddAddressPage() error:",error)
    res.redirect('/page-not-found');
  }
}


const addAddress=async (req,res)=>{
  try {
    const userId=req.session.user || req.session.passport?.user;
    const userData=await User.findOne({_id:userId});
    // console.log(req.body)
    const {addressType,name,city,landMark,state,pincode,phone,altPhone}=req.body;
    const userAddress=await Address.findOne({userId:userData._id});
    if(!userAddress){
      const newAddress=new Address({
        userId:userData._id,
        address:[{addressType,name,city,landMark,state,pincode,phone,altPhone}]
      })
      await newAddress.save()
      return res.status(200).json({success:true,message:"New address added successfully"})
    }else{
      userAddress.address.push({addressType,name,city,landMark,state,pincode,phone,altPhone})
      await userAddress.save();
      return res.status(200).json({success:true,message:"New address added successfully"})
    }
  } catch (error) {
    console.log("addAddress() error");
    console.log("addAddress() error,Error adding address",error);
    res.status(500).json({success:false,message:"Something went wrong"})
  }
}

const loadEditAddressPage=async (req,res)=>{
  try {
    const addressId=req.query.id;
    const userId=req.session.user || req.session.passport?.user;
    const userData=await User.findOne({_id:userId});
    const currentAddress=await Address.findOne({
      "address._id":addressId
    });

    if(!currentAddress){
      return res.redirect('/page-not-found')
    }

    const addressData=currentAddress.address.find((item)=>{
      return item._id.toString()===addressId.toString();
    })

    if(!addressData){
      return res.redirect('/page-not-found')
    }

    res.render('user/profile/address/edit-address',{
      title:"Edit Address",
      address:addressData,
      user:userData,
      cartLength:userData.cart.length
    })
  } catch (error) {
    console.log("loadEditAddressPage() error:",error)
    res.redirect('/page-not-found')
  }
}

const editAddress=async (req,res)=>{
  try {
    const {addressId,addressType,name,city,landMark,state,pincode,phone,altPhone}=req.body;

    const findAddress=await Address.findOne({'address._id':addressId});

    if(!findAddress){
      return res.status(404).json({success:false,message:"Address not found"})
    }

    await Address.updateOne(
      {'address._id':addressId},
      {$set:{
        "address.$":{
          _id:addressId,
          addressType:addressType,
          name:name,
          city:city,
          landMark:landMark,
          state:state,
          pincode:pincode,
          phone:phone,
          altPhone:altPhone
        }
      }}
    )

    return res.status(200).json({success:true,message:"Address has been updated"})
  } catch (error) {
    console.log("editAddress() error:",error)
    return res.status(500).json({success:false,message:"Something went wrong"})
  }
}

const deleteAddress=async (req,res)=>{
  try {
    const {addressId}=req.body;
    const findAddress=await Address.findOne({"address._id":addressId})
    if(!findAddress){
      return res.status(404).json({success:false,message:'Address not found'})
    }

    await Address.updateOne(
      {"address._id":addressId},
      {
        $pull:{
          address:{
            _id:addressId,
          }
        }
      }
    )
    return res.status(200).json({success:true,message:"Address has been deleted successfully"})
  } catch (error) {
    console.log("deleteAddress() error:",error)
    res.status(500).json({success:false,message:"Something went wrong, Please try later"})
  }
}

module.exports = {
  getForgotPasswordPage,
  forgotEmailValid,
  verifyForgotPasswordOtp,
  getResetPasswordPage,
  resendOtp,
  postNewPassword,
  userProfile,
  changeUsername,
  changePhoneNumber,
  loadChangeEmailPage,
  changeEmail,
  verifyEmailOtp,
  updateEmail,
  laodChangePasswordPage,
  changePassword,
  verifyChangePasswordOtp,
  showAddresses,
  loadAddAddressPage,
  addAddress,
  loadEditAddressPage,
  editAddress,
  deleteAddress
};
