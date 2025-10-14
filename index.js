// index.js
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const serverless = require("serverless-http");
const cors = require("cors");

// Initialize Express
const app = express();

// ------------------ CORS Setup ------------------
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://<your-frontend>.vercel.app" // <-- replace with your Vercel frontend URL
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

// ------------------ Middleware ------------------
app.use(express.json());
app.use(cookieParser());

// ------------------ MongoDB Connection (Serverless Safe) ------------------
let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = { useNewUrlParser: true, useUnifiedTopology: true };
    cached.promise = mongoose.connect(process.env.MONGO_URL, opts).then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// ------------------ Routes ------------------

// Admin Routes
app.use("/api/v1/adminAuth", require("./routes/admin/adminRoute"));
app.use("/api/v1/approveReject", require("./routes/admin/teacherApproveRoute"));
app.use("/api/v1/attendance", require("./routes/admin/attendanceRoutes"));
app.use("/api/v1/schedule", require("./routes/admin/scheduleRoutes"));
app.use("/api/v1/salary", require("./routes/admin/salaryRoutes"));
app.use("/api/v1/dashboard", require("./routes/admin/dashboardRoutes"));

// Teacher Routes
app.use("/api/v1/teacherAuth", require("./routes/teacher/teacherRoute"));
app.use("/api/v1/leaveRequest", require("./routes/teacher/leaveRequestRoutes"));
app.use("/api/v1/student", require("./routes/teacher/studentRoutes"));
app.use("/api/v1/attendanceStudent", require("./routes/teacher/studentAttendanceRoutes"));

// 404 Route
app.get("/*", (req, res) => {
  res.status(404).json({ message: "Resource Not Found" });
});

// Error Handling
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
});

// ------------------ Export as Serverless ------------------
module.exports = serverless(async (req, res) => {
  await connectToDatabase(); // connect MongoDB before handling request
  return app(req, res);
});
