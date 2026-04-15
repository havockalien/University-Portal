// server.js
import express7 from "express";
import mongoose7 from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

// routes/studentRoutes.js
import express from "express";

// models/Student.js
import mongoose from "mongoose";
var StudentSchema = new mongoose.Schema({
  name: String,
  course: String,
  department: String,
  batchYear: Number,
  phone: String,
  email: String,
  imageUrl: String,
  admissionNumber: { type: String, unique: true },
  usn: { type: String, unique: true }
}, { timestamps: true });
var Student_default = mongoose.model("Student", StudentSchema);

// routes/studentRoutes.js
import multer from "multer";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";

// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
var JWT_SECRET = process.env.JWT_SECRET || "university-portal-secret-key-2025";
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
function teacherOnly(req, res, next) {
  if (req.user?.role !== "teacher") {
    return res.status(403).json({ error: "Teacher access required" });
  }
  next();
}
function studentOnly(req, res, next) {
  if (req.user?.role !== "student") {
    return res.status(403).json({ error: "Student access required" });
  }
  next();
}

// routes/studentRoutes.js
var router = express.Router();
var upload = multer({ dest: "temp/" });
var DEPT_CODE_MAP = {
  "School of Computer Science": "CSE",
  "School of Business": "BUS",
  "School of Law": "LAW",
  "School of Political Sciences": "POL",
  "School of Design": "DES"
};
async function generateAdmissionNumber(batchYear) {
  const prefix = `RVUN${batchYear}`;
  const count = await Student_default.countDocuments({
    admissionNumber: { $regex: `^${prefix}` }
  });
  const serial = String(count + 1).padStart(3, "0");
  return `${prefix}${serial}`;
}
async function generateUSN(department, batchYear) {
  const schoolCode = DEPT_CODE_MAP[department] || "GEN";
  const prefix = `RVU${batchYear}${schoolCode}`;
  const count = await Student_default.countDocuments({
    usn: { $regex: `^${prefix}` }
  });
  const serial = String(count + 1).padStart(3, "0");
  return `${prefix}${serial}`;
}
router.get("/all", async (req, res) => {
  const students = await Student_default.find().sort({ createdAt: -1 });
  res.json(students);
});
router.get("/:id", async (req, res) => {
  try {
    const student = await Student_default.findById(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch student" });
  }
});
router.post("/add", verifyToken, adminOnly, upload.single("image"), async (req, res) => {
  try {
    const data = new FormData();
    data.append("file", fs.createReadStream(req.file.path));
    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      data,
      {
        headers: {
          ...data.getHeaders(),
          Authorization: `Bearer ${process.env.PINATA_JWT}`
        }
      }
    );
    const imageUrl = `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
    const batchYear = req.body.batchYear || (/* @__PURE__ */ new Date()).getFullYear();
    const admissionNumber = await generateAdmissionNumber(batchYear);
    const usn = await generateUSN(req.body.department, batchYear);
    const student = await Student_default.create({
      name: req.body.name,
      course: req.body.course,
      department: req.body.department,
      batchYear,
      phone: req.body.phone,
      email: req.body.email,
      imageUrl,
      admissionNumber,
      usn
    });
    fs.unlinkSync(req.file.path);
    res.json(student);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add student" });
  }
});
router.put("/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { name, course, department, phone, email } = req.body;
    const student = await Student_default.findByIdAndUpdate(
      req.params.id,
      { name, course, department, phone, email },
      { new: true, runValidators: true }
    );
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json({ message: "Student updated successfully", student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update student" });
  }
});
router.delete("/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const student = await Student_default.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json({ message: "Student deleted successfully", student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete student" });
  }
});
var studentRoutes_default = router;

// routes/authRoutes.js
import express2 from "express";
import bcrypt from "bcryptjs";
import jwt2 from "jsonwebtoken";
import nodemailer from "nodemailer";

// models/Admin.js
import mongoose2 from "mongoose";
var AdminSchema = new mongoose2.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}, { timestamps: true });
var Admin_default = mongoose2.model("Admin", AdminSchema);

// models/Teacher.js
import mongoose3 from "mongoose";
var TeacherSchema = new mongoose3.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  subjectIds: [{ type: mongoose3.Schema.Types.ObjectId, ref: "Subject" }]
}, { timestamps: true });
var Teacher_default = mongoose3.model("Teacher", TeacherSchema);

// routes/authRoutes.js
var router2 = express2.Router();
var JWT_SECRET2 = process.env.JWT_SECRET || "university-portal-secret-key-2025";
var otpStore = /* @__PURE__ */ new Map();
router2.post("/admin-login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password are required" });
    const admin = await Admin_default.findOne({ username });
    if (!admin) return res.status(401).json({ error: "Invalid credentials" });
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt2.sign(
      { role: "admin", adminId: admin._id, username: admin.username },
      JWT_SECRET2,
      { expiresIn: "24h" }
    );
    res.json({ token, role: "admin", username: admin.username });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});
router2.post("/teacher-login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password are required" });
    const teacher = await Teacher_default.findOne({ username });
    if (!teacher) return res.status(401).json({ error: "Invalid credentials" });
    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt2.sign(
      { role: "teacher", teacherId: teacher._id, username: teacher.username, name: teacher.name },
      JWT_SECRET2,
      { expiresIn: "24h" }
    );
    res.json({ token, role: "teacher", username: teacher.username, name: teacher.name, teacherId: teacher._id });
  } catch (err) {
    console.error("Teacher login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});
router2.post("/student-request-otp", async (req, res) => {
  try {
    const { usn } = req.body;
    if (!usn) return res.status(400).json({ error: "USN is required" });
    const student = await Student_default.findOne({ usn: usn.trim() });
    if (!student) return res.status(404).json({ error: "No student found with this USN" });
    if (!student.email) {
      return res.status(400).json({ error: "No email registered for this student. Contact admin." });
    }
    const otp = String(Math.floor(1e5 + Math.random() * 9e5));
    otpStore.set(usn.trim(), {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1e3,
      email: student.email
    });
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD
        }
      });
      await transporter.sendMail({
        from: `"RV University Portal" <${process.env.SMTP_EMAIL}>`,
        to: student.email,
        subject: "Your Login OTP \u2014 RV University Portal",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 460px; margin: auto; padding: 30px; background: #1e1b4b; border-radius: 16px; color: #fff;">
            <h2 style="text-align: center; margin-bottom: 8px;">\u{1F393} RV University Portal</h2>
            <p style="text-align: center; color: #a5b4fc; font-size: 14px;">Hello <strong>${student.name}</strong>,</p>
            <div style="text-align: center; margin: 24px 0;">
              <div style="display: inline-block; background: #312e81; padding: 16px 32px; border-radius: 12px; letter-spacing: 8px; font-size: 32px; font-family: monospace; font-weight: bold; color: #a5b4fc;">
                ${otp}
              </div>
            </div>
            <p style="text-align: center; color: #818cf8; font-size: 13px;">This OTP is valid for <strong>5 minutes</strong>.</p>
            <p style="text-align: center; color: #6366f1; font-size: 11px; margin-top: 20px;">If you didn't request this, please ignore this email.</p>
          </div>
        `
      });
      console.log(`\u{1F4E7} OTP sent to ${student.email} for ${student.name} (${usn})`);
    } catch (emailErr) {
      console.error("Email send failed:", emailErr.message);
      console.log(`
\u{1F4E7} [EMAIL FAILED - showing OTP in console]`);
      console.log(`   OTP for ${student.name} (${usn}): ${otp}`);
      console.log(`   Email: ${student.email}
`);
    }
    const [emailUser, emailDomain] = student.email.split("@");
    const maskedEmail = emailUser.slice(0, 2) + "****@" + emailDomain;
    res.json({
      message: "OTP sent successfully",
      maskedEmail,
      studentName: student.name
    });
  } catch (err) {
    console.error("OTP request error:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});
router2.post("/student-verify-otp", async (req, res) => {
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
    const student = await Student_default.findOne({ usn: usn.trim() });
    if (!student) return res.status(404).json({ error: "Student not found" });
    const token = jwt2.sign(
      { role: "student", studentId: student._id, usn: student.usn },
      JWT_SECRET2,
      { expiresIn: "24h" }
    );
    res.json({ token, role: "student", student });
  } catch (err) {
    console.error("OTP verify error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});
var authRoutes_default = router2;

// routes/subjectRoutes.js
import express3 from "express";

// models/Subject.js
import mongoose4 from "mongoose";
var SubjectSchema = new mongoose4.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  facultyId: { type: mongoose4.Schema.Types.ObjectId, ref: "Teacher", default: null },
  enrolledStudents: [{ type: mongoose4.Schema.Types.ObjectId, ref: "Student" }]
}, { timestamps: true });
var Subject_default = mongoose4.model("Subject", SubjectSchema);

// routes/subjectRoutes.js
var router3 = express3.Router();
router3.get("/my-subjects", verifyToken, teacherOnly, async (req, res) => {
  try {
    const subjects = await Subject_default.find({ facultyId: req.user.teacherId }).populate("enrolledStudents", "name usn admissionNumber").lean();
    res.json(subjects);
  } catch (err) {
    console.error("my-subjects error:", err);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});
router3.get("/enrolled", verifyToken, studentOnly, async (req, res) => {
  try {
    const subjects = await Subject_default.find({ enrolledStudents: req.user.studentId }).populate("facultyId", "name username").lean();
    res.json(subjects);
  } catch (err) {
    console.error("enrolled error:", err);
    res.status(500).json({ error: "Failed to fetch enrolled subjects" });
  }
});
router3.get("/all", verifyToken, async (req, res) => {
  try {
    const subjects = await Subject_default.find().populate("facultyId", "name username").populate("enrolledStudents", "name usn").lean();
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});
var subjectRoutes_default = router3;

// routes/attendanceRoutes.js
import express4 from "express";

// models/Attendance.js
import mongoose5 from "mongoose";
var AttendanceSchema = new mongoose5.Schema({
  subjectId: { type: mongoose5.Schema.Types.ObjectId, ref: "Subject", required: true },
  studentId: { type: mongoose5.Schema.Types.ObjectId, ref: "Student", required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ["present", "absent"], required: true },
  takenBy: { type: mongoose5.Schema.Types.ObjectId, ref: "Teacher", required: true },
  disputed: { type: Boolean, default: false },
  disputeReason: { type: String, default: "" }
}, { timestamps: true });
AttendanceSchema.index({ subjectId: 1, studentId: 1, date: 1 }, { unique: true });
var Attendance_default = mongoose5.model("Attendance", AttendanceSchema);

// routes/attendanceRoutes.js
var router4 = express4.Router();
function toDateOnly(d) {
  const dt = d ? new Date(d) : /* @__PURE__ */ new Date();
  dt.setUTCHours(0, 0, 0, 0);
  return dt;
}
router4.post("/take", verifyToken, teacherOnly, async (req, res) => {
  try {
    const { subjectId, date, records } = req.body;
    if (!subjectId || !records?.length) {
      return res.status(400).json({ error: "subjectId and records are required" });
    }
    const subject = await Subject_default.findOne({ _id: subjectId, facultyId: req.user.teacherId });
    if (!subject) return res.status(403).json({ error: "You are not assigned to this subject" });
    const attendanceDate = toDateOnly(date);
    const ops = records.map(({ studentId, status }) => ({
      updateOne: {
        filter: { subjectId, studentId, date: attendanceDate },
        update: { $set: { status, takenBy: req.user.teacherId, disputed: false, disputeReason: "" } },
        upsert: true
      }
    }));
    const result = await Attendance_default.bulkWrite(ops);
    res.json({ message: "Attendance saved", upserted: result.upsertedCount, modified: result.modifiedCount });
  } catch (err) {
    console.error("take attendance error:", err);
    res.status(500).json({ error: "Failed to save attendance" });
  }
});
router4.get("/subject/:subjectId", verifyToken, teacherOnly, async (req, res) => {
  try {
    const records = await Attendance_default.find({ subjectId: req.params.subjectId }).populate("studentId", "name usn admissionNumber").sort({ date: -1 }).lean();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});
router4.get("/:subjectId/:studentId", verifyToken, async (req, res) => {
  try {
    const records = await Attendance_default.find({
      subjectId: req.params.subjectId,
      studentId: req.params.studentId
    }).sort({ date: 1 }).lean();
    const total = records.length;
    const present = records.filter((r) => r.status === "present").length;
    const pct = total > 0 ? Math.round(present / total * 100) : null;
    res.json({ records, total, present, absent: total - present, percentage: pct });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});
router4.put("/:id/dispute", verifyToken, studentOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const record = await Attendance_default.findById(req.params.id);
    if (!record) return res.status(404).json({ error: "Attendance record not found" });
    if (String(record.studentId) !== req.user.studentId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    record.disputed = true;
    record.disputeReason = reason || "Marked incorrectly";
    await record.save();
    res.json({ message: "Dispute filed", record });
  } catch (err) {
    res.status(500).json({ error: "Failed to file dispute" });
  }
});
router4.put("/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { status, disputed } = req.body;
    const record = await Attendance_default.findByIdAndUpdate(
      req.params.id,
      { ...status && { status }, ...disputed !== void 0 && { disputed } },
      { new: true }
    );
    if (!record) return res.status(404).json({ error: "Record not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: "Failed to update attendance" });
  }
});
router4.get("/all/records", verifyToken, adminOnly, async (req, res) => {
  try {
    const records = await Attendance_default.find().populate("subjectId", "name code").populate("studentId", "name usn").populate("takenBy", "name username").sort({ date: -1 }).lean();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch all attendance" });
  }
});
var attendanceRoutes_default = router4;

// routes/marksRoutes.js
import express5 from "express";

// models/Marks.js
import mongoose6 from "mongoose";
var MarksSchema = new mongoose6.Schema({
  studentId: { type: mongoose6.Schema.Types.ObjectId, ref: "Student", required: true },
  subjectId: { type: mongoose6.Schema.Types.ObjectId, ref: "Subject", required: true },
  internal1: { type: Number, default: null },
  internal2: { type: Number, default: null },
  internal3: { type: Number, default: null },
  finalExam: { type: Number, default: null }
}, { timestamps: true });
MarksSchema.index({ studentId: 1, subjectId: 1 }, { unique: true });
var Marks_default = mongoose6.model("Marks", MarksSchema);

// routes/marksRoutes.js
var router5 = express5.Router();
router5.post("/input", verifyToken, teacherOnly, async (req, res) => {
  try {
    const { studentId, subjectId, internal1, internal2, internal3, finalExam } = req.body;
    if (!studentId || !subjectId) {
      return res.status(400).json({ error: "studentId and subjectId are required" });
    }
    const subject = await Subject_default.findOne({ _id: subjectId, facultyId: req.user.teacherId });
    if (!subject) return res.status(403).json({ error: "You are not assigned to this subject" });
    const marks = await Marks_default.findOneAndUpdate(
      { studentId, subjectId },
      {
        $set: {
          ...internal1 !== void 0 && { internal1: internal1 === "" ? null : Number(internal1) },
          ...internal2 !== void 0 && { internal2: internal2 === "" ? null : Number(internal2) },
          ...internal3 !== void 0 && { internal3: internal3 === "" ? null : Number(internal3) },
          ...finalExam !== void 0 && { finalExam: finalExam === "" ? null : Number(finalExam) }
        }
      },
      { upsert: true, new: true }
    );
    res.json({ message: "Marks saved", marks });
  } catch (err) {
    console.error("marks input error:", err);
    res.status(500).json({ error: "Failed to save marks" });
  }
});
router5.get("/subject/:subjectId", verifyToken, async (req, res) => {
  try {
    const marks = await Marks_default.find({ subjectId: req.params.subjectId }).lean();
    res.json(marks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch marks for subject" });
  }
});
router5.get("/:studentId", verifyToken, async (req, res) => {
  try {
    const marks = await Marks_default.find({ studentId: req.params.studentId }).populate("subjectId", "name code facultyId").lean();
    res.json(marks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch marks" });
  }
});
router5.get("/:studentId/:subjectId", verifyToken, async (req, res) => {
  try {
    const marks = await Marks_default.findOne({
      studentId: req.params.studentId,
      subjectId: req.params.subjectId
    }).lean();
    res.json(marks || { internal1: null, internal2: null, internal3: null, finalExam: null });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch marks" });
  }
});
router5.put("/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { internal1, internal2, internal3, finalExam } = req.body;
    const marks = await Marks_default.findByIdAndUpdate(
      req.params.id,
      { $set: { internal1, internal2, internal3, finalExam } },
      { new: true }
    );
    if (!marks) return res.status(404).json({ error: "Marks record not found" });
    res.json(marks);
  } catch (err) {
    res.status(500).json({ error: "Failed to update marks" });
  }
});
var marksRoutes_default = router5;

// routes/adminRoutes.js
import express6 from "express";
import bcrypt2 from "bcryptjs";
var router6 = express6.Router();
router6.get("/teachers", verifyToken, adminOnly, async (req, res) => {
  try {
    const teachers = await Teacher_default.find().select("-password").lean();
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
});
router6.post("/teachers", verifyToken, adminOnly, async (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: "name, username and password are required" });
    }
    const existing = await Teacher_default.findOne({ username });
    if (existing) return res.status(400).json({ error: "Username already taken" });
    const hashed = await bcrypt2.hash(password, 10);
    const teacher = await Teacher_default.create({ name, username, password: hashed });
    res.json({ message: "Teacher created", teacher: { _id: teacher._id, name: teacher.name, username: teacher.username } });
  } catch (err) {
    console.error("create teacher error:", err);
    res.status(500).json({ error: "Failed to create teacher" });
  }
});
router6.delete("/teachers/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    await Teacher_default.findByIdAndDelete(req.params.id);
    res.json({ message: "Teacher deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete teacher" });
  }
});
router6.post("/subjects", verifyToken, adminOnly, async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) return res.status(400).json({ error: "name and code are required" });
    const subject = await Subject_default.create({ name, code });
    res.json({ message: "Subject created", subject });
  } catch (err) {
    if (err.code === 11e3) return res.status(400).json({ error: "Subject code already exists" });
    res.status(500).json({ error: "Failed to create subject" });
  }
});
router6.delete("/subjects/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    await Subject_default.findByIdAndDelete(req.params.id);
    res.json({ message: "Subject deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete subject" });
  }
});
router6.post("/assign-faculty", verifyToken, adminOnly, async (req, res) => {
  try {
    const { subjectId, teacherId } = req.body;
    if (!subjectId || !teacherId) return res.status(400).json({ error: "subjectId and teacherId are required" });
    const subject = await Subject_default.findByIdAndUpdate(
      subjectId,
      { facultyId: teacherId },
      { new: true }
    ).populate("facultyId", "name username");
    if (!subject) return res.status(404).json({ error: "Subject not found" });
    await Teacher_default.findByIdAndUpdate(teacherId, { $addToSet: { subjectIds: subjectId } });
    res.json({ message: "Faculty assigned", subject });
  } catch (err) {
    res.status(500).json({ error: "Failed to assign faculty" });
  }
});
router6.post("/enroll-student", verifyToken, adminOnly, async (req, res) => {
  try {
    const { subjectId, studentId } = req.body;
    if (!subjectId || !studentId) return res.status(400).json({ error: "subjectId and studentId are required" });
    const subject = await Subject_default.findByIdAndUpdate(
      subjectId,
      { $addToSet: { enrolledStudents: studentId } },
      { new: true }
    ).populate("enrolledStudents", "name usn");
    if (!subject) return res.status(404).json({ error: "Subject not found" });
    res.json({ message: "Student enrolled", subject });
  } catch (err) {
    res.status(500).json({ error: "Failed to enroll student" });
  }
});
router6.post("/unenroll-student", verifyToken, adminOnly, async (req, res) => {
  try {
    const { subjectId, studentId } = req.body;
    await Subject_default.findByIdAndUpdate(subjectId, { $pull: { enrolledStudents: studentId } });
    res.json({ message: "Student unenrolled" });
  } catch (err) {
    res.status(500).json({ error: "Failed to unenroll student" });
  }
});
router6.get("/attendance", verifyToken, adminOnly, async (req, res) => {
  try {
    const records = await Attendance_default.find().populate("subjectId", "name code").populate("studentId", "name usn").populate("takenBy", "name username").sort({ date: -1 }).limit(500).lean();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});
router6.put("/attendance/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { status, disputed } = req.body;
    const record = await Attendance_default.findByIdAndUpdate(
      req.params.id,
      { $set: { ...status && { status }, ...disputed !== void 0 && { disputed } } },
      { new: true }
    ).populate("subjectId", "name code").populate("studentId", "name usn");
    if (!record) return res.status(404).json({ error: "Record not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: "Failed to update attendance" });
  }
});
router6.get("/marks", verifyToken, adminOnly, async (req, res) => {
  try {
    const marks = await Marks_default.find().populate("studentId", "name usn").populate("subjectId", "name code").lean();
    res.json(marks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch marks" });
  }
});
router6.put("/marks/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { internal1, internal2, internal3, finalExam } = req.body;
    const toNum = (v) => v === "" || v === void 0 ? null : Number(v);
    const marks = await Marks_default.findByIdAndUpdate(
      req.params.id,
      { $set: { internal1: toNum(internal1), internal2: toNum(internal2), internal3: toNum(internal3), finalExam: toNum(finalExam) } },
      { new: true }
    ).populate("studentId", "name usn").populate("subjectId", "name code");
    if (!marks) return res.status(404).json({ error: "Marks record not found" });
    res.json(marks);
  } catch (err) {
    res.status(500).json({ error: "Failed to update marks" });
  }
});
var adminRoutes_default = router6;

