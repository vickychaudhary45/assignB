const express = require("express");
const auth = require('../../../helpers/auth.js');
const router = express.Router();

const EmailApiRoutes = require("../controllers/EmailNotificationController");

// FETCH ALL USERS
router.get('/options', auth, EmailApiRoutes.get);
router.post('/options/update', auth, EmailApiRoutes.update);

module.exports = router;