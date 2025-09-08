const express=require('express');
const app=express();
const path=require('path');
const env=require('dotenv').config();
const passport=require('./config/passport')
const db=require('./config/db');
const userRouter=require('./routes/userRouter');
const adminRouter=require('./routes/adminRouter');
const expressLayout=require('express-ejs-layouts')
const session=require('express-session');
const nocache=require('nocache')
db();


app.use(expressLayout);
app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use(nocache());
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))

app.use(passport.initialize());// Start Passport or using passport log in & out features 
app.use(passport.session());// Let Passport store user in session (stay logged in)



app.set('view engine','ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout'); // default layout file: views/layout.ejs
app.use(express.static('public'));


app.use('/',userRouter);
app.use('/admin',adminRouter);


app.listen(process.env.PORT,(err)=>{
    if(err){
        console.log("error starting server:",err)
    }else{
        console.log(`Server is running at : http://localhost:${process.env.PORT}`);
    }
})
