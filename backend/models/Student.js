import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema({
  name: String,
  course: String,
  department: String,
  batchYear: Number,
  phone: String,
  email: String,
  imageUrl: String,
  admissionNumber: { type: String, unique: true },
  usn: { type: String, unique: true },
}, { timestamps: true });

export default mongoose.model("Student", StudentSchema);
