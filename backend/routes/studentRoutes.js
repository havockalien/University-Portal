import express from "express";
import Student from "../models/Student.js";
import multer from "multer";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import { verifyToken, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();
const upload = multer({ dest: "temp/" });

// ── Department → School code mapping ─────────────────────────────
const DEPT_CODE_MAP = {
  "School of Computer Science": "CSE",
  "School of Business": "BUS",
  "School of Law": "LAW",
  "School of Political Sciences": "POL",
  "School of Design": "DES",
};

// Function removed as batchYear is now provided by admin

// ── Generate Admission Number ────────────────────────────────────
async function generateAdmissionNumber(batchYear) {
  const prefix = `RVUN${batchYear}`;
  const count = await Student.countDocuments({
    admissionNumber: { $regex: `^${prefix}` },
  });
  const serial = String(count + 1).padStart(3, "0");
  return `${prefix}${serial}`;
}

// ── Generate USN ─────────────────────────────────────────────────
async function generateUSN(department, batchYear) {
  const schoolCode = DEPT_CODE_MAP[department] || "GEN";
  const prefix = `RVU${batchYear}${schoolCode}`;
  const count = await Student.countDocuments({
    usn: { $regex: `^${prefix}` },
  });
  const serial = String(count + 1).padStart(3, "0");
  return `${prefix}${serial}`;
}

// ── GET /all (public — needed for student login lookup) ──────────
router.get("/all", async (req, res) => {
  const students = await Student.find().sort({ createdAt: -1 });
  res.json(students);
});

// ── GET /:id (get single student) ────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch student" });
  }
});

// ── POST /add (Admin only) ───────────────────────────────────────
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
          Authorization: `Bearer ${process.env.PINATA_JWT}`,
        },
      }
    );

    const imageUrl = `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;

    const batchYear = req.body.batchYear || new Date().getFullYear();
    const admissionNumber = await generateAdmissionNumber(batchYear);
    const usn = await generateUSN(req.body.department, batchYear);

    const student = await Student.create({
      name: req.body.name,
      course: req.body.course,
      department: req.body.department,
      batchYear,
      phone: req.body.phone,
      email: req.body.email,
      imageUrl,
      admissionNumber,
      usn,
    });

    fs.unlinkSync(req.file.path);
    res.json(student);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add student" });
  }
});

// ── PUT /:id (Admin only — edit student details) ─────────────────
router.put("/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { name, course, department, phone, email } = req.body;
    const student = await Student.findByIdAndUpdate(
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

// ── DELETE /:id (Admin only) ─────────────────────────────────────
router.delete("/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json({ message: "Student deleted successfully", student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete student" });
  }
});

export default router;
