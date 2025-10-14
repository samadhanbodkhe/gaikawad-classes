const router = require("express").Router()
const studentController = require("../../controller/teacherController/studentController");
const { protectTeacher } = require("../../middleware/teacherProtected");

router
.post("/createStudent", protectTeacher, studentController.createStudent)
.get("/getAllStudents", studentController.getAllStudents)
.get("/getFeeSummary", protectTeacher, studentController.getFeeSummary)
.get("/getStudentById/:id", protectTeacher, studentController.getStudentById)
.put("/updateStudent/:id", protectTeacher, studentController.updateStudent)
.delete("/deleteStudent/:id", protectTeacher, studentController.deleteStudent)

module.exports = router;
