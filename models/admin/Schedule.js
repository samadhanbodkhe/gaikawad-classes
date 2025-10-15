const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({
    teacherId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Teacher", 
        required: true 
    },
    batchName: { 
        type: String, 
        required: true, 
        trim: true 
    },
    subject: { 
        type: String, 
        required: true, 
        trim: true 
    },
    // Store date and time separately in Indian format
    scheduleDate: {
        type: String, // Store as "2025-10-15"
        required: true
    },
    startTime: {
        type: String, // Store as "02:00 PM"
        required: true
    },
    endTime: {
        type: String, // Store as "04:00 PM" 
        required: true
    },
    mode: { 
        type: String, 
        enum: ["online", "offline"], 
        default: "offline" 
    },
    room: { 
        type: String, 
        default: null, 
        trim: true 
    },
    isDeleted: { 
        type: Boolean, 
        default: false 
    }
}, { 
    timestamps: true 
});

// Index for faster queries
scheduleSchema.index({ teacherId: 1, scheduleDate: 1 });

module.exports = mongoose.model("Schedule", scheduleSchema);