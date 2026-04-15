import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import studentRoutes from "./routes/studentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import marksRoutes from "./routes/marksRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";


dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// ── Serverless Native MongoDB Connection ────────────────────────
const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ MongoDB connected natively");
  } catch (err) {
    console.error("🚨 MongoDB failed:", err.message);
  }
};

app.use(async (req, res, next) => {
  await connectDB();
  if (!mongoose.connections[0].readyState && req.path !== "/" && req.path !== "/api/health") {
    return res.status(503).json({ error: "Database offline" });
  }
  next();
});

// ── Routes ───────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/marks", marksRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ status: "Backend running", db: mongoose.connections[0].readyState ? "connected" : "disconnected" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", db: mongoose.connections[0].readyState ? "connected" : "disconnected" });
});

// Standard Node listener for Render / Dedicated Hosts
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running locally on port ${PORT}`);
  });
}

export default app;
