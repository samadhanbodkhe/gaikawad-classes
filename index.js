const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://gaikawad-classes.vercel.app",
    "https://gaikawad-classes-admin-panal.vercel.app",
   "https://gaikawad-classes-teacher-panal.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  });

// Routes
app.use("/api/v1/adminAuth", require("./routes/admin/adminRoute"));
app.use("/api/v1/approveReject", require("./routes/admin/teacherApproveRoute"));
app.use("/api/v1/attendance", require("./routes/admin/attendanceRoutes"));
app.use("/api/v1/schedule", require("./routes/admin/scheduleRoutes"));
app.use("/api/v1/salary", require("./routes/admin/salaryRoutes"));
app.use("/api/v1/dashboard", require("./routes/admin/dashboardRoutes"));


//teacher
app.use("/api/v1/teacherAuth", require("./routes/teacher/teacherRoute"));
app.use("/api/v1/leaveRequest", require("./routes/teacher/leaveRequestRoutes"));
app.use("/api/v1/student", require("./routes/teacher/studentRoutes"));
app.use("/api/v1/attendanceStudent", require("./routes/teacher/studentAttendanceRoutes"));

app.get("/*splat", (req, res) => {
  res.status(404).json({ message: "Resource Not Found" });
});

app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
module.exports = app
