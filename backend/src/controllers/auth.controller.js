const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const { sendRegistrationEmail } = require("../services/email.service");
const tokenBlackListModel = require("../models/blackList.model");

// User Registration Controller
async function userRegisterController(req, res) {
  const { email, password, name } = req.body;

  const isExist = await userModel.findOne({ email });

  //   console.log("checking email:", email);
  //   console.log("found user:", isExist);

  if (isExist) {
    return res.status(422).json({
      message: "User already exist",
      status: "Failed",
    });
  }

  const user = await userModel.create({
    email,
    password,
    name,
  });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY || process.env.JWT_SECRET, {
    expiresIn: "3d",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 3 * 24 * 60 * 60 * 1000,
  });

  // EMAIL SEND
  sendRegistrationEmail(user.email, user.name).catch((err) =>
    console.error("Registration email failed:", err)
  );

  res.status(201).json({
    user: {
      name: user.name,
      email: user.email,
      id: user._id,
    },
    token,
  });
}

// User Login Controller
async function userLoginController(req, res) {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email }).select("+password");

  if (!user) {
    return res.status(401).json({
      message: "User not found",
      status: "Failed",
    });
  }

  const isValidPassword = await user.comparePassword(password);

  if (!isValidPassword) {
    return res.status(401).json({
      message: "Invalid credentials",
      status: "Failed",
    });
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY || process.env.JWT_SECRET, {
    expiresIn: "3d",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 3 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    user: {
      name: user.name,
      email: user.email,
      id: user._id,
    },
    token,
  });
}

// user logout controller

async function userLogoutController(req, res) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(400).json({
      message: "Token not found",
      status: "Failed"
    })
  }

  await tokenBlackListModel.create({ token: token })
  res.clearCookie("token");
  res.status(200).json({
    message: "Logout successful"
  })
}
module.exports = {
  userRegisterController,
  userLoginController,
  userLogoutController
}
