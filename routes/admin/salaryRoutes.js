const router = require("express").Router();
const salaryController = require("../../controller/adminController/salaryController");
const { adminProtect } = require("../../middleware/adminProtected");
const { protectTeacher } = require("../../middleware/teacherProtected");

router
.post("/createSalaryPayment", adminProtect, salaryController.createSalaryPayment)
.get("/getAllPayments", adminProtect, salaryController.getAllPayments)
.get("/getPaymentById/:id", adminProtect, salaryController.getPaymentById)
.put("/updateSalary/:id", adminProtect, salaryController.updateSalary)
.delete("/deletePayment/:id", adminProtect, salaryController.deletePayment)
.get("/getSalaryTeachers", adminProtect, salaryController.getSalaryTeachers)

// Teacher Route (view own salary)
.get("/teacherSalary", protectTeacher, salaryController.getTeacherSalaryRecords)

module.exports = router;
