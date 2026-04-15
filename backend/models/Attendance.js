import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema({
  subjectId:     { type: mongoose.Schema.Types.ObjectId, ref: "Subject",  required: true },
  studentId:     { type: mongoose.Schema.Types.ObjectId, ref: "Student",  required: true },
  date:          { type: Date, required: true },
  status:        { type: String, enum: ["present", "absent"], required: true },
  takenBy:       { type: mongoose.Schema.Types.ObjectId, ref: "Teacher",  required: true },
  disputed:      { type: Boolean, default: false },
  disputeReason: { type: String, default: "" },
}, { timestamps: true });

// Prevent duplicate entry for the same student+subject+date
AttendanceSchema.index({ subjectId: 1, studentId: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", AttendanceSchema);
