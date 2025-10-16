import express from "express";
import cors from "cors";
// import { errorHandler } from "./utils/errorHandler.js";
import { appConfig } from "./config/appConfig.js";
import stocksRouter from "./routes/stocks.route.js";
import { analyzeMutualFund } from "./controllers/mutualFund.controller.js";

const app = express();
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use(express.json());

app.use(`${appConfig.apiPrefix}/stocks`, stocksRouter);

// Alias route so clients can call /api/mutual-funds/analyze directly
app.post(`${appConfig.apiPrefix}/mutual-funds/analyze`, analyzeMutualFund);

// app.use(errorHandler);

export default app;
