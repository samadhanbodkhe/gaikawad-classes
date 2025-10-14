// controller/teacherController/studentAttendanceController.js
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const StudentAttendance = require("../../models/teacher/StudentAttendance");
const Student = require("../../models/teacher/Student");
const PDFDocument = require('pdfkit');
const moment = require('moment');

// ✅ Mark Attendance for Multiple Students
exports.markAttendance = asyncHandler(async (req, res) => {
  const { attendanceData, date, className, section } = req.body;
  const teacherId = req.teacher._id;

  if (!attendanceData || !date || !className || !section) {
    res.status(400);
    throw new Error("Attendance data, date, class and section are required");
  }

  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);

  const results = [];
  const errors = [];

  for (const item of attendanceData) {
    try {
      const student = await Student.findById(item.studentId);
      if (!student) {
        errors.push(`Student not found: ${item.studentId}`);
        continue;
      }

      // Check if attendance already exists
      const existingAttendance = await StudentAttendance.findOne({
        studentId: item.studentId,
        date: attendanceDate,
        session: item.session || "Full Day"
      });

      if (existingAttendance) {
        // Update existing attendance
        existingAttendance.status = item.status;
        existingAttendance.teacherId = teacherId;
        existingAttendance.reason = item.reason || "";
        existingAttendance.notes = item.notes || "";
        await existingAttendance.save();
        results.push(existingAttendance);
      } else {
        // Create new attendance only if status is provided
        if (item.status) {
          const attendance = await StudentAttendance.create({
            studentId: item.studentId,
            teacherId,
            className: student.className,
            section: student.section,
            status: item.status,
            date: attendanceDate,
            session: item.session || "Full Day",
            reason: item.reason || "",
            notes: item.notes || ""
          });
          results.push(attendance);
        }
      }
    } catch (error) {
      errors.push(`Error for student ${item.studentId}: ${error.message}`);
    }
  }

  res.status(200).json({
    success: true,
    message: "Attendance marked successfully",
    data: results,
    errors: errors.length > 0 ? errors : undefined
  });
});

// ✅ Get Class Attendance with Student Details
exports.getClassAttendance = asyncHandler(async (req, res) => {
  const { className, section, date } = req.params;
  
  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);
  const endDate = new Date(attendanceDate);
  endDate.setDate(attendanceDate.getDate() + 1);

  // Get all students in the class
  const students = await Student.find({ 
    className, 
    section,
    isActive: true 
  }).sort({ rollNumber: 1 });

  // Get attendance for the date
  const attendanceRecords = await StudentAttendance.find({
    className,
    section,
    date: { $gte: attendanceDate, $lt: endDate }
  }).populate("teacherId", "name email")
    .populate("studentId", "name rollNumber parentName contactNumber gender address");

  // Combine student data with attendance
  const attendanceWithStudents = students.map(student => {
    const attendance = attendanceRecords.find(a => 
      a.studentId._id.toString() === student._id.toString()
    );
    
    return {
      student: {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        parentName: student.parentName,
        contactNumber: student.contactNumber,
        gender: student.gender,
        address: student.address
      },
      attendance: attendance ? {
        _id: attendance._id,
        status: attendance.status,
        session: attendance.session,
        date: attendance.date,
        reason: attendance.reason,
        notes: attendance.notes,
        markedBy: attendance.teacherId
      } : null
    };
  });

  // Calculate summary
  const presentCount = attendanceRecords.filter(a => a.status === "Present").length;
  const absentCount = attendanceRecords.filter(a => a.status === "Absent").length;

  res.status(200).json({ 
    success: true, 
    data: attendanceWithStudents,
    summary: {
      totalStudents: students.length,
      present: presentCount,
      absent: absentCount,
      notMarked: students.length - attendanceRecords.length,
      attendancePercentage: students.length > 0 ? ((presentCount / students.length) * 100).toFixed(1) : 0
    }
  });
});

