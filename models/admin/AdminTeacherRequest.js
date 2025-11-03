const mongoose = require("mongoose");
const validator = require("validator");

const adminTeacherRequestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: {
        type: String,
        unique: true,
        required: true,
        validate: [validator.isEmail, "Please enter a valid email"]
    },
    mobile: { type: String, unique: true, required: true },
    qualification: { type: String },
    joinDate: { type: Date, default: Date.now },
    subjects: [{ type: String }],
    salaryType: { type: String, enum: ["fixed", "per_class", "per_hour"], default: "fixed" },
    baseSalary: { type: Number, default: 0 },
    documents: [{ type: String }],
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    rejectionReason: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("AdminTeacherRequest", adminTeacherRequestSchema);
