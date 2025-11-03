const mongoose = require("mongoose");
const validator = require("validator");

const teacherSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: {
        type: String,
        unique: true,
        required: true,
        validate: [validator.isEmail, "Please enter a valid email"]
    },
    mobile: { type: String, unique: true, required: true },
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },
    qualification: { type: String },
    joinDate: { type: Date, default: Date.now },
    subjects: [{ type: String }],
    salaryType: { type: String, enum: ["fixed", "per_class", "per_hour"], default: "fixed" },
    baseSalary: { type: Number, default: 0 },
    documents: [{ type: String }],
    profileImage: { type: String },
    isActive: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Teacher", teacherSchema);
