const router = require("express").Router();
const scheduleController = require("../../controller/adminController/scheduleController");
const { adminProtect } = require("../../middleware/adminProtected");
const { protectTeacher } = require("../../middleware/teacherProtected");

router
    .get("/getSchedules", adminProtect, scheduleController.getSchedules)
    .get("/getScheduleTeachers", adminProtect, scheduleController.getAllTeachers)
    .get("/getTodaysSchedules", adminProtect, scheduleController.getTodaysSchedules)
    .post("/createSchedule", adminProtect, scheduleController.createSchedule)
    .get("/getScheduleById/:id", adminProtect, scheduleController.getScheduleById)
    .put("/updateSchedule/:id", adminProtect, scheduleController.updateSchedule)
    .delete("/deleteSchedule/:id", adminProtect, scheduleController.deleteSchedule)

//teacher
 .get("/getTeacherSchedules", protectTeacher, scheduleController.getTeacherSchedules)

module.exports = router;
