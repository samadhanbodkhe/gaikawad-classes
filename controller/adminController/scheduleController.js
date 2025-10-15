const asyncHandler = require("express-async-handler");
const Schedule = require("../../models/admin/Schedule");
const Teacher = require("../../models/teacher/Teacher");

// Helper to format date in IST
const formatToIST = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
};

// Helper to combine date and time with IST timezone
const combineDateAndTime = (dateString, timeString) => {
  if (!dateString || !timeString) return null;
  
  // Create date in IST timezone
  const dateTimeString = `${dateString}T${timeString}:00.000+05:30`;
  return new Date(dateTimeString);
};

exports.getSchedules = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, teacherId, batchName, subject, mode } = req.query;
    const query = { isDeleted: false };

    if (teacherId) query.teacherId = teacherId;
    if (batchName) query.batchName = { $regex: batchName, $options: "i" };
    if (subject) query.subject = { $regex: subject, $options: "i" };
    if (mode) query.mode = mode;

    const schedules = await Schedule.find(query)
        .populate("teacherId", "name email mobile")
        .sort({ startTime: 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    // Format dates for display
    const formattedSchedules = schedules.map(schedule => ({
        ...schedule._doc,
        displayStartTime: formatToIST(schedule.startTime),
        displayEndTime: formatToIST(schedule.endTime)
    }));

    const total = await Schedule.countDocuments(query);

    res.json({
        success: true,
        schedules: formattedSchedules,
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

    // Combine date and time with IST timezone
    const startDateTime = combineDateAndTime(scheduleDate, startTime);
    const endDateTime = combineDateAndTime(scheduleDate, endTime);

    // Validate time order
    if (startDateTime >= endDateTime) {
        return res.status(400).json({
            success: false,
            message: "End time must be after start time"
        });
    }

    // Check for schedule conflicts
    const conflictingSchedule = await Schedule.findOne({
        teacherId,
        isDeleted: false,
        $or: [
            {
                startTime: { $lt: endDateTime },
                endTime: { $gt: startDateTime }
            }
        ]
    });

    if (conflictingSchedule) {
        return res.status(400).json({
            success: false,
            message: "Teacher has a conflicting schedule during this time"
        });
    }

    const schedule = await Schedule.create({
        teacherId,
        batchName,
        subject,
        startTime: startDateTime,
        endTime: endDateTime,
        mode: mode || "offline",
        room: room || null
    });

    const populatedSchedule = await Schedule.findById(schedule._id)
        .populate("teacherId", "name mobile email");

    res.status(201).json({
        success: true,
        message: "Schedule created successfully",
        schedule: {
            ...populatedSchedule._doc,
            displayStartTime: formatToIST(populatedSchedule.startTime),
            displayEndTime: formatToIST(populatedSchedule.endTime)
        }
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
        schedule: {
            ...schedule._doc,
            displayStartTime: formatToIST(schedule.startTime),
            displayEndTime: formatToIST(schedule.endTime)
        }
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

    // If updating time, validate
    if (scheduleDate && startTime && endTime) {
        const startDateTime = combineDateAndTime(scheduleDate, startTime);
        const endDateTime = combineDateAndTime(scheduleDate, endTime);
        
        if (startDateTime >= endDateTime) {
            return res.status(400).json({
                success: false,
                message: "End time must be after start time"
            });
        }

        schedule.startTime = startDateTime;
        schedule.endTime = endDateTime;
    }

    schedule.batchName = batchName || schedule.batchName;
    schedule.subject = subject || schedule.subject;
    schedule.mode = mode || schedule.mode;
    schedule.room = room !== undefined ? room : schedule.room;

    await schedule.save();

    const populatedSchedule = await Schedule.findById(schedule._id)
        .populate("teacherId", "name mobile email");

    res.json({
        success: true,
        message: "Schedule updated successfully",
        schedule: {
            ...populatedSchedule._doc,
            displayStartTime: formatToIST(populatedSchedule.startTime),
            displayEndTime: formatToIST(populatedSchedule.endTime)
        }
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
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const schedules = await Schedule.find({
        isDeleted: false,
        startTime: { 
            $gte: today, 
            $lt: tomorrow 
        }
    })
    .populate("teacherId", "name email")
    .sort({ startTime: 1 });

    const formattedSchedules = schedules.map(schedule => ({
        ...schedule._doc,
        displayStartTime: formatToIST(schedule.startTime),
        displayEndTime: formatToIST(schedule.endTime)
    }));

    res.json({
        success: true,
        schedules: formattedSchedules
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
    .sort({ startTime: 1 });

    const formattedSchedules = schedules.map(schedule => ({
        ...schedule._doc,
        displayStartTime: formatToIST(schedule.startTime),
        displayEndTime: formatToIST(schedule.endTime)
    }));

    res.json({
        success: true,
        schedules: formattedSchedules
    });
});