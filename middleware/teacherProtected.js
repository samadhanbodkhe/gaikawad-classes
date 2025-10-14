const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const Teacher = require("../models/teacher/Teacher");

exports.protectTeacher = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.teacher_token) {
    token = req.cookies.teacher_token;
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const teacher = await Teacher.findById(decoded.id);

    if (!teacher) {
      return res.status(401).json({ message: "Teacher not found" });
    }

    if (!teacher.isActive) {
      return res.status(403).json({ message: "Account is deactivated" });
    }

    if (!teacher.isApproved) {
      return res.status(403).json({ message: "Account not approved yet" });
    }

    req.teacher = teacher;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token invalid" });
  }
});
