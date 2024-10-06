const express = require("express");
const auth = require('../../../helpers/auth.js');
const router = express.Router();

const RolesController = require("../controllers/RolesController");

// FETCH ALL CAPABILITIES
router.get("/capabilities/list", auth, RolesController.capabilities);
router.get("/list", auth, RolesController.getRoles);
router.get("/:role_id", auth, RolesController.getRoleById);
router.post("/create", auth, RolesController.store);
router.put("/update/:role_id", auth, RolesController.update);
router.delete("/delete/:role_id", auth, RolesController.delete);


module.exports = router;
``