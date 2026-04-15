import express from "express";
import Subject from "../models/Subject.js";
import Teacher from "../models/Teacher.js";
import { verifyToken, teacherOnly, studentOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// ── GET /api/subjects/my-subjects — Teacher's assigned subjects ───
router.get("/my-subjects", verifyToken, teacherOnly, async (req, res) => {
  try {
    const subjects = await Subject.find({ facultyId: req.user.teacherId })
      .populate("enrolledStudents", "name usn admissionNumber")
      .lean();
    res.json(subjects);
  } catch (err) {
    console.error("my-subjects error:", err);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

// ── GET /api/subjects/enrolled — Student's enrolled subjects ──────
router.get("/enrolled", verifyToken, studentOnly, async (req, res) => {
  try {
    const subjects = await Subject.find({ enrolledStudents: req.user.studentId })
      .populate("facultyId", "name username")
      .lean();
    res.json(subjects);
  } catch (err) {
    console.error("enrolled error:", err);
    res.status(500).json({ error: "Failed to fetch enrolled subjects" });
  }
});

// ── GET /api/subjects/all — Admin: all subjects ───────────────────
router.get("/all", verifyToken, async (req, res) => {
  try {
    const subjects = await Subject.find()
      .populate("facultyId", "name username")
      .populate("enrolledStudents", "name usn")
      .lean();
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

export default router;
