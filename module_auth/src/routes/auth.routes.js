const express = require("express");

const router = express.Router();

const LoginController = require("../controllers/LoginController");

// LOGIN USING EMAIL/PASSWORD
router.post("/login", LoginController.login);

// LOGOUT USER AND STORE LOGOUT DETAILS
router.post("/logout", LoginController.logout);

module.exports = router;
