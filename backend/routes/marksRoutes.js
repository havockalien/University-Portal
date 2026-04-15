import express from "express";
import Marks from "../models/Marks.js";
import Subject from "../models/Subject.js";
import { verifyToken, teacherOnly, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// ── POST /api/marks/input — Teacher: upsert marks ─────────────────
router.post("/input", verifyToken, teacherOnly, async (req, res) => {
  try {
    const { studentId, subjectId, internal1, internal2, internal3, finalExam } = req.body;
    if (!studentId || !subjectId) {
      return res.status(400).json({ error: "studentId and subjectId are required" });
    }

    // Verify teacher owns the subject
    const subject = await Subject.findOne({ _id: subjectId, facultyId: req.user.teacherId });
    if (!subject) return res.status(403).json({ error: "You are not assigned to this subject" });

    const marks = await Marks.findOneAndUpdate(
      { studentId, subjectId },
      {
        $set: {
          ...(internal1 !== undefined && { internal1: internal1 === "" ? null : Number(internal1) }),
          ...(internal2 !== undefined && { internal2: internal2 === "" ? null : Number(internal2) }),
          ...(internal3 !== undefined && { internal3: internal3 === "" ? null : Number(internal3) }),
          ...(finalExam !== undefined && { finalExam: finalExam === "" ? null : Number(finalExam) }),
        },
      },
      { upsert: true, new: true }
    );

    res.json({ message: "Marks saved", marks });
  } catch (err) {
    console.error("marks input error:", err);
    res.status(500).json({ error: "Failed to save marks" });
  }
});

// ── GET /api/marks/subject/:subjectId — All marks for a subject ───
router.get("/subject/:subjectId", verifyToken, async (req, res) => {
  try {
    const marks = await Marks.find({ subjectId: req.params.subjectId }).lean();
    res.json(marks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch marks for subject" });
  }
});

// ── GET /api/marks/:studentId — All subjects marks for a student ──
router.get("/:studentId", verifyToken, async (req, res) => {
  try {
    const marks = await Marks.find({ studentId: req.params.studentId })
      .populate("subjectId", "name code facultyId")
      .lean();
    res.json(marks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch marks" });
  }
});

// ── GET /api/marks/:studentId/:subjectId ──────────────────────────
router.get("/:studentId/:subjectId", verifyToken, async (req, res) => {
  try {
    const marks = await Marks.findOne({
      studentId: req.params.studentId,
      subjectId: req.params.subjectId,
    }).lean();
    res.json(marks || { internal1: null, internal2: null, internal3: null, finalExam: null });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch marks" });
  }
});


// ── PUT /api/marks/:id — Admin: override marks ────────────────────
router.put("/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { internal1, internal2, internal3, finalExam } = req.body;
    const marks = await Marks.findByIdAndUpdate(
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

export default router;
