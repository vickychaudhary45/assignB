const express = require("express");
const auth = require('../../../helpers/auth.js');
const router = express.Router();
const UsersController = require("../controllers/UsersController");

// FETCH ALL USERS
router.post("/list", auth, UsersController.getUsers);
router.post("/add", auth, UsersController.add);
router.post("/edit", auth, UsersController.edit);
router.post("/delete", auth, UsersController.delete);
router.post("/quickview", auth, UsersController.quickView);
router.get("/privileges", UsersController.getPrivileges);
router.post("/user_details", auth, UsersController.getUserById);

router.post("/add-form", auth, UsersController.addForm);
router.get("/get-form", auth, UsersController.fetchForms);

module.exports = router;