// server.js
dotenv.config();
var app = express7();
app.use(cors());
app.use(express7.json());
var connectDB = async () => {
  if (mongoose7.connections[0].readyState) return;
  try {
    await mongoose7.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 5e3
    });
    console.log("\u2705 MongoDB connected natively");
  } catch (err) {
    console.error("\u{1F6A8} MongoDB failed:", err.message);
  }
};
app.use(async (req, res, next) => {
  await connectDB();
  if (!mongoose7.connections[0].readyState && req.path !== "/" && req.path !== "/api/health") {
    return res.status(503).json({ error: "Database offline" });
  }
  next();
});
app.use("/api/auth", authRoutes_default);
app.use("/api/students", studentRoutes_default);
app.use("/api/subjects", subjectRoutes_default);
app.use("/api/attendance", attendanceRoutes_default);
app.use("/api/marks", marksRoutes_default);
app.use("/api/admin", adminRoutes_default);
app.get("/", (req, res) => {
  res.json({ status: "Backend running", db: mongoose7.connections[0].readyState ? "connected" : "disconnected" });
});
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", db: mongoose7.connections[0].readyState ? "connected" : "disconnected" });
});
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5e3;
  app.listen(PORT, () => {
    console.log(`\u{1F680} Server running locally on port ${PORT}`);
  });
}
function handler(req, res) {
  return app(req, res);
}
export {
  handler as default
};
