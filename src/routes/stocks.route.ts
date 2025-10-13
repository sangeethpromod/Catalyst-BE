import { Router } from "express";
import { getStockAnalyses } from "../controllers/stock.controller.js";

const router = Router();

router.get("/:symbol", getStockAnalyses);

export default router;
