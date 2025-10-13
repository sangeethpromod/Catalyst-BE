import type { Request, Response } from "express";
import { runFullAnalysis } from "../services/screenerService.js";

/**
 * POST /api/screener
 * { symbol, timeframe }
 */
export async function postScreener(req: Request, res: Response) {
  const { symbol, timeframe } = req.body as {
    symbol?: string;
    timeframe?: string;
  };
  if (!symbol || !timeframe) {
    return res.status(400).json({ error: "symbol and timeframe are required" });
  }
  const result = await runFullAnalysis(symbol, timeframe);
  res.json({ ok: true, analysis: result });
}
