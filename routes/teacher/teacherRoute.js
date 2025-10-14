const express = require("express");
const router = express.Router();
const upload = require("../../middleware/multer");
const teacherController = require("../../controller/teacherController/teacherAuthController");
const { protectTeacher } = require("../../middleware/teacherProtected");

const uploadFields = upload.fields([
  { name: "documents", maxCount: 5 },
  { name: "profileImage", maxCount: 1 },
]);

router
  .post("/register-teacher", upload.array("documents", 5), teacherController.registerTeacher)
  .post("/login-teacher", teacherController.loginTeacher)
  .post("/verify-otp-teacher", teacherController.verifyLoginOTP)
  .get("/get-profile-teacher", protectTeacher, teacherController.getTeacher)
  .put("/update-profile-teacher", uploadFields, protectTeacher, teacherController.updateTeacher)
  .delete("/delete-teacher", protectTeacher, teacherController.deleteTeacher)
  .post("/logout", protectTeacher, teacherController.logoutTeacher);

module.exports = router;
