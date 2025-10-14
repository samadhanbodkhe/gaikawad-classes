const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Admin = require("../../models/admin/Admin");
const sendOTP = require("../../utils/sendOTP");

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

exports.registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, mobile } = req.body;

  if (!name || !email || !mobile)
    return res.status(400).json({ message: "All fields are required" });

  const existing = await Admin.findOne({ $or: [{ email }, { mobile }] });
  if (existing) return res.status(400).json({ message: "Admin already exists" });

  const admin = await Admin.create({ name, email, mobile, isVerified: true });

  res.status(201).json({ message: "Admin registered", adminId: admin._id });
});

exports.loginAdmin = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  const admin = await Admin.findOne({ email });
  if (!admin || !admin.isVerified)
    return res.status(404).json({ message: "Admin not found or not verified" });

  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  admin.otp = otp;
  admin.otpExpires = otpExpires;
  await admin.save();

  try {
    await sendOTP({ to: admin.email, otp, name: admin.name, userType: "admin" });
    res.status(200).json({ message: "OTP sent successfully", adminId: admin._id });
  } catch (err) {
    console.error("OTP send error:", err.message);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

exports.verifyLoginOTP = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  if (!otp) {
    return res.status(400).json({ message: "OTP is required" });
  }

  const admin = await Admin.findOne({
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

  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    message: "Login successful",
    token,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      mobile: admin.mobile,
    },
  });
});


// Logout
exports.logoutAdmin = asyncHandler(async (req, res) => {
  res.clearCookie("auth_token");
  res.status(200).json({ message: "Logged out successfully" });
});

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
