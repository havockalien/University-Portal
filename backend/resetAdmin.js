// ── Reset Admin Password Script ───────────────────────────────────
// Usage:  node resetAdmin.js <username> <newPassword>
// Example: node resetAdmin.js admin newPassword123

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Admin from "./models/Admin.js";

dotenv.config();

const [,, username, password] = process.argv;

if (!username || !password) {
  console.log("❌ Usage: node resetAdmin.js <username> <newPassword>");
  console.log("   Example: node resetAdmin.js admin newPassword123");
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 10000 });
  console.log("✅ Connected to MongoDB");

  const hashed = await bcrypt.hash(password, 10);

  const result = await Admin.findOneAndUpdate(
    { username },
    { password: hashed },
    { new: true, upsert: true }  // creates if doesn't exist
  );

  console.log(`✅ Admin "${username}" password has been reset successfully!`);
} catch (err) {
  console.error("❌ Error:", err.message);
} finally {
  await mongoose.disconnect();
  process.exit(0);
}
