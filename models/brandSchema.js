const mongoose=require("mongoose")
const {Schema}=mongoose;

const brandSchema =new Schema({
    brandName:{
        type:String,
        unique:true,
        required:true,
        validate:{
            validator:async function (value) {
                const count=await this.constructor.countDocuments({
                    brandName:{$regex:new RegExp(`^${value}$`,'i')},
                    _id:{$ne:this._id}
                })
                return count===0;
            },
            message:"Brand name already exists(case insensitive)"
        }
    },
    brandImage:{
        type:[String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    offer:{
        type:Number,
        default:0
    }
})

const Brand=mongoose.model("Brand",brandSchema);
module.exports=Brand;