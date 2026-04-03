const mongoose=require("mongoose")

const ledgerSchema=new mongoose.Schema({
    account:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Account",
        required:[true,"ledger entry must be associated with an account"],
        index:true,
        immutable:true


        },
        amount:{
            type:Number,
            required:[true,"ledger entry must have an amount"],
            min:[0.01,"ledger entry amount must be at least 0.01"],
            immutable:true
        },
        transaction:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Transaction",
            required:[true,"ledger entry must be associated with a transaction"],
            index:true,
            immutable:true
        },
        type:{
            type:String,
            enum:{
                values:["DEBIT","CREDIT"],
                message:"ledger entry type must be either DEBIT or CREDIT"
            },
            required:[true,"ledger entry must have a type"],
            immutable:true
        }
})

function preventLedgerModification(){
    throw new Error("Ledger entries cannot be modified or deleted");
}
ledgerSchema.pre('findOneAndUpdate',preventLedgerModification),
ledgerSchema.pre('findOneAndDelete',preventLedgerModification),
ledgerSchema.pre('deleteOne',preventLedgerModification),
ledgerSchema.pre('deleteMany',preventLedgerModification),
ledgerSchema.pre('updateOne',preventLedgerModification),
ledgerSchema.pre('remove',preventLedgerModification),
ledgerSchema.pre('updateMany',preventLedgerModification),
ledgerSchema.pre('findOneAndReplace',preventLedgerModification)


const ledgerModel=mongoose.model("Ledger",ledgerSchema)

module.exports=ledgerModel;