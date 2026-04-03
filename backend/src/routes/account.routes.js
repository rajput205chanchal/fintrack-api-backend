const express =require("express")
const { authMiddleware } = require("../middleware/auth.middleware")
const accountController = require("../controllers/account.controller")

const router = express.Router()

// post /api/accounts/ - create a new account for the authenticated user
// protected route

router.post("/",authMiddleware,accountController.createAccount)

// get accounts
router.get("/",authMiddleware,accountController.getUserAccountsController)

// get /api/accounts/balance/:accountId/transactions - get all transactions for a specific account

router.get("/balance/:accountId/transactions",authMiddleware,accountController.getAccountBalanceController)

module.exports = router