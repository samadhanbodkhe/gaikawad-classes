const asyncHandler = require("express-async-handler");
const Student = require("../../models/teacher/Student");
const Teacher = require("../../models/teacher/Teacher");

exports.createStudent = asyncHandler(async (req, res) => {
  const {
    name,
    rollNumber,
    className,
    section,
    admissionDate,
    parentName,
    contactNumber,
    gender,
    address,
    fees,
  } = req.body;

  const teacherId = req.teacher._id;

  // 🔹 Check roll number duplicate within same class + section
  const existing = await Student.findOne({ rollNumber, className, section });
  if (existing) {
    res.status(400);
    throw new Error(
      `Roll number ${rollNumber} already exists in class ${className} section ${section}`
    );
  }

  // 🔹 Fee Calculation
  const totalAmount = Number(fees?.totalAmount || 0)
  const paidAmount = Number(fees?.paidAmount || 0);
  const pendingAmount = totalAmount - paidAmount;

  const student = await Student.create({
    name,
    rollNumber,
    className,
    section,
    admissionDate,
    parentName,
    contactNumber,
    gender,
    address,
    fees: {
      totalAmount,
      paidAmount,
      pendingAmount,
      paymentStatus:
        pendingAmount <= 0
          ? "Paid"
          : paidAmount > 0
          ? "Partial"
          : "Pending",
      lastPaymentDate: paidAmount > 0 ? new Date() : null,
    },
    teacherId,
  });

  res.status(201).json({
    success: true,
    message: "Student created successfully",
    data: student,
  });
});

// ✅ Get All Students
exports.getAllStudents = asyncHandler(async (req, res) => {
  const query =
    req.teacher?.role === "Teacher" ? { teacherId: req.teacher._id } : {};

  const students = await Student.find(query)
    .populate("teacherId", "name email mobile")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    total: students.length,
    data: students,
  });
});

// ✅ Get Student By ID
exports.getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).populate(
    "teacherId",
    "name email mobile"
  );

  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }

  if (
    req.teacher.role === "Teacher" &&
    student.teacherId._id.toString() !== req.teacher._id.toString()
  ) {
    res.status(403);
    throw new Error("Not authorized to view this student");
  }

  res.status(200).json({ success: true, data: student });
});

// ✅ Update Student
exports.updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }

  if (
    req.teacher.role === "Teacher" &&
    student.teacherId.toString() !== req.teacher._id.toString()
  ) {
    res.status(403);
    throw new Error("Not authorized to update this student");
  }

  const {
    name,
    className,
    section,
    parentName,
    contactNumber,
    gender,
    address,
  } = req.body;

  if (name) student.name = name;
  if (className) student.className = className;
  if (section) student.section = section;
  if (parentName) student.parentName = parentName;
  if (contactNumber) student.contactNumber = contactNumber;
  if (gender) student.gender = gender;
  if (address) student.address = address;

  // ✅ Fee update
  if (req.body.fees) {
    const newPayment = Number(req.body.fees.newPayment || 0);
    if (newPayment > 0) {
      student.fees.paidAmount += newPayment;
      student.fees.pendingAmount =
        student.fees.totalAmount - student.fees.paidAmount;

      if (student.fees.pendingAmount <= 0) {
        student.fees.paymentStatus = "Paid";
        student.fees.pendingAmount = 0;
      } else {
        student.fees.paymentStatus = "Partial";
      }

      student.fees.lastPaymentDate = new Date();
    }
  }

  const updatedStudent = await student.save();

  res.status(200).json({
    success: true,
    message: "Student updated successfully",
    data: updatedStudent,
  });
});

// ✅ Delete Student
exports.deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }

  if (
    req.teacher.role === "Teacher" &&
    student.teacherId.toString() !== req.teacher._id.toString()
  ) {
    res.status(403);
    throw new Error("Not authorized to delete this student");
  }

  await student.deleteOne();

  res.status(200).json({
    success: true,
    message: "Student deleted successfully",
  });
});

// ✅ Fee Summary
exports.getFeeSummary = asyncHandler(async (req, res) => {
  const students = await Student.find();

  const totalFees = students.reduce(
    (sum, s) => sum + (s.fees.totalAmount || 0),
    0
  );
  const totalPaid = students.reduce(
    (sum, s) => sum + (s.fees.paidAmount || 0),
    0
  );
  const totalPending = students.reduce(
    (sum, s) => sum + (s.fees.pendingAmount || 0),
    0
  );

  res.status(200).json({
    success: true,
    summary: {
      totalStudents: students.length,
      totalFees,
      totalPaid,
      totalPending,
    },
  });
});
