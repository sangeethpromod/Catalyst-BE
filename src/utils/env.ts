dotenv.config();
import dotenv from "dotenv";
dotenv.config();

/**
 * Get environment variable with optional default.
 */
export function getEnv(key: string, defaultValue?: string): string {
  const val = process.env[key];
  if (val === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required env var: ${key}`);
  }
  return val;
}

export const ENV = {
  MONGODB_URI: getEnv("MONGODB_URI", "mongodb://localhost:27017/ai_stocks"),
  PORT: Number(getEnv("PORT", "4000")),
  POLYGON_API_KEY: getEnv("POLYGON_API_KEY", ""),
  GEMINI_KEY: getEnv("GEMINI_KEY", ""),
  PERPLEXITY_KEY: getEnv("PERPLEXITY_KEY", ""),
};
