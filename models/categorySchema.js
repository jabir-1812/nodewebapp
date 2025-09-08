const mongoose=require('mongoose')
const {Schema}=mongoose;

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        validate: {
            validator: async function(value) {
                const count = await this.constructor.countDocuments({
                    name: { $regex: new RegExp(`^${value}$`, 'i') },
                    _id: { $ne: this._id }, // Exclude current document during update
                });
                return count === 0;
            },
            message: 'Category name already exists (case insensitive)'
        }
    },
    description: {
        type: String,
        trim: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    offer:{
        type:Number,
        default:0
    }
}, {
    timestamps: true
});

const Category=mongoose.model("Category",categorySchema);
module.exports=Category;

// const categorySchema=new mongoose.Schema({
//     name:{
//         type:String,
//         required:true,
//         unique:true,
//         trim:true,
//         validate: {
//             validator: async function(value) {
//                 const count = await this.constructor.countDocuments({
//                     name: { $regex: new RegExp(`^${value}$`, 'i') },
//                     _id: { $ne: this._id }, // Exclude current document during update
//                     isDeleted: false
//                 });
//                 return count === 0;
//             },
//             message: 'Category name already exists (case insensitive)'
//         }
//     },
//     description:{
//         type:String,
//         required:true
//     },
//     isListed:{
//         type:Boolean,
//         default:true
//     },
//     categoryOffer:{
//         type:Number,
//         default:0
//     },
//     createdAt:{
//         type:Date,
//         default:Date.now
//     }
// })

// const Category=mongoose.model("Category",categorySchema);
// module.exports=Category;