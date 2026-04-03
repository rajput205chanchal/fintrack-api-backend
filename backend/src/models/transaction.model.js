const mongoose=require("mongoose")

const transactionSchema=new mongoose.Schema({
   
        fromAccount :{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            required: [true, "tranaction must be associated with a from account"],
            index: true 
        },
        toAccount:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            required: [true, "tranaction must be associated with a from account"],
            index: true 
        },
        status:{
            type:String,
            enum:{
                values :["PENDING","COMPLETED","FAILED","REVERSED"],
                message:"staus must be either PENDING,COMPLETED,FAILED or REVERSED",

            },
            default:"PENDING"


        },
        amount:{
            type:Number,
            required:[true,"transaction must have an amount"],
            min:[0.01,"transaction amount must be at least 0.01"]
        },
        idempotencyKey:{
            type:String,
            required:[true,"transaction must have an idempotency key"],
            index:true,
            unique:true
        },
    
    },{
        timestamps:true

    }
);
const transactionModel=mongoose.model("Transaction",transactionSchema)
module.exports=transactionModel
