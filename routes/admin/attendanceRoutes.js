const router = require("express").Router();
const attendanceController = require("../../controller/adminController/attendanceController");
const { adminProtect } = require("../../middleware/adminProtected");
const { protectTeacher } = require("../../middleware/teacherProtected");

// Admin routes
router
  .get("/getAttendances", adminProtect, attendanceController.getAttendances)
  .post("/markAttendance", adminProtect, attendanceController.markAttendance)
  .get("/getAttendanceById/:id", adminProtect, attendanceController.getAttendanceById)
  .get("/getAttendanceTeachers", adminProtect, attendanceController.getAttendanceTeachers);

// Teacher routes
router
  .get("/getTeacherAttendance", protectTeacher, attendanceController.getTeacherAttendance);

module.exports = router;
