const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    batchName: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    mode: { type: String, enum: ["online","offline"], default: "offline" },
    room: { type: String, default: null, trim: true },
    isDeleted: { type: Boolean, default: false } // Soft delete
}, { timestamps: true });

// Index for faster queries
scheduleSchema.index({ teacherId: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model("Schedule", scheduleSchema);