// ✅ Get Student Attendance History
exports.getStudentHistory = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { startDate, endDate, month, year } = req.query;

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    res.status(400);
    throw new Error("Invalid Student ID");
  }

  const student = await Student.findById(studentId);
  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }

  let start, end;
  
  if (month && year) {
    // Get monthly data
    start = new Date(year, month - 1, 1);
    end = new Date(year, month, 0);
  } else {
    // Get custom date range
    start = new Date(startDate);
    end = new Date(endDate);
  }
  
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const history = await StudentAttendance.find({
    studentId,
    date: { $gte: start, $lte: end }
  })
    .populate("teacherId", "name email mobile")
    .sort({ date: -1 });

  // Calculate detailed summary
  const totalDays = history.length;
  const presentDays = history.filter(a => a.status === "Present").length;
  const absentDays = history.filter(a => a.status === "Absent").length;
  const attendancePercentage = totalDays > 0 ? (presentDays / totalDays * 100).toFixed(2) : 0;

  // Get reason statistics
  const reasonStats = {};
  history.filter(a => a.status === "Absent" && a.reason).forEach(record => {
    reasonStats[record.reason] = (reasonStats[record.reason] || 0) + 1;
  });

  res.status(200).json({
    success: true,
    data: {
      student: {
        name: student.name,
        rollNumber: student.rollNumber,
        className: student.className,
        section: student.section,
        parentName: student.parentName,
        contactNumber: student.contactNumber,
        address: student.address
      },
      history,
      summary: {
        totalDays,
        presentDays,
        absentDays,
        attendancePercentage,
        reasonStats
      }
    }
  });
});

exports.toggleAttendance = asyncHandler(async (req, res) => {
  const { attendanceId } = req.params;
  const { reason, notes, status } = req.body;

  // ✅ Added log for debugging
  if (!attendanceId) {
    res.status(400);
    throw new Error("Attendance ID not provided");
  }

  if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
    res.status(400);
    throw new Error("Invalid Attendance ID");
  }

  const attendance = await StudentAttendance.findById(attendanceId)
    .populate("teacherId", "name email")
    .populate("studentId", "name rollNumber className section");

  if (!attendance) {
    res.status(404);
    throw new Error("Attendance record not found");
  }

  const newStatus = status || (attendance.status === "Present" ? "Absent" : "Present");

  if (attendance.status === newStatus) {
    return res.status(200).json({
      success: true,
      message: `Student is already marked as ${attendance.status}`,
      data: attendance,
    });
  }

  attendance.status = newStatus;
  attendance.reason = newStatus === "Absent" ? reason || "Not Specified" : "";
  attendance.notes = newStatus === "Absent" ? notes || "" : "";

  attendance.updatedAt = Date.now();
  const updatedAttendance = await attendance.save();

  await updatedAttendance.populate("studentId", "name rollNumber className section");
  await updatedAttendance.populate("teacherId", "name email");

  res.status(200).json({
    success: true,
    message: `Attendance updated to ${newStatus} successfully`,
    data: updatedAttendance,
  });
});


// ✅ Get Monthly Attendance Summary
exports.getMonthlySummary = asyncHandler(async (req, res) => {
  const { className, section, month, year } = req.query;
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  endDate.setHours(23, 59, 59, 999);

  const students = await Student.find({ className, section, isActive: true });
  const attendance = await StudentAttendance.find({
    className,
    section,
    date: { $gte: startDate, $lte: endDate }
  });

  const summary = students.map(student => {
    const studentAttendance = attendance.filter(a => 
      a.studentId.toString() === student._id.toString()
    );
    
    const presentDays = studentAttendance.filter(a => a.status === "Present").length;
    const absentDays = studentAttendance.filter(a => a.status === "Absent").length;
    const totalDays = studentAttendance.length;
    const percentage = totalDays > 0 ? (presentDays / totalDays * 100).toFixed(2) : 0;

    return {
      student: {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        parentName: student.parentName,
        contactNumber: student.contactNumber
      },
      presentDays,
      absentDays,
      totalDays,
      attendancePercentage: percentage
    };
  });

  res.status(200).json({
    success: true,
    data: {
      summary: summary.sort((a, b) => b.attendancePercentage - a.attendancePercentage),
      overallStats: {
        totalStudents: students.length,
        averageAttendance: students.length > 0 ? 
          (summary.reduce((acc, curr) => acc + parseFloat(curr.attendancePercentage), 0) / students.length).toFixed(2) : 0,
        totalPresent: summary.reduce((acc, curr) => acc + curr.presentDays, 0),
        totalAbsent: summary.reduce((acc, curr) => acc + curr.absentDays, 0)
      }
    }
  });
});

