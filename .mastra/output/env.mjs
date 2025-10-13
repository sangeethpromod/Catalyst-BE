import dotenv from 'dotenv';

dotenv.config();
dotenv.config();
function getEnv(key, defaultValue) {
  const val = process.env[key];
  if (val === void 0) {
    if (defaultValue !== void 0) return defaultValue;
    throw new Error(`Missing required env var: ${key}`);
  }
  return val;
}
const ENV = {
  MONGODB_URI: getEnv("MONGODB_URI", "mongodb://localhost:27017/ai_stocks"),
  PORT: Number(getEnv("PORT", "4000")),
  POLYGON_API_KEY: getEnv("POLYGON_API_KEY", ""),
  GEMINI_KEY: getEnv("GEMINI_KEY", ""),
  PERPLEXITY_KEY: getEnv("PERPLEXITY_KEY", ""),
  GOOGLE_GENERATIVE_AI_API_KEY: getEnv("GOOGLE_GENERATIVE_AI_API_KEY", "")
};

export { ENV as E };
