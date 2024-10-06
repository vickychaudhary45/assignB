const express = require("express");
const auth = require('../../../helpers/auth.js');
const router = express.Router();

const DashboardController = require("../controllers/DashboardController");

//dashboard data
router.get("/counts", DashboardController.dashboardCounts);
router.put("/update-feedback-form" , auth, DashboardController.updateFeedbackForm);

module.exports = router;
