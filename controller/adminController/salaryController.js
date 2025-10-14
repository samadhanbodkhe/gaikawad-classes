const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Teacher = require("../../models/teacher/Teacher");
const PaymentHistory = require("../../models/admin/PaymentHistory");

// ✅ Create Salary Payment
exports.createSalaryPayment = asyncHandler(async (req, res) => {
  const { teacherId, month, paidAmount, paymentMethod, transactionRef, remarks } = req.body;

  if (!teacherId || !month) {
    return res
      .status(400)
      .json({ success: false, message: "Teacher and month are required" });
  }

  const teacher = await Teacher.findById(teacherId).select(
    "name email baseSalary isApproved"
  );

  if (!teacher) {
    return res.status(404).json({ success: false, message: "Teacher not found" });
  }

  if (!teacher.isApproved) {
    return res
      .status(400)
      .json({ success: false, message: "Teacher is not approved by admin" });
  }

  // Prevent duplicate entry for the same month
  const exists = await PaymentHistory.findOne({ teacherId, month });
  if (exists) {
    return res.status(400).json({
      success: false,
      message: "Salary already recorded for this month",
    });
  }

  const baseSalary = teacher.baseSalary || 0;
  const paid = Number(paidAmount) || 0;
  const pending = Math.max(baseSalary - paid, 0);

  let paymentStatus = "unpaid";
  if (paid >= baseSalary) paymentStatus = "paid";
  else if (paid > 0 && paid < baseSalary) paymentStatus = "partial";

  const payment = await PaymentHistory.create({
    teacherId,
    month,
    baseSalary,
    paidAmount: paid,
    pendingAmount: pending,
    paymentStatus,
    paymentMethod,
    transactionRef,
    remarks,
    paidDate: paid > 0 ? new Date() : null,
    createdBy: req.admin._id,
  });

  const populated = await PaymentHistory.findById(payment._id)
    .populate("teacherId", "name email baseSalary")
    .populate("createdBy", "name email");

  res.status(201).json({
    success: true,
    message: "Salary payment recorded successfully",
    payment: populated,
  });
});

// ✅ Get All Payments
exports.getAllPayments = asyncHandler(async (req, res) => {
  const { teacherId, month, page = 1, limit = 10 } = req.query;
  const filter = {};

  if (teacherId && mongoose.Types.ObjectId.isValid(teacherId))
    filter.teacherId = teacherId;
  if (month) filter.month = month;

  const skip = (Number(page) - 1) * Number(limit);

  const [records, total] = await Promise.all([
    PaymentHistory.find(filter)
      .populate("teacherId", "name email baseSalary")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    PaymentHistory.countDocuments(filter),
  ]);

  res.json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    records,
  });
});

// ✅ Get Payment by ID
exports.getPaymentById = asyncHandler(async (req, res) => {
  const record = await PaymentHistory.findById(req.params.id)
    .populate("teacherId", "name email baseSalary")
    .populate("createdBy", "name email");

  if (!record) {
    return res
      .status(404)
      .json({ success: false, message: "Salary record not found" });
  }

  res.json({ success: true, payment: record });
});

exports.updateSalary = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { additionalPaidAmount, paymentMethod, transactionRef, remarks } = req.body;

  // Find the existing salary record
  const salary = await PaymentHistory.findById(id);
  if (!salary) {
    return res.status(404).json({
      success: false,
      message: "Salary record not found",
    });
  }

  // Validate input
  const additionalPaid = Number(additionalPaidAmount);
  if (isNaN(additionalPaid) || additionalPaid <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid additional payment amount",
    });
  }

  // Calculate updated payment
  const totalPaid = salary.paidAmount + additionalPaid;
  const pending = Math.max(salary.baseSalary - totalPaid, 0);

  // Prevent overpayment
  if (totalPaid > salary.baseSalary) {
    return res.status(400).json({
      success: false,
      message: `Cannot pay more than base salary ₹${salary.baseSalary}. Current paid: ₹${salary.paidAmount}`,
    });
  }

  // Determine status
  let paymentStatus = "unpaid";
  if (totalPaid === 0) paymentStatus = "unpaid";
  else if (totalPaid < salary.baseSalary) paymentStatus = "partial";
  else if (totalPaid === salary.baseSalary) paymentStatus = "paid";

  // Update fields
  salary.paidAmount = totalPaid;
  salary.pendingAmount = pending;
  salary.paymentStatus = paymentStatus;
  salary.paymentMethod = paymentMethod || salary.paymentMethod;
  salary.transactionRef = transactionRef || salary.transactionRef;
  salary.remarks = remarks || salary.remarks;
  salary.paidDate = totalPaid > 0 ? new Date() : null;

  await salary.save();

  // Populate for response
  const populated = await PaymentHistory.findById(id)
    .populate("teacherId", "name email baseSalary")
    .populate("createdBy", "name email");

  res.json({
    success: true,
    message: "Salary payment updated successfully",
    updatedPayment: populated,
  });
});


// ✅ Delete Payment
exports.deletePayment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const record = await PaymentHistory.findById(id);
  if (!record) {
    return res
      .status(404)
      .json({ success: false, message: "Salary record not found" });
  }

  await PaymentHistory.deleteOne({ _id: id });

  res.json({ success: true, message: "Salary record deleted successfully" });
});
exports.getSalaryTeachers = asyncHandler(async (req, res) => {
    const teachers = await Teacher.find({ isActive: true, isApproved: true })
        .select("name email baseSalary")
        .sort({ name: 1 });

    res.json(teachers);
});

// Get Salary Records for Logged-in Teacher with Summary
exports.getTeacherSalaryRecords = asyncHandler(async (req, res) => {
  const teacherId = req.teacher._id;

  const payments = await PaymentHistory.find({ teacherId })
    .sort({ createdAt: -1 })
    .lean();

  const teacher = await Teacher.findById(teacherId).select("name email baseSalary");

  if (!teacher) {
    return res.status(404).json({ success: false, message: "Teacher not found" });
  }

  const totalPaid = payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const totalPending = payments.reduce((sum, p) => sum + (p.pendingAmount || 0), 0);

  res.json({
    success: true,
    teacher: {
      id: teacher._id,
      name: teacher.name,
      email: teacher.email,
      baseSalary: teacher.baseSalary,
    },
    totals: {
      totalPaid,
      totalPending,
    },
    payments,
  });
});
