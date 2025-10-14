const router = require("express").Router();
const dashboardController = require("../../controller/adminController/dashboardController");
const { adminProtect } = require("../../middleware/adminProtected");


router
.get("/getDashboardStats", adminProtect, dashboardController.getDashboardStats)

module.exports = router;
