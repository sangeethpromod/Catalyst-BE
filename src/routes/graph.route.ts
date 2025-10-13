import { Router } from "express";
import { GraphDataAgent } from "../agents/GraphDataAgent.js";

const router = Router();

router.get("/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const { timeframe = "3M" } = req.query as any;
  const output = await new GraphDataAgent().analyze({ symbol, timeframe });
  res.json({ symbol, ...output });
});

export default router;
