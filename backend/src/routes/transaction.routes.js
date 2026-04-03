const { Router } = require("express");

const authMiddleware = require("../middleware/auth.middleware")

const transactionRoutes = Router()
const transactionController = require("../controllers/transaction.controller");

transactionRoutes.get(
  "/",
  authMiddleware.authMiddleware,
  transactionController.getUserTransactions
);

transactionRoutes.post(
  "/",
  authMiddleware.authMiddleware,
  transactionController.createTransaction
);


// post /api/transactions/system/initial-funds

transactionRoutes.post(
  "/system/initial-funds",
  authMiddleware.authSystemMiddleware,
  transactionController.createInitialFundsTransaction
);


module.exports = transactionRoutes;
