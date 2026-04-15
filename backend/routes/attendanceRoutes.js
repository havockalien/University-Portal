import express from "express";
import Attendance from "../models/Attendance.js";
import Subject from "../models/Subject.js";
import { verifyToken, teacherOnly, studentOnly, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// ── Helper: normalise date to midnight UTC ────────────────────────
function toDateOnly(d) {
  const dt = d ? new Date(d) : new Date();
  dt.setUTCHours(0, 0, 0, 0);
  return dt;
}

// ── POST /api/attendance/take ─────────────────────────────────────
// Body: { subjectId, date (optional, defaults to today), records: [{studentId, status}] }
router.post("/take", verifyToken, teacherOnly, async (req, res) => {
  try {
    const { subjectId, date, records } = req.body;
    if (!subjectId || !records?.length) {
      return res.status(400).json({ error: "subjectId and records are required" });
    }

    // Verify the teacher owns the subject
    const subject = await Subject.findOne({ _id: subjectId, facultyId: req.user.teacherId });
    if (!subject) return res.status(403).json({ error: "You are not assigned to this subject" });

    const attendanceDate = toDateOnly(date);

    // Upsert each record (update or insert)
    const ops = records.map(({ studentId, status }) => ({
      updateOne: {
        filter: { subjectId, studentId, date: attendanceDate },
        update: { $set: { status, takenBy: req.user.teacherId, disputed: false, disputeReason: "" } },
        upsert: true,
      },
    }));

    const result = await Attendance.bulkWrite(ops);
    res.json({ message: "Attendance saved", upserted: result.upsertedCount, modified: result.modifiedCount });
  } catch (err) {
    console.error("take attendance error:", err);
    res.status(500).json({ error: "Failed to save attendance" });
  }
});

// ── GET /api/attendance/subject/:subjectId — Teacher view ─────────
router.get("/subject/:subjectId", verifyToken, teacherOnly, async (req, res) => {
  try {
    const records = await Attendance.find({ subjectId: req.params.subjectId })
      .populate("studentId", "name usn admissionNumber")
      .sort({ date: -1 })
      .lean();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});

// ── GET /api/attendance/:subjectId/:studentId ─────────────────────
router.get("/:subjectId/:studentId", verifyToken, async (req, res) => {
  try {
    const records = await Attendance.find({
      subjectId: req.params.subjectId,
      studentId: req.params.studentId,
    }).sort({ date: 1 }).lean();

    const total   = records.length;
    const present = records.filter((r) => r.status === "present").length;
    const pct     = total > 0 ? Math.round((present / total) * 100) : null;

    res.json({ records, total, present, absent: total - present, percentage: pct });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});

// ── PUT /api/attendance/:id/dispute — Student flags entry ─────────
router.put("/:id/dispute", verifyToken, studentOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const record = await Attendance.findById(req.params.id);
    if (!record) return res.status(404).json({ error: "Attendance record not found" });

    // Ensure the student owns this record
    if (String(record.studentId) !== req.user.studentId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    record.disputed      = true;
    record.disputeReason = reason || "Marked incorrectly";
    await record.save();
    res.json({ message: "Dispute filed", record });
  } catch (err) {
    res.status(500).json({ error: "Failed to file dispute" });
  }
});

// ── PUT /api/attendance/:id — Admin: override entry ───────────────
router.put("/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { status, disputed } = req.body;
    const record = await Attendance.findByIdAndUpdate(
      req.params.id,
      { ...(status && { status }), ...(disputed !== undefined && { disputed }) },
      { new: true }
    );
    if (!record) return res.status(404).json({ error: "Record not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: "Failed to update attendance" });
  }
});

// ── GET /api/attendance/all — Admin: all records ──────────────────
router.get("/all/records", verifyToken, adminOnly, async (req, res) => {
  try {
    const records = await Attendance.find()
      .populate("subjectId", "name code")
      .populate("studentId", "name usn")
      .populate("takenBy", "name username")
      .sort({ date: -1 })
      .lean();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch all attendance" });
  }
});

export default router;
