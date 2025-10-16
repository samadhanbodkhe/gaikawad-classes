const express = require("express");
const router = express.Router();
const TeacherApprove = require("../../controller/adminController/TeacherApprove");
const { adminProtect } = require("../../middleware/adminProtected");

router
  .get("/teacher-requests", adminProtect, TeacherApprove.getPendingTeacherRequests)
  .get("/getAllTeachers", adminProtect, TeacherApprove.getAllTeachers)
  .get("/teacher-details/:id", adminProtect, TeacherApprove.getTeacherDetails)
  .put("/teacherApprove/:requestId", adminProtect, TeacherApprove.approveTeacherRequest)
  .put("/teacherReject/:requestId", adminProtect, TeacherApprove.rejectTeacherRequest);

module.exports = router;