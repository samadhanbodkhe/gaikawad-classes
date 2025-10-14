// models/teacher/StudentAttendance.js
const mongoose = require("mongoose");

const studentAttendanceSchema = new mongoose.Schema({
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Student", 
    required: true 
  },
  teacherId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Teacher", 
    required: true 
  },
  className: { 
    type: String, 
    required: true 
  },
  section: { 
    type: String, 
    default: "A" 
  },
  date: { 
    type: Date, 
    required: true 
  },
  session: { 
    type: String, 
    enum: ["Morning", "Evening", "Full Day"], 
    default: "Full Day" 
  },
  status: { 
    type: String, 
    enum: ["Present", "Absent"], 
    required: true 
  },
  reason: {
    type: String,
    trim: true,
    default: ""
  },
  notes: {
    type: String,
    trim: true,
    default: ""
  }
}, { 
  timestamps: true 
});

// ✅ Compound index to prevent duplicate attendance
studentAttendanceSchema.index({ 
  studentId: 1, 
  date: 1, 
  session: 1 
}, { 
  unique: true 
});

// Static: get class attendance
studentAttendanceSchema.statics.getClassAttendance = async function (className, section, date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return this.find({ className, section, date: { $gte: start, $lt: end } })
    .populate("studentId", "name rollNumber parentName contactNumber gender address")
    .populate("teacherId", "name email");
};

// Static: get student history
studentAttendanceSchema.statics.getStudentHistory = async function (studentId, startDate, endDate) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return this.find({ studentId, date: { $gte: start, $lte: end } })
    .populate("teacherId", "name email mobile")
    .sort({ date: -1 });
};

// Instance: toggle attendance
studentAttendanceSchema.methods.toggleStatus = async function () {
  this.status = this.status === "Present" ? "Absent" : "Present";
  if (this.status === "Present") {
    this.reason = "";
    this.notes = "";
  }
  return this.save();
};

module.exports = mongoose.model("StudentAttendance", studentAttendanceSchema);