// routes/teacher/studentAttendanceRoutes.js
const router = require("express").Router();
const attendanceController = require("../../controller/teacherController/studentAttendanceController");
const { protectTeacher } = require("../../middleware/teacherProtected");

router.post("/mark-attendance", protectTeacher, attendanceController.markAttendance);
router.put("/toggle-attendance/:attendanceId", protectTeacher, attendanceController.toggleAttendance);
router.get("/class-attendance/:className/:section/:date", protectTeacher, attendanceController.getClassAttendance);
router.get("/student-history/:studentId", protectTeacher, attendanceController.getStudentHistory);
router.get("/monthly-summary", protectTeacher, attendanceController.getMonthlySummary);
router.get("/generate-pdf/:studentId", protectTeacher, attendanceController.generateAttendancePDF);

module.exports = router;