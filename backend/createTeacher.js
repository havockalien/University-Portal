// ── Teacher Account Creation Script ───────────────────────────────
// Usage:  node createTeacher.js <name> <username> <password>
// Example: node createTeacher.js "John Doe" jdoe myPassword123

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Teacher from "./models/Teacher.js";

dotenv.config();

const [,, name, username, password] = process.argv;

if (!name || !username || !password) {
  console.log("❌ Usage: node createTeacher.js <name> <username> <password>");
  console.log('   Example: node createTeacher.js "John Doe" jdoe myPassword123');
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URL, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log("✅ Connected to MongoDB");

  const existing = await Teacher.findOne({ username });
  if (existing) {
    console.log(`⚠️  Teacher "${username}" already exists.`);
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    await Teacher.create({ name, username, password: hashedPassword });
    console.log(`✅ Teacher account "${username}" (${name}) created successfully!`);
  }
} catch (err) {
  console.error("❌ Error:", err.message);
} finally {
  await mongoose.disconnect();
  process.exit(0);
}
