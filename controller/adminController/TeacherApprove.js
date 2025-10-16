const asyncHandler = require("express-async-handler");
const AdminTeacherRequest = require("../../models/admin/AdminTeacherRequest");
const Teacher = require("../../models/teacher/Teacher");
const sendEmail = require("../../utils/sendEmail");

exports.getPendingTeacherRequests = asyncHandler(async (req, res) => {
    const requests = await AdminTeacherRequest.find({ status: "pending" });
    res.status(200).json(requests);
});

exports.getAllTeachers = asyncHandler(async (req, res) => {
    const teachers = await Teacher.find();
    res.status(200).json(teachers);
});

exports.getTeacherDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const teacher = await Teacher.findById(id);
  if (!teacher) {
    return res.status(404).json({ message: "Teacher not found" });
  }
  res.status(200).json(teacher);
});

exports.approveTeacherRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;

    const request = await AdminTeacherRequest.findById(requestId);
    if (!request) {
        return res.status(404).json({ message: "Teacher request not found" });
    }

    const teacher = await Teacher.create({
        name: request.name,
        email: request.email,
        mobile: request.mobile,
        qualification: request.qualification,
        subjects: request.subjects,
        salaryType: request.salaryType,
        baseSalary: request.baseSalary,
        documents: request.documents,
        isApproved: true
    });

    // Delete request after approval
    await AdminTeacherRequest.findByIdAndDelete(requestId);

    // Notify teacher about approval
    await sendEmail({
        to: teacher.email,
        subject: "Teacher Registration Approved",
        html: `
          <h2>Congratulations ${teacher.name}!</h2>
          <p>Your registration has been approved.</p>
          <p>You can now login using your email.</p>
        `
    });

    res.status(201).json({
        message: "Teacher approved successfully and request deleted.",
        teacher
    });
});

exports.rejectTeacherRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { reason } = req.body;

    const request = await AdminTeacherRequest.findById(requestId);
    if (!request) {
        return res.status(404).json({ message: "Teacher request not found" });
    }

    request.status = "rejected";
    await request.save();

    await sendEmail({
        to: request.email,
        subject: "Teacher Registration Request Rejected",
        html: `
            <h2>Hello ${request.name},</h2>
            <p>We regret to inform you that your teacher registration request has been <b>rejected</b>.</p>
            ${reason ? `<p><b>Reason:</b> ${reason}</p>` : ''}
            <p>If you believe this was a mistake, please contact the admin for further clarification.</p>
            <p>Regards,<br/>Admin Team</p>
        `
    });

    res.status(200).json({
        message: "Teacher request rejected successfully",
        requestId: requestId
    });
});