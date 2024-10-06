const jwt = require("jsonwebtoken");
const initializeConnections = require("../config/db");

module.exports = async(req, res, next) => {
  const { ApplicationSecret } = await initializeConnections();
  try {
    const decoded = jwt.verify(
      req.headers.authorization,
      ApplicationSecret.secret.JWT_SECRET
    );
    req.userData = decoded; // DO SOMETHING WITH LOGGED IN USER DATA
    next();
  } catch (err) {
    return res.status(401).json({
      msg: "Authorization token missing or invalid",
      data: null,
    });
  }
};
