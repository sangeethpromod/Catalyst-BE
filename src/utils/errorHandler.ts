// import type { NextFunction, Request, Response } from "express";
// import { logger } from "./logger";

// /** Centralized Express error middleware */
// export function errorHandler(
//   err: unknown,
//   _req: Request,
//   res: Response,
//   _next: NextFunction,
// ) {
//   logger.error("Unhandled error", err);
//   const status = 500;
//   res.status(status).json({ error: "Internal Server Error" });
// }
