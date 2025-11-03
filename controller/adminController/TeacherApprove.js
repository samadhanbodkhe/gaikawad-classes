const asyncHandler = require("express-async-handler");
const AdminTeacherRequest = require("../../models/admin/AdminTeacherRequest");
const Teacher = require("../../models/teacher/Teacher");
const sendEmail = require("../../utils/sendEmail");

// Helper function to parse subjects
const parseSubjects = (subjects) => {
  if (!subjects) return [];
  
  if (Array.isArray(subjects)) {
    return subjects;
  }
  
  if (typeof subjects === 'string') {
    if (subjects.startsWith('[') || subjects.startsWith('"[')) {
      try {
        const cleanedString = subjects.replace(/^"|"$/g, '').replace(/\\"/g, '"');
        const parsed = JSON.parse(cleanedString);
        return Array.isArray(parsed) ? parsed : [subjects];
      } catch (error) {
        return subjects.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    return subjects.split(',').map(s => s.trim()).filter(Boolean);
  }
  
  return [String(subjects)];
};

exports.getPendingTeacherRequests = asyncHandler(async (req, res) => {
    const requests = await AdminTeacherRequest.find({ status: "pending" });
    
    // Parse subjects for each request before sending
    const formattedRequests = requests.map(request => ({
      ...request.toObject(),
      subjects: parseSubjects(request.subjects)
    }));
    
    res.status(200).json(formattedRequests);
});
exports.getRejectedTeacherRequests = asyncHandler(async (req, res) => {
    const requests = await AdminTeacherRequest.find({ status: "rejected" });
    
    // Parse subjects for each request before sending
    const formattedRequests = requests.map(request => ({
      ...request.toObject(),
      subjects: parseSubjects(request.subjects)
    }));
    
    res.status(200).json(formattedRequests);
});

exports.getAllTeachers = asyncHandler(async (req, res) => {
    const teachers = await Teacher.find();
    
    // Parse subjects for each teacher before sending
    const formattedTeachers = teachers.map(teacher => ({
      ...teacher.toObject(),
      subjects: parseSubjects(teacher.subjects)
    }));
    
    res.status(200).json(formattedTeachers);
});

exports.getTeacherDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // First check if it's a Teacher (approved)
  let teacher = await Teacher.findById(id);
  if (teacher) {
    // Parse subjects before sending
    const formattedTeacher = {
      ...teacher.toObject(),
      subjects: parseSubjects(teacher.subjects)
    };
    return res.status(200).json(formattedTeacher);
  }

  // If not found in Teacher, check if it's a pending request in AdminTeacherRequest
  const pendingRequest = await AdminTeacherRequest.findById(id);
  if (pendingRequest) {
    // Parse subjects before sending
    const formattedRequest = {
      ...pendingRequest.toObject(),
      subjects: parseSubjects(pendingRequest.subjects)
    };
    return res.status(200).json(formattedRequest);
  }

  // If not found in either collection
  return res.status(404).json({ message: "Teacher not found" });
});

exports.approveTeacherRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;

    const request = await AdminTeacherRequest.findById(requestId);
    if (!request) {
        return res.status(404).json({ message: "Teacher request not found" });
    }

    // Parse subjects before creating teacher
    const parsedSubjects = parseSubjects(request.subjects);

    const teacher = await Teacher.create({
        name: request.name,
        email: request.email,
        mobile: request.mobile,
        qualification: request.qualification,
        subjects: parsedSubjects, // Store as proper array
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
          <p><strong>Subjects:</strong> ${parsedSubjects.join(', ')}</p>
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

    // Update status to rejected but keep the record in AdminTeacherRequest
    request.status = "rejected";
    request.rejectionReason = reason; // Add rejection reason to the document
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
