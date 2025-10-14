const asyncHandler = require("express-async-handler");
const Schedule = require("../../models/admin/Schedule");
const Teacher = require("../../models/teacher/Teacher");

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

    const total = await Schedule.countDocuments(query);

    res.json({
        schedules,
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

    const schedule = await Schedule.create({
        teacherId,
        batchName,
        subject,
        startTime,
        endTime,
        mode: mode || "offline",
        room: room || null
    });

    // ✅ Populate teacher details
    const populatedSchedule = await Schedule.findById(schedule._id)
        .populate("teacherId", "name mobile email");

    res.status(201).json({
        message: "Schedule created successfully",
        schedule: populatedSchedule
    });
});


exports.getScheduleById = asyncHandler(async (req, res) => {
    const schedule = await Schedule.findById(req.params.id).populate("teacherId", "name email");
    if (!schedule || schedule.isDeleted) {
        res.status(404);
        throw new Error("Schedule not found");
    }
    res.json(schedule);
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
    schedule.startTime = startTime || schedule.startTime;
    schedule.endTime = endTime || schedule.endTime;
    schedule.mode = mode || schedule.mode;
    schedule.room = room || schedule.room;

    await schedule.save();

    // ✅ Populate teacher basic details
    const populatedSchedule = await Schedule.findById(schedule._id)
        .populate("teacherId", "name mobile email");

    res.json({
        message: "Schedule updated successfully",
        schedule: populatedSchedule
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

    res.json({ schedules });
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

    res.json({
        success: true,
        schedules: schedules || [],
    });
});
