import mongoose from "mongoose";

const TeacherSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  username:   { type: String, required: true, unique: true },
  password:   { type: String, required: true },
  subjectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }],
}, { timestamps: true });

export default mongoose.model("Teacher", TeacherSchema);
