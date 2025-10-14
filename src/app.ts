import express from "express";
// import { errorHandler } from "./utils/errorHandler.js";
import { appConfig } from "./config/appConfig.js";
import stocksRouter from "./routes/stocks.route.js";

const app = express();
app.use(express.json());

app.use(`${appConfig.apiPrefix}/stocks`, stocksRouter);

// app.use(errorHandler);

export default app;
