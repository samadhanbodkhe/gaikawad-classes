const mongoose = require("mongoose");

const leaveRequestSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    leaveType: { type: String, required: true, trim: true }, // e.g. Sick, Casual
    reason: { type: String, trim: true },
    status: { type: String, enum: ["Pending","Approved","Rejected"], default: "Pending" },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    processedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    // Add these fields for time tracking
    appliedAt: { type: Date, default: Date.now }, // Timestamp when request was created
    fromTime: { type: String }, // Store time separately if needed
    toTime: { type: String } // Store time separately if needed
}, { timestamps: true });

leaveRequestSchema.index({ teacherId: 1, status: 1 });

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);