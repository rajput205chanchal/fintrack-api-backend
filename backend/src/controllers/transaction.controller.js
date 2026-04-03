const transactionMOdel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const acountModel = require("../models/account.model");
const emailService = require("../services/email.service");
const mongoose = require("mongoose");

// create a new transaction
// the 10 steps to follow when creating a transaction
// 1. validate the request body
// 2.validate idempontency key
// 3 check  acconunt status
// 4 derive sender balance from ledger
// 5 create a transaction with status pending
// 6 create a debit ledger entry for the sender
// 7 create a credit ledger entry for the receiver
// 8 update transaction status to completed
// 9 commint mongodb session
// 10 return response to client in email
//  notification

async function createTransaction(req, res) {
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body;
  if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({ message: "All fields are required" });
  }

  let session;
  try {
    const fromUserAccount = await acountModel.findOne({ _id: fromAccount });
    const toUserAccount = await acountModel.findOne({ _id: toAccount });
    if (!fromUserAccount || !toUserAccount) {
      return res.status(404).json({ message: "Account not found" });
    }

    const istransactionExist = await transactionMOdel.findOne({ idempotencyKey });
    if (istransactionExist) {
      if (istransactionExist.status === "COMPLETED")
        return res.status(200).json({ message: "Transaction is already completed" });
      if (istransactionExist.status === "PENDING")
        return res.status(200).json({ message: "Transaction is pending" });
      if (istransactionExist.status === "FAILED")
        return res.status(400).json({ message: "Transaction has failed" });
      if (istransactionExist.status === "REVERSED")
        return res.status(400).json({ message: "Transaction is reversed, please retry" });
    }

    const isActive = (acc) => !acc.status || acc.status === "active";
    if (!isActive(fromUserAccount) || !isActive(toUserAccount)) {
      return res.status(400).json({ message: "account of user or receiver is not active" });
    }

    const balance = await fromUserAccount.getBalance();
    if (balance < amount) {
      return res.status(400).json({
        message: `Insufficient balance. Your current balance is ${balance}. Required amount is ${amount}`,
      });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const transaction = (
      await transactionMOdel.create(
        [{ fromAccount, toAccount, amount, idempotencyKey, status: "PENDING" }],
        { session },
      )
    )[0];

    await ledgerModel.create(
      [{ account: fromAccount, amount, type: "DEBIT", transaction: transaction._id }],
      { session },
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    await ledgerModel.create(
      [{ account: toAccount, amount, type: "CREDIT", transaction: transaction._id }],
      { session },
    );

    transaction.status = "COMPLETED";
    await transaction.save({ session });
    await session.commitTransaction();
    session.endSession();

    emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount).catch(
      (err) => console.error("Transaction email failed:", err)
    );

    return res.status(201).json({ message: "Transaction completed successfully", transaction });
  } catch (err) {
    if (session) {
      await session.abortTransaction().catch(() => { });
      session.endSession();
    }
    console.error("createTransaction error:", err);
    return res.status(500).json({ message: "Transaction failed. Please try again." });
  }
}

async function createInitialFundsTransaction(req, res) {
  const { toAccount, amount, idempotencyKey } = req.body;

  if (!toAccount || !amount || !idempotencyKey) {
    return res
      .status(400)
      .json({ message: "toAccount, amount and idempotencyKey are required" });
  }
  // Use correct model name: acountModel (as per top import)
  const toUserAccount = await acountModel.findById(toAccount);

  if (!toUserAccount) {
    return res.status(404).json({ message: "toAccount not found" });
  }

  const fromUserAccount = await acountModel.findOne({
    user: req.user._id,
    // systemUser: true,
  });
  if (!fromUserAccount) {
    return res.status(404).json({ message: "System account not found" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  // Use correct model name: transactionMOdel (as per top import)
  const transaction = await transactionMOdel.create(
    [
      {
        fromAccount: fromUserAccount._id,
        toAccount: toUserAccount._id,
        amount,
        idempotencyKey,
        status: "PENDING",
      },
    ],
    { session },
  );

  await ledgerModel.create(
    [
      {
        account: fromUserAccount._id,
        amount,
        type: "DEBIT",
        transaction: transaction[0]._id,
      },
      {
        account: toUserAccount._id,
        amount,
        type: "CREDIT",
        transaction: transaction[0]._id,
      },
    ],
    { session },
  );

  // Update transaction status to COMPLETED
  transaction[0].status = "COMPLETED";
  await transaction[0].save({ session });

  await session.commitTransaction();
  session.endSession();

  // Send email notification
  await emailService.sendTransactionEmail(
    req.user.email,
    req.user.name,
    amount,
    toUserAccount._id,
  );

  return res.status(201).json({
    message: "Initial funds transaction completed successfully",
    transaction: transaction[0],
  });
}
async function getUserTransactions(req, res) {
  try {
    const accounts = await acountModel.find({ user: req.user._id });
    const accountIds = accounts.map((a) => a._id);
    const transactions = await transactionMOdel
      .find({
        $or: [
          { fromAccount: { $in: accountIds } },
          { toAccount: { $in: accountIds } },
        ],
      })
      .populate({ path: "fromAccount", populate: { path: "user", select: "name email" } })
      .populate({ path: "toAccount", populate: { path: "user", select: "name email" } })
      .sort({ createdAt: -1 })
      .limit(200);
    res.status(200).json({ transactions });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
}

module.exports = {
  createTransaction,
  createInitialFundsTransaction,
  getUserTransactions,
};
