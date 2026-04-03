const express = require("express");
const authController =require("../controllers/auth.controller")
const router = express.Router();

// Post/api/auth/register
       
router.post("/register",authController.userRegisterController);

// Post/api/auth/login
router.post("/login",authController.userLoginController);
// auth logout 
router.post("/logout",authController.userLogoutController)


module.exports = router;
