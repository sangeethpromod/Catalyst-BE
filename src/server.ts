import app from "./app.js";
import { ENV } from "./utils/env.js";
import { connectDB } from "./config/db.js";
import { logger } from "./utils/logger.js";

async function start() {
  try {
    await connectDB();
    app.listen(ENV.PORT, () =>
      logger.info(`Server listening on port ${ENV.PORT}`),
    );
  } catch (err) {
    logger.error("Failed to start server", err);
    process.exit(1);
  }
}

start();
