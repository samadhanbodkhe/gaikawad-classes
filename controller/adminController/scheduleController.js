const asyncHandler = require("express-async-handler");
const Schedule = require("../../models/admin/Schedule");
const Teacher = require("../../models/teacher/Teacher");

// Helper function to convert to IST
const convertToIST = (date) => {
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "medium"
  });
};

// Helper to ensure dates are stored correctly in UTC
const parseDateTime = (dateTimeStr) => {
  // Create date in IST timezone
  const date = new Date(dateTimeStr);
  // Convert to UTC for storage
  return new Date(date.getTime() - (5*60 + 30)*60*1000); // IST to UTC
};

exports.getSchedules = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, teacherId, batchName, subject, mode } = req.query;
    const query = { isDeleted: false };

    if (teacherId) query.teacherId = teacherId;
    if (batchName) query.batchName = { $regex: batchName, $options: "i" };
    if (subject) query.subject = { $regex: subject, $options: "i" };
    if (mode) query.mode = mode;

    const schedules = await Schedule.find(query)
        .populate("teacherId", "name email")
        .sort({ startTime: 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    // Convert times to IST for response
    const schedulesWithIST = schedules.map(schedule => ({
        ...schedule._doc,
        startTimeIST: convertToIST(schedule.startTime),
        endTimeIST: convertToIST(schedule.endTime)
    }));

    const total = await Schedule.countDocuments(query);

    res.json({
        schedules: schedulesWithIST,
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
    });
});

exports.createSchedule = asyncHandler(async (req, res) => {
    const { teacherId, batchName, subject, startTime, endTime, mode, room } = req.body;

    if (!teacherId || !batchName || !subject || !startTime || !endTime) {
        res.status(400);
        throw new Error("All required fields must be provided");
    }

    // ✅ Check teacher existence
    const teacher = await Teacher.findById(teacherId).select("name mobile email isApproved");
    if (!teacher) {
        res.status(404);
        throw new Error("Teacher not found");
    }
    if (!teacher.isApproved) {
        res.status(400);
        throw new Error("Teacher is not approved by admin yet");
    }

    // Parse dates to ensure correct UTC storage
    const startTimeUTC = parseDateTime(startTime);
    const endTimeUTC = parseDateTime(endTime);

    const schedule = await Schedule.create({
        teacherId,
        batchName,
        subject,
        startTime: startTimeUTC,
        endTime: endTimeUTC,
        mode: mode || "offline",
        room: room || null
    });

    // ✅ Populate teacher details
    const populatedSchedule = await Schedule.findById(schedule._id)
        .populate("teacherId", "name mobile email");

    // Add IST times to response
    const responseSchedule = {
        ...populatedSchedule._doc,
        startTimeIST: convertToIST(populatedSchedule.startTime),
        endTimeIST: convertToIST(populatedSchedule.endTime)
    };

    res.status(201).json({
        message: "Schedule created successfully",
        schedule: responseSchedule
    });
});

exports.getScheduleById = asyncHandler(async (req, res) => {
    const schedule = await Schedule.findById(req.params.id).populate("teacherId", "name email");
    if (!schedule || schedule.isDeleted) {
        res.status(404);
        throw new Error("Schedule not found");
    }
    
    // Add IST times to response
    const scheduleWithIST = {
        ...schedule._doc,
        startTimeIST: convertToIST(schedule.startTime),
        endTimeIST: convertToIST(schedule.endTime)
    };
    
    res.json(scheduleWithIST);
});

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

    // Update times with proper UTC conversion
    if (startTime) {
        schedule.startTime = parseDateTime(startTime);
    }
    if (endTime) {
        schedule.endTime = parseDateTime(endTime);
    }

    await schedule.save();

    // ✅ Populate teacher basic details
    const populatedSchedule = await Schedule.findById(schedule._id)
        .populate("teacherId", "name mobile email");

    // Add IST times to response
    const responseSchedule = {
        ...populatedSchedule._doc,
        startTimeIST: convertToIST(populatedSchedule.startTime),
        endTimeIST: convertToIST(populatedSchedule.endTime)
    };

    res.json({
        message: "Schedule updated successfully",
        schedule: responseSchedule
    });
});

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

exports.getAllTeachers = asyncHandler(async (req, res) => {
    const teachers = await Teacher.find({ isApproved: true, isActive: true })
        .select("name email mobile")
        .sort({ name: 1 });

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