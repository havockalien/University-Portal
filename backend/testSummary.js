import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Marks from './models/Marks.js';

dotenv.config();

async function checkMarks() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("Connected to MongoDB.");

  const allMarks = await Marks.find().lean();
  console.log("All Marks records:", allMarks);
  
  process.exit(0);
}

checkMarks();