// ✅ Generate Attendance PDF Report (Fixed + Professional)
exports.generateAttendancePDF = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { startDate, endDate, month, year, reportType = 'detailed' } = req.query;

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    res.status(400);
    throw new Error("Invalid Student ID");
  }

  const student = await Student.findById(studentId);
  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }

  let start, end, periodText;
  if (month && year) {
    start = new Date(year, month - 1, 1);
    end = new Date(year, month, 0);
    periodText = `${moment(start).format('MMMM YYYY')}`;
  } else if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
    periodText = `${moment(start).format('DD MMM YYYY')} - ${moment(end).format('DD MMM YYYY')}`;
  } else {
    start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    periodText = `${moment(start).format('MMMM YYYY')}`;
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const history = await StudentAttendance.find({
    studentId,
    date: { $gte: start, $lte: end }
  }).populate("teacherId", "name").sort({ date: 1 });

  const totalDays = history.length;
  const presentDays = history.filter(a => a.status === "Present").length;
  const absentDays = history.filter(a => a.status === "Absent").length;
  const attendancePercentage = totalDays > 0 ? (presentDays / totalDays * 100).toFixed(2) : 0;

  // ✅ Create PDF with buffering enabled
  const doc = new PDFDocument({ margin: 50, bufferPages: true });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="attendance-report-${student.rollNumber}-${periodText.replace(/\s+/g, '-')}.pdf"`
  );

  doc.pipe(res);

  // -----------------------------
  // 📘 HEADER
  // -----------------------------
  doc
    .font('Helvetica-Bold')
    .fontSize(20)
    .text('SCHOOL MANAGEMENT SYSTEM', { align: 'center' })
    .moveDown(0.3);
  doc.fontSize(16).text('Attendance Report', { align: 'center' });
  doc.moveDown();

  // -----------------------------
  // 🧑‍🎓 STUDENT INFO
  // -----------------------------
  doc.font('Helvetica-Bold').fontSize(12).text('STUDENT INFORMATION', { underline: true });
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(10);
  doc.text(`Name: ${student.name}`);
  doc.text(`Roll Number: ${student.rollNumber}`);
  doc.text(`Class: ${student.className} - ${student.section}`);
  doc.text(`Parent: ${student.parentName}`);
  doc.text(`Contact: ${student.contactNumber}`);
  doc.text(`Report Period: ${periodText}`);
  doc.moveDown(1);

  // -----------------------------
  // 📊 ATTENDANCE SUMMARY
  // -----------------------------
  doc.font('Helvetica-Bold').fontSize(12).text('SUMMARY', { underline: true });
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(10);
  doc.text(`Total Records: ${totalDays}`);
  doc.text(`Present Days: ${presentDays}`);
  doc.text(`Absent Days: ${absentDays}`);
  doc.text(`Attendance Percentage: ${attendancePercentage}%`);
  doc.moveDown(1);

  // -----------------------------
  // 📅 DETAILED RECORDS
  // -----------------------------
  if (reportType === 'detailed' && history.length > 0) {
    doc.font('Helvetica-Bold').fontSize(12).text('DETAILED ATTENDANCE RECORD', { underline: true });
    doc.moveDown(0.5);

    const tableTop = doc.y + 10;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Date', 50, tableTop);
    doc.text('Day', 120, tableTop);
    doc.text('Status', 180, tableTop);
    doc.text('Reason', 240, tableTop);
    doc.text('Session', 370, tableTop);
    doc.text('Marked By', 450, tableTop);

    doc.moveTo(50, tableTop + 12).lineTo(550, tableTop + 12).stroke();

    let y = tableTop + 20;
    doc.font('Helvetica').fontSize(9);

    history.forEach(record => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      doc.text(moment(record.date).format('DD/MM/YYYY'), 50, y);
      doc.text(moment(record.date).format('ddd'), 120, y);

      // ✅ Color-code Present/Absent
      if (record.status === 'Present') {
        doc.fillColor('green').text('Present', 180, y);
      } else {
        doc.fillColor('red').text('Absent', 180, y);
      }
      doc.fillColor('black');

      doc.text(record.reason || '-', 240, y, { width: 120 });
      doc.text(record.session, 370, y);
      doc.text(record.teacherId?.name || '-', 450, y);
      y += 20;
    });
  }

  // -----------------------------
  // 📈 ABSENCE REASON STATS
  // -----------------------------
  const reasonStats = {};
  history.filter(a => a.status === "Absent" && a.reason).forEach(a => {
    reasonStats[a.reason] = (reasonStats[a.reason] || 0) + 1;
  });

  if (Object.keys(reasonStats).length > 0) {
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(12).text('ABSENCE REASON ANALYSIS', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10);
    Object.entries(reasonStats).forEach(([reason, count]) => {
      const percentage = ((count / absentDays) * 100).toFixed(1);
      doc.text(`${reason}: ${count} times (${percentage}%)`);
    });
  }

  // -----------------------------
  // 📄 FOOTER WITH PAGE NUMBERS
  // -----------------------------
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor('gray')
      .text(
        `Generated on ${moment().format('DD/MM/YYYY HH:mm')}  |  Page ${i + 1} of ${range.count}`,
        50,
        doc.page.height - 40,
        { align: 'center' }
      )
      .fillColor('black');
  }

  doc.end();
});
