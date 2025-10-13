import { runAgents } from "./agentService.js";
import { saveAnalysis } from "./stockService.js";

export async function runFullAnalysis(symbol: string, timeframe: string) {
  const outputs = await runAgents(symbol, timeframe);
  const saved = await saveAnalysis({ symbol, timeframe, ...outputs });
  return saved;
}
