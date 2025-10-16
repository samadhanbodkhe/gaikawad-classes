const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Teacher = require("../../models/teacher/Teacher");
const sendEmail = require("../../utils/sendEmail");
const AdminTeacherRequest = require("../../models/admin/AdminTeacherRequest");
const uploadToCloudinary = require("../../utils/cloudinaryUpload");
const otpSend = require("../../utils/otpSend");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// Helper function to parse subjects
const parseSubjects = (subjects) => {
  if (!subjects) return [];
  
  if (Array.isArray(subjects)) {
    return subjects;
  }
  
  if (typeof subjects === 'string') {
    // Handle stringified array
    if (subjects.startsWith('[') || subjects.startsWith('"[')) {
      try {
        const cleanedString = subjects.replace(/^"|"$/g, '').replace(/\\"/g, '"');
        const parsed = JSON.parse(cleanedString);
        return Array.isArray(parsed) ? parsed : [subjects];
      } catch (error) {
        console.warn('Failed to parse subjects:', error);
        return subjects.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    // Handle comma-separated string
    return subjects.split(',').map(s => s.trim()).filter(Boolean);
  }
  
  return [String(subjects)];
};

exports.registerTeacher = asyncHandler(async (req, res) => {
  const { name, email, mobile, qualification, subjects, salaryType, baseSalary } = req.body;

  if (!name || !email || !mobile) {
    return res.status(400).json({ message: "Name, Email & Mobile are required" });
  }

  const existingRequest = await AdminTeacherRequest.findOne({ email });
  const teacherExist = await Teacher.findOne({ email });

  if (existingRequest || teacherExist) {
    return res.status(400).json({ message: "Teacher already exists or request already pending" });
  }

  // ✅ Parse subjects properly
  const parsedSubjects = parseSubjects(subjects);

  // ✅ Upload documents
  let documents = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const url = await uploadToCloudinary(file.buffer, "teachers/documents");
      documents.push(url);
    }
  }

  // Store request
  const request = await AdminTeacherRequest.create({
    name,
    email,
    mobile,
    qualification,
    subjects: parsedSubjects, // Store as proper array
    salaryType,
    baseSalary,
    documents,
  });

  // Notify admin
  await sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: "New Teacher Registration Approval Needed",
    html: `
      <h2>New Teacher Registration Request</h2>
      <p><b>Name:</b> ${request.name}</p>
      <p><b>Email:</b> ${request.email}</p>
      <p><b>Mobile:</b> ${request.mobile}</p>
      <p><b>Subjects:</b> ${parsedSubjects.join(', ')}</p>
      <p>Please review in the admin panel.</p>
    `,
  });

  res.status(201).json({
    message: "Teacher registration request submitted. Waiting for admin approval.",
    requestId: request._id,
    subjects: parsedSubjects,
    documents,
  });
});


exports.loginTeacher = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const teacher = await Teacher.findOne({ email });
    if (!teacher || !teacher.isActive)
        return res.status(404).json({ message: "Teacher not found or inactive" });

    if (!teacher.isApproved)
        return res.status(403).json({ message: "Teacher is not approved yet" });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    teacher.otp = otp;
    teacher.otpExpires = otpExpires;
    await teacher.save();

    try {
        await otpSend({ to: teacher.email, otp, name: teacher.name, userType: "teacher" });
        res.status(200).json({ message: "OTP sent successfully", teacherId: teacher._id });
    } catch (err) {
        console.error("OTP send error:", err.message);
        res.status(500).json({ message: "Failed to send OTP" });
    }
});


// 📌 Verify OTP
exports.verifyLoginOTP = asyncHandler(async (req, res) => {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: "OTP is required" });

    const teacher = await Teacher.findOne({
        otp,
        otpExpires: { $gt: Date.now() },
    });

    if (!teacher) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    teacher.otp = null;
    teacher.otpExpires = null;
    await teacher.save();

    const token = generateToken(teacher._id);

    res.cookie("teacher_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
        message: "Login successful",
        token,
        teacher: teacher,
    });
});


// 📌 Get Teacher Profile
exports.getTeacher = asyncHandler(async (req, res) => {
    res.status(200).json(req.teacher);
});


// 📌 Update Teacher
exports.updateTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.teacher._id);
  if (!teacher) return res.status(404).json({ message: "Teacher not found" });

  const { name, mobile, qualification, subjects, salaryType, baseSalary } = req.body;

  if (name) teacher.name = name;
  if (mobile) teacher.mobile = mobile;
  if (qualification) teacher.qualification = qualification;
  if (subjects) teacher.subjects = subjects;
  if (salaryType) teacher.salaryType = salaryType;
  if (baseSalary) teacher.baseSalary = baseSalary;

  // ✅ Upload new documents if provided
  if (req.files && req.files.documents) {
    const newDocuments = [];
    for (const file of req.files.documents) {
      const url = await uploadToCloudinary(file.buffer, "teachers/documents");
      newDocuments.push(url);
    }
    // Add new documents to existing ones
    teacher.documents = [...teacher.documents, ...newDocuments];
  }

  // ✅ Upload / Replace Profile Image if provided
  if (req.files && req.files.profileImage && req.files.profileImage.length > 0) {
    const file = req.files.profileImage[0];
    const profileUrl = await uploadToCloudinary(file.buffer, "teachers/profile");
    teacher.profileImage = profileUrl; // replace old profile image
  }

  await teacher.save();
  res.status(200).json({
    message: "Teacher updated successfully",
    teacher,
  });
});



// 📌 Soft Delete Teacher
exports.deleteTeacher = asyncHandler(async (req, res) => {
    const teacher = await Teacher.findByIdAndDelete(req.teacher._id);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    await teacher.save();

    res.status(200).json({ message: "Teacher deactivated successfully" });
});


// 📌 Logout Teacher
exports.logoutTeacher = asyncHandler(async (req, res) => {
    res.clearCookie("teacher_token");
    res.status(200).json({ message: "Logged out successfully" });
});
