const asyncHandler = require("express-async-handler");
const Attendance = require("../../models/admin/Attendance");
const Teacher = require("../../models/teacher/Teacher");

// ✅ 1️⃣ Admin — Get all attendances
exports.getAttendances = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, teacherId, status, date } = req.query;
  const query = {};

  if (teacherId) query.teacherId = teacherId;
  if (status) query.status = status.toLowerCase();
  if (date) {
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    query.date = attendanceDate;
  }

  const attendances = await Attendance.find(query)
    .populate("teacherId", "name email subjects")
    .populate("markedBy", "name email")
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Attendance.countDocuments(query);

  res.json({
    success: true,
    attendances,
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
  });
});

// ✅ 2️⃣ Admin — Mark Attendance (with duplicate prevention)
exports.markAttendance = asyncHandler(async (req, res) => {
  const { teacherId, date, status } = req.body;

  if (!teacherId || !date || !status) {
    res.status(400);
    throw new Error("TeacherId, date, and status are required");
  }

  if (!req.admin || !req.admin._id) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    res.status(404);
    throw new Error("Teacher not found");
  }
  if (!teacher.isApproved) {
    res.status(400);
    throw new Error("Teacher not approved yet");
  }

  const formattedStatus = status.toLowerCase();
  const validStatuses = ["present", "absent", "leave"];
  if (!validStatuses.includes(formattedStatus)) {
    res.status(400);
    throw new Error("Invalid status. Must be Present, Absent, or Leave");
  }

  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);

  // Update if exists, else create
  let attendance = await Attendance.findOne({ teacherId, date: attendanceDate });
  if (attendance) {
    attendance.status = formattedStatus;
    attendance.markedBy = req.admin._id;
    await attendance.save();
  } else {
    attendance = await Attendance.create({
      teacherId,
      date: attendanceDate,
      status: formattedStatus,
      markedBy: req.admin._id,
    });
  }

  res.json({
    success: true,
    message: "Attendance marked successfully",
    attendance,
  });
});

// ✅ 3️⃣ Get Single Attendance by ID
exports.getAttendanceById = asyncHandler(async (req, res) => {
  const attendance = await Attendance.findById(req.params.id)
    .populate("teacherId", "name email subjects")
    .populate("markedBy", "name email");

  if (!attendance) {
    res.status(404);
    throw new Error("Attendance record not found");
  }

  res.json({ success: true, attendance });
});

exports.getAttendanceTeachers = asyncHandler(async (req, res) => {
  const teachers = await Teacher.find({ isApproved: true })
    .select("name email subjects department")
    .sort({ name: 1 });
  res.json({ success: true, teachers });
});

exports.getTeacherAttendance = asyncHandler(async (req, res) => {
  const teacherId = req.teacher?._id;
  if (!teacherId) {
    res.status(400);
    throw new Error("Teacher ID not found");
  }

  const { month, year } = req.query;
  const now = new Date();
  const currentMonth = month ? parseInt(month) - 1 : now.getMonth(); // JS month 0-11
  const currentYear = year ? parseInt(year) : now.getFullYear();

  const startDate = new Date(currentYear, currentMonth, 1);
  const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

  const attendances = await Attendance.find({
    teacherId,
    isDeleted: false,
    date: { $gte: startDate, $lte: endDate },
  })
    .populate("markedBy", "name email")
    .sort({ date: -1 })
    .lean();

  // Summary counts
  const summary = {
    present: 0,
    absent: 0,
    leave: 0,
  };
  attendances.forEach((a) => {
    if (a.status === "present") summary.present++;
    if (a.status === "absent") summary.absent++;
    if (a.status === "leave") summary.leave++;
  });

  res.json({
    success: true,
    teacherId,
    month: currentMonth + 1, // Return human-readable month
    year: currentYear,
    totalDays: attendances.length,
    summary,
    attendances: attendances.map((a) => ({
      _id: a._id,
      date: a.date,
      status: a.status,
      markedBy: a.markedBy ? a.markedBy.name : "System",
    })),
  });
});
