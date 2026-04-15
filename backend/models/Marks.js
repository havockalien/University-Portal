import mongoose from "mongoose";

const MarksSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  internal1: { type: Number, default: null },
  internal2: { type: Number, default: null },
  internal3: { type: Number, default: null },
  finalExam: { type: Number, default: null },
}, { timestamps: true });

// Unique marks record per student per subject
MarksSchema.index({ studentId: 1, subjectId: 1 }, { unique: true });

export default mongoose.model("Marks", MarksSchema);
