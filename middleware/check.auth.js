const jwt = require("jsonwebtoken");

const constants = require("../utils/constants");
const logger = require("../modules/logger.js");
const status = require("../utils/status");

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      logger.info("Authentication failed!");
      return res.status(403).json({ status: status.AUTH_FAIL });
    }
    const decodedToken = jwt.verify(token, constants.JWT_SECRET);
    req.userData = {
      userId: decodedToken.userId,
      mobile: decodedToken.mobile,
      name: decodedToken.name,
    };
    // Authorization: 'Bearer TOKEN' Header
    next();
  } catch (err) {
    logger.info("Authentication failed!");
    return res.status(403).json({ status: status.AUTH_FAIL });
  }
};
