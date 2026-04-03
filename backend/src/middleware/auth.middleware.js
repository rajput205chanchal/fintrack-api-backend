const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const tokenBlackListModel = require("../models/blackList.model");

async function authMiddleware(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized,token is missing" });
  }
  const isBlacklisted = await tokenBlackListModel.findOne({ token });
  if (isBlacklisted) {
    return res.status(401).json({ message: "Unauthorized,token is blacklisted" });
  }

  try {
    const secret = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);

    const user = await userModel.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized,user not found" });
    }
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized,invalid token" });
  }
}

async function authSystemMiddleware(req, res, next) {
  // const token = req.cookies.token || req.headers.authorization?.split(" ")[1]
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized,token is missing" });
  }

  const isBlacklisted = await tokenBlackListModel.findOne({ token });
  if (isBlacklisted) {
    return res.status(401).json({ message: "Unauthorized,token is blacklisted" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || process.env.JWT_SECRET);

    const user = await userModel.findById(decoded.userId).select("+systemUser");
    if (!user || !user.systemUser) {
      return res.status(403).json({ message: "Forbidden,not a system user" });
    }
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized,invalid token" });
  }
}



module.exports = {
  authMiddleware,
  authSystemMiddleware,

};
