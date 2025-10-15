const asyncHandler = require("express-async-handler");
const Schedule = require("../../models/admin/Schedule");
const Teacher = require("../../models/teacher/Teacher");

// Convert IST datetime string to UTC for DB storage
const parseISTtoUTC = (dateTimeStr) => {
  if (!dateTimeStr) return null;
  const date = new Date(dateTimeStr);
  return new Date(date.getTime() - (5 * 60 + 30) * 60 * 1000); // IST -> UTC
};

// Convert UTC date from DB to IST ISO string for frontend
const convertUTCtoIST = (date) => {
  if (!date) return null;
  return new Date(date.getTime() + (5 * 60 + 30) * 60 * 1000).toISOString();
};

// GET all schedules
exports.getSchedules = asyncHandler(async (req, res) => {
  const { teacherId, batchName, subject, mode } = req.query;
  const query = { isDeleted: false };

  if (teacherId) query.teacherId = teacherId;
  if (batchName) query.batchName = { $regex: batchName, $options: "i" };
  if (subject) query.subject = { $regex: subject, $options: "i" };
  if (mode) query.mode = mode;

  const schedules = await Schedule.find(query)
    .populate("teacherId", "name email")
    .sort({ startTime: 1 });

  const schedulesWithIST = schedules.map((s) => ({
    ...s._doc,
    startTimeIST: convertUTCtoIST(s.startTime),
    endTimeIST: convertUTCtoIST(s.endTime),
  }));

  res.json({ schedules: schedulesWithIST });
});

// CREATE schedule
exports.createSchedule = asyncHandler(async (req, res) => {
  const { teacherId, batchName, subject, startTime, endTime, mode, room } = req.body;

  if (!teacherId || !batchName || !subject || !startTime || !endTime) {
    res.status(400);
    throw new Error("All required fields must be provided");
  }

  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    res.status(404);
    throw new Error("Teacher not found");
  }
  if (!teacher.isApproved) {
    res.status(400);
    throw new Error("Teacher is not approved");
  }

  const schedule = await Schedule.create({
    teacherId,
    batchName,
    subject,
    startTime: parseISTtoUTC(startTime),
    endTime: parseISTtoUTC(endTime),
    mode: mode || "offline",
    room: room || null,
  });

  const populatedSchedule = await Schedule.findById(schedule._id).populate("teacherId", "name email");

  res.status(201).json({
    message: "Schedule created successfully",
    schedule: {
      ...populatedSchedule._doc,
      startTimeIST: convertUTCtoIST(populatedSchedule.startTime),
      endTimeIST: convertUTCtoIST(populatedSchedule.endTime),
    },
  });
});

// GET schedule by ID
exports.getScheduleById = asyncHandler(async (req, res) => {
  const schedule = await Schedule.findById(req.params.id).populate("teacherId", "name email");
  if (!schedule || schedule.isDeleted) {
    res.status(404);
    throw new Error("Schedule not found");
  }

  res.json({
    ...schedule._doc,
    startTimeIST: convertUTCtoIST(schedule.startTime),
    endTimeIST: convertUTCtoIST(schedule.endTime),
  });
});

// UPDATE schedule
exports.updateSchedule = asyncHandler(async (req, res) => {
  const schedule = await Schedule.findById(req.params.id);
  if (!schedule || schedule.isDeleted) {
    res.status(404);
    throw new Error("Schedule not found");
  }

  const { batchName, subject, startTime, endTime, mode, room } = req.body;

  schedule.batchName = batchName || schedule.batchName;
  schedule.subject = subject || schedule.subject;
  schedule.mode = mode || schedule.mode;
  schedule.room = room || schedule.room;

  if (startTime) schedule.startTime = parseISTtoUTC(startTime);
  if (endTime) schedule.endTime = parseISTtoUTC(endTime);

  await schedule.save();

  const populatedSchedule = await Schedule.findById(schedule._id).populate("teacherId", "name email");

  res.json({
    message: "Schedule updated successfully",
    schedule: {
      ...populatedSchedule._doc,
      startTimeIST: convertUTCtoIST(populatedSchedule.startTime),
      endTimeIST: convertUTCtoIST(populatedSchedule.endTime),
    },
  });
});

// DELETE schedule
exports.deleteSchedule = asyncHandler(async (req, res) => {
  const schedule = await Schedule.findById(req.params.id);
  if (!schedule || schedule.isDeleted) {
    res.status(404);
    throw new Error("Schedule not found");
  }

  schedule.isDeleted = true;
  await schedule.save();

  res.json({ message: "Schedule deleted successfully" });
});

// GET all approved teachers
exports.getAllTeachers = asyncHandler(async (req, res) => {
  const teachers = await Teacher.find({ isApproved: true, isActive: true }).select("name email");
  res.json(teachers);
});


exports.getTodaysSchedules = asyncHandler(async (req, res) => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const schedules = await Schedule.find({
        isDeleted: false,
        startTime: { $gte: startOfDay, $lte: endOfDay }
    })
        .populate("teacherId", "name email")
        .sort({ startTime: 1 });

    // Convert times to IST for response
    const schedulesWithIST = schedules.map(schedule => ({
        ...schedule._doc,
        startTimeIST: convertToIST(schedule.startTime),
        endTimeIST: convertToIST(schedule.endTime)
    }));

    res.json({ schedules: schedulesWithIST });
});

exports.getTeacherSchedules = asyncHandler(async (req, res) => {
    const teacherId = req.teacher?._id;

    if (!teacherId) {
        res.status(400);
        throw new Error("Teacher ID not found.");
    }

    const schedules = await Schedule.find({ teacherId, isDeleted: false })
        .populate("teacherId", "name email mobile qualification")
        .sort({ startTime: 1 })
        .lean();

    // Convert times to IST for response
    const schedulesWithIST = schedules.map(schedule => ({
        ...schedule,
        startTimeIST: convertToIST(schedule.startTime),
        endTimeIST: convertToIST(schedule.endTime)
    }));

    res.json({
        success: true,
        schedules: schedulesWithIST || [],
    });
});