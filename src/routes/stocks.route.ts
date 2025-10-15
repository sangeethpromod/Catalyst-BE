import { Router } from "express";
import {
  getStockAnalyses,
  analyzeStock,
} from "../controllers/stock.controller.js";
import { analyzeMutualFund } from "../controllers/mutualFund.controller.js";

const router = Router();

router.get("/:symbol", getStockAnalyses);
router.post("/analyze", analyzeStock);
// Mutual fund analysis (Buffett-style)
router.post("/mutual-funds/analyze", analyzeMutualFund);

export default router;
