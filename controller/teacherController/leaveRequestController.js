const asyncHandler = require("express-async-handler");
const LeaveRequest = require("../../models/teacher/LeaveRequest");
const sendEmail = require("../../utils/sendEmail");

exports.createLeaveRequest = asyncHandler(async (req, res) => {
    const { fromDate, toDate, leaveType, reason, fromTime, toTime } = req.body;

    if (!fromDate || !toDate || !leaveType) {
        res.status(400);
        throw new Error("fromDate, toDate, and leaveType are required");
    }

    // Combine date and time if time is provided
    let fromDateTime = new Date(fromDate);
    let toDateTime = new Date(toDate);
    
    // If time is provided, combine with date
    if (fromTime) {
        const [hours, minutes] = fromTime.split(':');
        fromDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }
    
    if (toTime) {
        const [hours, minutes] = toTime.split(':');
        toDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }

    const leaveRequest = await LeaveRequest.create({
        teacherId: req.teacher._id,
        fromDate: fromDateTime,
        toDate: toDateTime,
        leaveType,
        reason: reason || null,
        fromTime: fromTime || null,
        toTime: toTime || null,
        appliedAt: new Date() // Set the application timestamp
    });

    // Notify admin by email
    await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: "New Leave Request Submitted",
        html: `<p>A new leave request has been submitted by ${req.teacher.name} at ${new Date().toLocaleString('en-IN', { timeStyle: 'medium', dateStyle: 'medium' })}. Please review and approve/reject it.</p>`
    });

    res.status(201).json({ message: "Leave request submitted successfully", leaveRequest });
});

exports.getLeaveRequests = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;
    const query = { isDeleted: false };

    if (status) query.status = status;

    const leaveRequests = await LeaveRequest.find(query)
        .populate("teacherId", "name email")
        .populate("processedBy", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await LeaveRequest.countDocuments(query);

    res.json({
        leaveRequests,
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
    });
});

exports.processLeaveRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Approved","Rejected"].includes(status)) {
        res.status(400);
        throw new Error("Invalid status value");
    }

    const leaveRequest = await LeaveRequest.findById(id).populate("teacherId", "name email");

    if (!leaveRequest || leaveRequest.isDeleted) {
        res.status(404);
        throw new Error("Leave request not found");
    }

    leaveRequest.status = status;
    leaveRequest.processedBy = req.admin._id;
    leaveRequest.processedAt = new Date();

    await leaveRequest.save();

    // Email notification to teacher
    if (leaveRequest.teacherId && leaveRequest.teacherId.email) {
        await sendEmail({
            to: leaveRequest.teacherId.email,
            subject: `Your leave request has been ${status}`,
            html: `<p>Hello ${leaveRequest.teacherId.name}, your leave request from ${leaveRequest.fromDate.toDateString()} to ${leaveRequest.toDate.toDateString()} has been ${status} by admin.</p>`
        });
    } else {
        console.warn("⚠ Teacher email not found for leave request:", id);
    }

    res.json({ message: `Leave request ${status.toLowerCase()} successfully`, leaveRequest });
});

exports.getLeaveRequestsByTeacher = asyncHandler(async (req, res) => {
  const teacherId = req.teacher._id;

  const leaveRequests = await LeaveRequest.find({ teacherId, isDeleted: false })
    .sort({ createdAt: -1 });

  res.json(leaveRequests);
});