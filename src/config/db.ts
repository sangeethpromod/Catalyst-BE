import mongoose from "mongoose";
import { ENV } from "../utils/env.js";
import { logger } from "../utils/logger.js";

export async function connectDB() {
  const uri = ENV.MONGODB_URI;
  await mongoose.connect(uri);
  logger.info("MongoDB connected");
}
