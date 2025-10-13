import { Router } from "express";
import { postScreener } from "../controllers/screener.controller.js";
import { screenerQueue } from "../jobs/screenerJob.js";

const router = Router();

// Immediate processing via service
router.post("/", postScreener);

// Optional: enqueue job (same endpoint if you want queue mode)
router.post("/queue", async (req, res) => {
  const { symbol, timeframe } = req.body as {
    symbol?: string;
    timeframe?: string;
  };
  if (!symbol || !timeframe)
    return res.status(400).json({ error: "symbol and timeframe required" });
  await screenerQueue.add("run", { symbol, timeframe });
  res.json({ ok: true });
});

export default router;
