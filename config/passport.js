const passport=require('passport');
const GoogleStrategy=require('passport-google-oauth20').Strategy;//imports google OAuth
                                                                //gets the strategy class to tell Passport how to login
const User=require('../models/userSchema')
const env=require('dotenv').config();


//tells passport to use google login strategy
// we are creating new google strategy
passport.use(new GoogleStrategy({                   
    clientID:process.env.GOOGlE_CLIENT_ID,      //we tell google who we are     
    clientSecret:process.env.GOOGlE_CLIENT_SECRET,
    callbackURL:'/auth/google/callback'         //redirect route after successful user login
},
async (accessToken,refreshToken,profile,done)=>{    //profile=>user info from google
    try {                                           //done()function tells passport "i've finished logging the user"
        let user=await User.findOne({googleId:profile.id});
        if(user){
            return done(null,user);     //null=no error, everything ok
        }else{                          //returning user=>user info from google to passport
            user=new User({             //if user not exist, we create user.
                name:profile.displayName,
                email:profile.emails[0].value,
                googleId:profile.id,
            });
            await user.save();
            return done(null,user);         //returning the user info to passport
        }
    } catch (error) {
        return done(error,null)
    }
}

))



passport.serializeUser((user,done)=>{
    done(null,user.id)  //saving the user.id in the session
});

passport.deserializeUser((id,done)=>{   //it checks the session
    User.findById(id)   //it grabs the user info from session
    .then(user=>{
        done(null,user)
    })
    .catch(err=>{
        done(err.null) // error=runs if there is no session 
    })
})

module.exports=passport;














