import mongoose from "mongoose";

const SubjectSchema = new mongoose.Schema({
  name:             { type: String, required: true },
  code:             { type: String, required: true, unique: true },
  facultyId:        { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", default: null },
  enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
}, { timestamps: true });

export default mongoose.model("Subject", SubjectSchema);
