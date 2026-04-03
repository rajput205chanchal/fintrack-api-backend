const accountModel = require("../models/account.model")
const ledgerModel = require("../models/ledger.model")
const transactionModel = require("../models/transaction.model")

async function createAccount(req, res) {
    const user = req.user;
    const account = await accountModel.create({ user: user._id })

    const openingTx = await transactionModel.create({
        fromAccount: account._id,
        toAccount: account._id,
        amount: 100,
        idempotencyKey: `opening_${account._id}`,
        status: "COMPLETED",
    })

    await ledgerModel.create({
        account: account._id,
        amount: 100,
        type: "CREDIT",
        transaction: openingTx._id,
    })

    res.status(201).json({
        account
    })
}

async function getUserAccountsController(req, res) {
    try {
        const accounts = await accountModel.find({ user: req.user._id })
        res.status(200).json({ accounts })
    } catch (err) {
        console.error("getUserAccounts error:", err);
        res.status(500).json({ message: "Failed to fetch accounts" });
    }
}
async function getAccountBalanceController(req, res) {
    try {
        const accountId = req.params.accountId;

        const account = await accountModel.findOne({
            _id: accountId,
            user: req.user._id
        })

        if (!account) {
            return res.status(404).json({ message: "Account not found" });
        }

        const balance = await account.getBalance();
        res.status(200).json({ accountId: account._id, balance });
    } catch (err) {
        console.error("getAccountBalance error:", err);
        res.status(500).json({ message: "Failed to fetch balance" });
    }
}
module.exports = {
    createAccount,
    getUserAccountsController,
    getAccountBalanceController,
};