import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import Admin from "../models/Admin.js";
import Teacher from "../models/Teacher.js";
import Student from "../models/Student.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "university-portal-secret-key-2025";

// ── In-memory OTP store (USN → { otp, expiresAt, email }) ────────
const otpStore = new Map();

// ── Admin Login ──────────────────────────────────────────────────
router.post("/admin-login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password are required" });

    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { role: "admin", adminId: admin._id, username: admin.username },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.json({ token, role: "admin", username: admin.username });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ── Teacher Login ────────────────────────────────────────────────
router.post("/teacher-login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password are required" });

    const teacher = await Teacher.findOne({ username });
    if (!teacher) return res.status(401).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { role: "teacher", teacherId: teacher._id, username: teacher.username, name: teacher.name },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.json({ token, role: "teacher", username: teacher.username, name: teacher.name, teacherId: teacher._id });
  } catch (err) {
    console.error("Teacher login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ── Student: Request OTP (via Email) ─────────────────────────────
router.post("/student-request-otp", async (req, res) => {
  try {
    const { usn } = req.body;
    if (!usn) return res.status(400).json({ error: "USN is required" });

    const student = await Student.findOne({ usn: usn.trim() });
    if (!student) return res.status(404).json({ error: "No student found with this USN" });

    if (!student.email) {
      return res.status(400).json({ error: "No email registered for this student. Contact admin." });
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Store OTP with 5-minute expiry
    otpStore.set(usn.trim(), {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      email: student.email,
    });

    // ── Send OTP via Email ────────────────────────────────────
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"RV University Portal" <${process.env.SMTP_EMAIL}>`,
        to: student.email,
        subject: "Your Login OTP — RV University Portal",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 460px; margin: auto; padding: 30px; background: #1e1b4b; border-radius: 16px; color: #fff;">
            <h2 style="text-align: center; margin-bottom: 8px;">🎓 RV University Portal</h2>
            <p style="text-align: center; color: #a5b4fc; font-size: 14px;">Hello <strong>${student.name}</strong>,</p>
            <div style="text-align: center; margin: 24px 0;">
              <div style="display: inline-block; background: #312e81; padding: 16px 32px; border-radius: 12px; letter-spacing: 8px; font-size: 32px; font-family: monospace; font-weight: bold; color: #a5b4fc;">
                ${otp}
              </div>
            </div>
            <p style="text-align: center; color: #818cf8; font-size: 13px;">This OTP is valid for <strong>5 minutes</strong>.</p>
            <p style="text-align: center; color: #6366f1; font-size: 11px; margin-top: 20px;">If you didn't request this, please ignore this email.</p>
          </div>
        `,
      });
      console.log(`📧 OTP sent to ${student.email} for ${student.name} (${usn})`);
    } catch (emailErr) {
      console.error("Email send failed:", emailErr.message);
      // Fallback: log OTP to console
      console.log(`\n📧 [EMAIL FAILED - showing OTP in console]`);
      console.log(`   OTP for ${student.name} (${usn}): ${otp}`);
      console.log(`   Email: ${student.email}\n`);
    }

    // Mask email for frontend display
    const [emailUser, emailDomain] = student.email.split("@");
    const maskedEmail = emailUser.slice(0, 2) + "****" + "@" + emailDomain;

    res.json({
      message: "OTP sent successfully",
      maskedEmail,
      studentName: student.name,
    });
  } catch (err) {
    console.error("OTP request error:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// ── Student: Verify OTP & Login ──────────────────────────────────
router.post("/student-verify-otp", async (req, res) => {
  try {
    const { usn, otp } = req.body;
    if (!usn || !otp) return res.status(400).json({ error: "USN and OTP are required" });

    const stored = otpStore.get(usn.trim());
    if (!stored) return res.status(400).json({ error: "No OTP requested for this USN. Please request a new one." });

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(usn.trim());
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    if (stored.otp !== otp.trim()) {
      return res.status(401).json({ error: "Incorrect OTP. Please try again." });
    }

    otpStore.delete(usn.trim());

    const student = await Student.findOne({ usn: usn.trim() });
    if (!student) return res.status(404).json({ error: "Student not found" });

    const token = jwt.sign(
      { role: "student", studentId: student._id, usn: student.usn },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.json({ token, role: "student", student });
  } catch (err) {
    console.error("OTP verify error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

export default router;
