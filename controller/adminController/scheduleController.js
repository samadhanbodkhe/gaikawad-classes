const asyncHandler = require("express-async-handler");
const Schedule = require("../../models/admin/Schedule");
const Teacher = require("../../models/teacher/Teacher");

// No need for complex date conversion - we store exactly what user enters
exports.getSchedules = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, teacherId, batchName, subject, mode } = req.query;
    const query = { isDeleted: false };

    if (teacherId) query.teacherId = teacherId;
    if (batchName) query.batchName = { $regex: batchName, $options: "i" };
    if (subject) query.subject = { $regex: subject, $options: "i" };
    if (mode) query.mode = mode;

    const schedules = await Schedule.find(query)
        .populate("teacherId", "name email mobile")
        .sort({ scheduleDate: 1, startTime: 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Schedule.countDocuments(query);

    res.json({
        success: true,
        schedules,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
    });
});

exports.createSchedule = asyncHandler(async (req, res) => {
    const { teacherId, batchName, subject, scheduleDate, startTime, endTime, mode, room } = req.body;

    if (!teacherId || !batchName || !subject || !scheduleDate || !startTime || !endTime) {
        return res.status(400).json({
            success: false,
            message: "All required fields must be provided"
        });
    }

    // Validate teacher
    const teacher = await Teacher.findById(teacherId).select("name mobile email isApproved");
    if (!teacher) {
        return res.status(404).json({
            success: false,
            message: "Teacher not found"
        });
    }
    if (!teacher.isApproved) {
        return res.status(400).json({
            success: false,
            message: "Teacher is not approved by admin yet"
        });
    }

    // Simple time validation
    const timeToMinutes = (timeStr) => {
        const [time, period] = timeStr.split(' ');
        const [hours, minutes] = time.split(':');
        let totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
        if (period === 'PM' && hours !== '12') totalMinutes += 12 * 60;
        if (period === 'AM' && hours === '12') totalMinutes -= 12 * 60;
        return totalMinutes;
    };

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (startMinutes >= endMinutes) {
        return res.status(400).json({
            success: false,
            message: "End time must be after start time"
        });
    }

    // Check for schedule conflicts (same teacher, same date, overlapping time)
    const existingSchedules = await Schedule.find({
        teacherId,
        scheduleDate,
        isDeleted: false
    });

    const hasConflict = existingSchedules.some(schedule => {
        const existingStart = timeToMinutes(schedule.startTime);
        const existingEnd = timeToMinutes(schedule.endTime);
        
        return (startMinutes < existingEnd && endMinutes > existingStart);
    });

    if (hasConflict) {
        return res.status(400).json({
            success: false,
            message: "Teacher has a conflicting schedule during this time"
        });
    }

    const schedule = await Schedule.create({
        teacherId,
        batchName,
        subject,
        scheduleDate,
        startTime,
        endTime,
        mode: mode || "offline",
        room: room || null
    });

    const populatedSchedule = await Schedule.findById(schedule._id)
        .populate("teacherId", "name mobile email");

    res.status(201).json({
        success: true,
        message: "Schedule created successfully",
        schedule: populatedSchedule
    });
});

exports.getScheduleById = asyncHandler(async (req, res) => {
    const schedule = await Schedule.findById(req.params.id)
        .populate("teacherId", "name email mobile");
        
    if (!schedule || schedule.isDeleted) {
        return res.status(404).json({
            success: false,
            message: "Schedule not found"
        });
    }
    
    res.json({
        success: true,
        schedule
    });
});

exports.updateSchedule = asyncHandler(async (req, res) => {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule || schedule.isDeleted) {
        return res.status(404).json({
            success: false,
            message: "Schedule not found"
        });
    }

    const { batchName, subject, scheduleDate, startTime, endTime, mode, room } = req.body;

    // Update basic fields
    schedule.batchName = batchName || schedule.batchName;
    schedule.subject = subject || schedule.subject;
    schedule.mode = mode || schedule.mode;
    schedule.room = room !== undefined ? room : schedule.room;

    // Update date and time if provided
    if (scheduleDate) schedule.scheduleDate = scheduleDate;
    if (startTime) schedule.startTime = startTime;
    if (endTime) schedule.endTime = endTime;

    await schedule.save();

    const populatedSchedule = await Schedule.findById(schedule._id)
        .populate("teacherId", "name mobile email");

    res.json({
        success: true,
        message: "Schedule updated successfully",
        schedule: populatedSchedule
    });
});

exports.deleteSchedule = asyncHandler(async (req, res) => {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule || schedule.isDeleted) {
        return res.status(404).json({
            success: false,
            message: "Schedule not found"
        });
    }

    schedule.isDeleted = true;
    await schedule.save();

    res.json({
        success: true,
        message: "Schedule deleted successfully"
    });
});

exports.getAllTeachers = asyncHandler(async (req, res) => {
    const teachers = await Teacher.find({ 
        isApproved: true, 
        isActive: true 
    })
    .select("name email mobile")
    .sort({ name: 1 });

    res.json({
        success: true,
        teachers
    });
});

exports.getTodaysSchedules = asyncHandler(async (req, res) => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // "2025-10-15"

    const schedules = await Schedule.find({
        isDeleted: false,
        scheduleDate: todayString
    })
    .populate("teacherId", "name email")
    .sort({ startTime: 1 });

    res.json({
        success: true,
        schedules
    });
});

exports.getTeacherSchedules = asyncHandler(async (req, res) => {
    const teacherId = req.teacher?._id;

    if (!teacherId) {
        return res.status(400).json({
            success: false,
            message: "Teacher ID not found"
        });
    }

    const schedules = await Schedule.find({ 
        teacherId, 
        isDeleted: false 
    })
    .populate("teacherId", "name email mobile qualification")
    .sort({ scheduleDate: 1, startTime: 1 });

    res.json({
        success: true,
        schedules
    });
});