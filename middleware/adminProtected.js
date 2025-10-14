const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const Admin = require("../models/admin/Admin");

const adminProtect = asyncHandler(async (req, res, next) => {
    let token = req.cookies.auth_token || req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = await Admin.findById(decoded.id).select("-otp -otpExpires");

        if (!req.admin) {
            return res.status(401).json({ message: "Not authorized, admin not found" });
        }

        next();
    } catch (error) {
        console.error("Error verifying token:", error.message);
        return res.status(401).json({ message: "Not authorized, invalid token" });
    }
});

module.exports = { adminProtect };
