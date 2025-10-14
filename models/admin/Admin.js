const mongoose = require("mongoose");
const validator = require("validator");

const adminSchema = new mongoose.Schema({
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
    isVerified: { type: Boolean, default: false },

}, { timestamps: true })

module.exports = mongoose.model("Admin", adminSchema);