import { FakeQueue } from "./jobQueue.js";
import { runFullAnalysis } from "../services/screenerService.js";

export interface ScreenerJobData {
  symbol: string;
  timeframe: string;
}

export const screenerQueue = new FakeQueue<ScreenerJobData>("screener");

screenerQueue.process(async (data) => {
  await runFullAnalysis(data.symbol, data.timeframe);
});
