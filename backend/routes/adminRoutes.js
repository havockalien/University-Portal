import express from "express";
import bcrypt from "bcryptjs";
import Teacher from "../models/Teacher.js";
import Subject from "../models/Subject.js";
import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";
import Marks from "../models/Marks.js";
import { verifyToken, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// ── Teachers ─────────────────────────────────────────────────────

// GET all teachers
router.get("/teachers", verifyToken, adminOnly, async (req, res) => {
  try {
    const teachers = await Teacher.find().select("-password").lean();
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
});

// POST create teacher
router.post("/teachers", verifyToken, adminOnly, async (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: "name, username and password are required" });
    }
    const existing = await Teacher.findOne({ username });
    if (existing) return res.status(400).json({ error: "Username already taken" });

    const hashed = await bcrypt.hash(password, 10);
    const teacher = await Teacher.create({ name, username, password: hashed });
    res.json({ message: "Teacher created", teacher: { _id: teacher._id, name: teacher.name, username: teacher.username } });
  } catch (err) {
    console.error("create teacher error:", err);
    res.status(500).json({ error: "Failed to create teacher" });
  }
});

// DELETE teacher
router.delete("/teachers/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    await Teacher.findByIdAndDelete(req.params.id);
    res.json({ message: "Teacher deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete teacher" });
  }
});

// ── Subjects ─────────────────────────────────────────────────────

// POST create subject
router.post("/subjects", verifyToken, adminOnly, async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) return res.status(400).json({ error: "name and code are required" });

    const subject = await Subject.create({ name, code });
    res.json({ message: "Subject created", subject });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: "Subject code already exists" });
    res.status(500).json({ error: "Failed to create subject" });
  }
});

// DELETE subject
router.delete("/subjects/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    await Subject.findByIdAndDelete(req.params.id);
    res.json({ message: "Subject deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete subject" });
  }
});

// POST assign faculty to subject
router.post("/assign-faculty", verifyToken, adminOnly, async (req, res) => {
  try {
    const { subjectId, teacherId } = req.body;
    if (!subjectId || !teacherId) return res.status(400).json({ error: "subjectId and teacherId are required" });

    const subject = await Subject.findByIdAndUpdate(
      subjectId,
      { facultyId: teacherId },
      { new: true }
    ).populate("facultyId", "name username");

    if (!subject) return res.status(404).json({ error: "Subject not found" });

    // Also update Teacher.subjectIds
    await Teacher.findByIdAndUpdate(teacherId, { $addToSet: { subjectIds: subjectId } });

    res.json({ message: "Faculty assigned", subject });
  } catch (err) {
    res.status(500).json({ error: "Failed to assign faculty" });
  }
});

// POST enroll student in subject
router.post("/enroll-student", verifyToken, adminOnly, async (req, res) => {
  try {
    const { subjectId, studentId } = req.body;
    if (!subjectId || !studentId) return res.status(400).json({ error: "subjectId and studentId are required" });

    const subject = await Subject.findByIdAndUpdate(
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

// POST unenroll student from subject
router.post("/unenroll-student", verifyToken, adminOnly, async (req, res) => {
  try {
    const { subjectId, studentId } = req.body;
    await Subject.findByIdAndUpdate(subjectId, { $pull: { enrolledStudents: studentId } });
    res.json({ message: "Student unenrolled" });
  } catch (err) {
    res.status(500).json({ error: "Failed to unenroll student" });
  }
});

// ── Attendance (Admin view/override) ─────────────────────────────

// GET all attendance
router.get("/attendance", verifyToken, adminOnly, async (req, res) => {
  try {
    const records = await Attendance.find()
      .populate("subjectId", "name code")
      .populate("studentId", "name usn")
      .populate("takenBy", "name username")
      .sort({ date: -1 })
      .limit(500)
      .lean();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});

// PUT override attendance record
router.put("/attendance/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { status, disputed } = req.body;
    const record = await Attendance.findByIdAndUpdate(
      req.params.id,
      { $set: { ...(status && { status }), ...(disputed !== undefined && { disputed }) } },
      { new: true }
    ).populate("subjectId", "name code").populate("studentId", "name usn");
    if (!record) return res.status(404).json({ error: "Record not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: "Failed to update attendance" });
  }
});

// ── Marks (Admin view/override) ────────────────────────────────

// GET all marks
router.get("/marks", verifyToken, adminOnly, async (req, res) => {
  try {
    const marks = await Marks.find()
      .populate("studentId", "name usn")
      .populate("subjectId", "name code")
      .lean();
    res.json(marks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch marks" });
  }
});

// PUT override marks
router.put("/marks/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { internal1, internal2, internal3, finalExam } = req.body;
    const toNum = (v) => (v === "" || v === undefined ? null : Number(v));
    const marks = await Marks.findByIdAndUpdate(
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

export default router;
