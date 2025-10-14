const router = require("express").Router()
const adminAuthController = require("../../controller/adminController/adminAuthController");
const { adminProtect } = require("../../middleware/adminProtected");

router
    .post("/Admin-register", adminAuthController.registerAdmin)
    .post("/Admin-login", adminAuthController.loginAdmin)
    .post("/Admin-verifyOtp", adminAuthController.verifyLoginOTP)
    .get("/getAdminProfile", adminProtect, adminAuthController.getAdmin)
    .post("/logout-admin", adminAuthController.logoutAdmin)

module.exports = router;
