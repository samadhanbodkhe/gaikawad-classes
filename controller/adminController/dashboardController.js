const asyncHandler = require("express-async-handler");
const Teacher = require("../../models/teacher/Teacher");
const PaymentHistory = require("../../models/admin/PaymentHistory");
const LeaveRequest = require("../../models/teacher/LeaveRequest");
const Attendance = require("../../models/admin/Attendance");
const Schedule = require("../../models/admin/Schedule");

exports.getDashboardStats = asyncHandler(async (req, res) => {
  try {
   
    const totalTeachers = await Teacher.countDocuments({ isApproved: true });

    const pendingSalaries = await PaymentHistory.countDocuments({
      paymentStatus: { $ne: "paid" }
    });

    const salaryAggregation = await PaymentHistory.aggregate([
      { $match: { paymentStatus: { $ne: "paid" } } },
      { $group: { _id: null, totalPending: { $sum: "$grossSalary" } } }
    ]);
    const totalPendingSalary =
      salaryAggregation.length > 0 ? salaryAggregation[0].totalPending : 0;

    const pendingLeaves = await LeaveRequest.countDocuments({
      status: "Pending",
      isDeleted: false
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const presentCount = await Attendance.countDocuments({
      date: today,
      status: "Present"
    });
    const absentCount = await Attendance.countDocuments({
      date: today,
      status: "Absent"
    });

    const upcomingSchedules = await Schedule.countDocuments({
      isDeleted: false,
      startTime: { $gte: new Date() }
    });

    res.status(200).json({
      success: true,
      data: {
        totalTeachers,
        pendingSalaries,
        totalPendingSalary,
        pendingLeaves,
        attendance: {
          present: presentCount,
          absent: absentCount,
        },
        upcomingSchedules
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
