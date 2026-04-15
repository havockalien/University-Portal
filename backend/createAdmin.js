// ── Admin Account Creation Script ────────────────────────────────
// Usage:  node createAdmin.js <username> <password>
// Example: node createAdmin.js admin mySecretPassword

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Admin from "./models/Admin.js";

dotenv.config();

const [,, username, password] = process.argv;

if (!username || !password) {
  console.log("❌ Usage: node createAdmin.js <username> <password>");
  console.log("   Example: node createAdmin.js admin mySecretPassword");
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URL, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log("✅ Connected to MongoDB");

  const existing = await Admin.findOne({ username });
  if (existing) {
    console.log(`⚠️  Admin "${username}" already exists.`);
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    await Admin.create({ username, password: hashedPassword });
    console.log(`✅ Admin account "${username}" created successfully!`);
  }
} catch (err) {
  console.error("❌ Error:", err.message);
} finally {
  await mongoose.disconnect();
  process.exit(0);
}
