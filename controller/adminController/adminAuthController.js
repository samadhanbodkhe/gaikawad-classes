// controller/adminController/adminAuthController.js
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Admin = require("../../models/admin/Admin");
const otpSend = require("../../utils/otpSend");

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

exports.registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, mobile } = req.body;
  if (!name || !email || !mobile) return res.status(400).json({ message: "All fields are required" });
  const existing = await Admin.findOne({ $or: [{ email }, { mobile }] });
  if (existing) return res.status(400).json({ message: "Admin already exists" });
  const admin = await Admin.create({ name, email, mobile, isVerified: true });
  res.status(201).json({ message: "Admin registered", adminId: admin._id });
});

exports.loginAdmin = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });
  const admin = await Admin.findOne({ email });
  if (!admin || !admin.isVerified) return res.status(404).json({ message: "Admin not found or not verified" });

  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  admin.otp = otp;
  admin.otpExpires = otpExpires;
  await admin.save();

  try {
    await otpSend({ to: admin.email, otp, name: admin.name, userType: "admin" });
    res.status(200).json({ message: "OTP sent successfully", adminId: admin._id });
  } catch (err) {
    console.error("OTP send error:", err.message);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

// VERIFY OTP => create token, set cookie (secure only in production), return token + admin
exports.verifyLoginOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!otp || !email) {
    return res.status(400).json({ message: "Email and OTP required" });
  }

  const admin = await Admin.findOne({
    email,
    otp,
    otpExpires: { $gt: Date.now() },
  });

  if (!admin) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  // Clear OTP
  admin.otp = null;
  admin.otpExpires = null;
  await admin.save();

  const token = generateToken(admin._id);

  // cookie secure only in production (so it works on localhost in dev)
  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // return token and minimal admin data
  res.status(200).json({
    message: "Login successful",
    token,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      mobile: admin.mobile,
      isVerified: admin.isVerified
    },
  });
});

// Logout
exports.logoutAdmin = asyncHandler(async (req, res) => {
  res.clearCookie("auth_token");
  res.status(200).json({ message: "Logged out successfully" });
});

// NOTE: adminProtect middleware sets req.admin
exports.getAdmin = asyncHandler(async (req, res) => {
  const admin = req.admin;
  res.status(200).json({
    id: admin._id,
    name: admin.name,
    email: admin.email,
    mobile: admin.mobile,
    isVerified: admin.isVerified,
  });
});

// verifyToken: just return the admin set by middleware (clean)
exports.verifyToken = asyncHandler(async (req, res) => {
  // adminProtect should have already validated token and set req.admin
  if (!req.admin) return res.status(401).json({ success: false, message: "Not authorized" });
  res.status(200).json({ success: true, admin: {
    id: req.admin._id,
    name: req.admin.name,
    email: req.admin.email,
    mobile: req.admin.mobile,
    isVerified: req.admin.isVerified
  }});
});
