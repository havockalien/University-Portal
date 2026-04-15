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

// ── MongoDB Connection with retry logic ──────────────────────────
let isDbConnected = false;

const connectDB = async (retries = 5, delay = 5000) => {
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`📡 MongoDB connection attempt ${i}/${retries}...`);
      await mongoose.connect(process.env.MONGO_URL, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      isDbConnected = true;
      console.log("✅ MongoDB connected successfully");
      return;
    } catch (err) {
      console.error(`❌ Attempt ${i} failed: ${err.message}`);
      if (i < retries) {
        console.log(`⏳ Retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  console.error("🚨 All MongoDB connection attempts failed. Server will run without DB.");
};

// Monitor connection events
mongoose.connection.on("disconnected", () => {
  isDbConnected = false;
  console.log("⚠️  MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  isDbConnected = true;
  console.log("✅ MongoDB reconnected");
});

// Middleware to check DB connection before DB-dependent routes
app.use("/api", (req, res, next) => {
  if (!isDbConnected) {
    return res.status(503).json({
      error: "Database is currently unavailable. Please try again later.",
      dbStatus: "disconnected",
    });
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
  res.json({ status: "Backend running", db: isDbConnected ? "connected" : "disconnected" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", db: isDbConnected ? "connected" : "disconnected" });
});

// Ensure DB connects directly (essential for Serverless lambdas)
connectDB();

// Only listen locally, Vercel will handle its own routing hooks natively
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running locally on port ${PORT}`);
  });
}

export default app;
