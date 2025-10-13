import express from "express";
// import { errorHandler } from "./utils/errorHandler.js";
import { appConfig } from "./config/appConfig.js";
import screenerRouter from "./routes/screener.route.js";
import stocksRouter from "./routes/stocks.route.js";
import agentsRouter from "./routes/agents.route.js";
import graphRouter from "./routes/graph.route.js";

const app = express();
app.use(express.json());

app.use(`${appConfig.apiPrefix}/screener`, screenerRouter);
app.use(`${appConfig.apiPrefix}/stocks`, stocksRouter);
app.use(`${appConfig.apiPrefix}/agents`, agentsRouter);
app.use(`${appConfig.apiPrefix}/graph`, graphRouter);

// app.use(errorHandler);

export default app;
