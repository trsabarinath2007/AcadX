require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const connectDB = require("./config/db");

/* =========================================================
   ROUTES
========================================================= */

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const courseRoutes = require("./routes/courses");
const assignmentRoutes = require("./routes/assignments");
const quizRoutes = require("./routes/quizzes");
const attendanceRoutes = require("./routes/attendance");
const analyticsRoutes = require("./routes/analytics");
const aiRoutes = require("./routes/ai");
const discussionRoutes = require("./routes/discussions");
const notificationRoutes = require("./routes/notifications");
const announcementRoutes = require("./routes/announcements");
const userRoutes = require("./routes/users");

/* =========================================================
   ACADEMIC ROUTES
   Faculty Marks / Academic Records
========================================================= */

const academicRoutes = require("./routes/academic");

/* =========================================================
   APP
========================================================= */

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================================================
   CORS
========================================================= */

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? true
        : process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

/* =========================================================
   BODY PARSERS
========================================================= */

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================================================
   COOKIES
========================================================= */

app.use(cookieParser());

/* =========================================================
   LOGGER
========================================================= */

app.use(morgan("dev"));

/* =========================================================
   UPLOADS
========================================================= */

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use("/uploads", express.static(uploadDir));

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    name: "AcadX",
    message: "AcadX API is running",
  });
});

/* =========================================================
   API ROUTES
========================================================= */

app.use("/api/auth", authRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/courses", courseRoutes);

app.use("/api/assignments", assignmentRoutes);

app.use("/api/quizzes", quizRoutes);

app.use("/api/attendance", attendanceRoutes);

app.use("/api/analytics", analyticsRoutes);

/* =========================================================
   ACADEMIC
   Faculty Marks
========================================================= */

app.use("/api/academic", academicRoutes);

/* =========================================================
   AI
========================================================= */

app.use("/api/ai", aiRoutes);

/* =========================================================
   DISCUSSIONS
========================================================= */

app.use("/api/discussions", discussionRoutes);

/* =========================================================
   NOTIFICATIONS
========================================================= */

app.use("/api/notifications", notificationRoutes);

/* =========================================================
   ANNOUNCEMENTS
========================================================= */

app.use("/api/announcements", announcementRoutes);

/* =========================================================
   USERS
========================================================= */

app.use("/api/users", userRoutes);

/* =========================================================
   SERVE FRONTEND BUILD
========================================================= */

const clientDist = path.join(__dirname, "..", "client", "dist");

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));

  app.get("*splat", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }

    res.sendFile(path.join(clientDist, "index.html"));
  });
}

/* =========================================================
   DATABASE + SERVER
========================================================= */

connectDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `AcadX server running on http://localhost:${PORT}`
      );
    });
  })
  .catch((error) => {
    console.error(
      "Database connection failed:",
      error.message
    );

    process.exit(1);
  });