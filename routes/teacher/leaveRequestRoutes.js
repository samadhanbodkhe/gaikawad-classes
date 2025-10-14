const router = require("express").Router();
const leaveRequestController = require("../../controller/teacherController/leaveRequestController");
const { adminProtect } = require("../../middleware/adminProtected");
const { protectTeacher } = require("../../middleware/teacherProtected");

router
.post("/createLeaveRequest", protectTeacher, leaveRequestController.createLeaveRequest)
.get("/getLeaveRequests", adminProtect, leaveRequestController.getLeaveRequests)
.put("/processLeaveRequest/:id", adminProtect, leaveRequestController.processLeaveRequest)
.get("/getLeaveRequestsByTeacher", protectTeacher, leaveRequestController.getLeaveRequestsByTeacher)

module.exports = router;
