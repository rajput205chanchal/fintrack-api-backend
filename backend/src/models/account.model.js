const mongoose = require('mongoose');
const ledgerModel = require("./ledger.model");

const accountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User is required"],
    index: true
  },
  status: {
    type: String,
    enum: {
      values: ["active", "frozen", "closed"],
      message: "Status must be either active, frozen, or closed",
    },
    default: "active"
  },
  currency: {
    type: String,
    required: [true, "Currency is required"],
    default: "INR"
  }
},
  {
    timestamps: true
  }


);

// To ensure that each user can only have one account with a specific status, we can create a compound index on the `user` and `status` fields. This will enforce the uniqueness of the combination of these two fields.
accountSchema.index({ user: 1, status: 1 }, { unique: true })

accountSchema.methods.getBalance = async function () {

  const balanceData = await ledgerModel.aggregate([
    {
      $match: {
        account: this._id
      }
    },
    {
      $group: {
        _id: null,
        totalDebit: {
          $sum: {
            $cond: [
              { $eq: ["$type", "DEBIT"] }, "$amount",
              0]
          }

        },
        totalCredit: {
          $sum: {
            $cond: [
              { $eq: ["$type", "CREDIT"] },
              "$amount",
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        balance: { $subtract: ["$totalCredit", "$totalDebit"] }
      }
    }
  ])

  if (balanceData.length === 0) {
    return 0
  }
  return balanceData[0].balance;

}

const accountModel = mongoose.model("Account", accountSchema);

module.exports = accountModel;