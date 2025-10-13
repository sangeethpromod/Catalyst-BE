import type { Request, Response } from "express";
import { getAnalysesBySymbol } from "../services/stockService.js";

export async function getStockAnalyses(req: Request, res: Response) {
  const { symbol } = req.params;
  const items = await getAnalysesBySymbol(symbol);
  res.json({ symbol, items });
}
