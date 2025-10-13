import { StockAnalysisModel } from "../models/StockAnalysis.js";

export async function saveAnalysis(data: {
  symbol: string;
  timeframe: string;
  fundamental: any;
  technical: any;
  risk: any;
  personalities: Record<string, any>;
  truthSummary: string;
  graphData: any;
}) {
  const doc = await StockAnalysisModel.create(data);
  return doc;
}

export async function getAnalysesBySymbol(symbol: string) {
  return StockAnalysisModel.find({ symbol })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
}
