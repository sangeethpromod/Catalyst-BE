import { BaseAgent } from "../base/BaseAgent.js";

/** Computes simple technical metrics like RSI, moving averages (stub). */
export class TechnicalAgent extends BaseAgent {
  constructor() {
    super("TechnicalAgent");
  }
  async analyze(input: { symbol: string; timeframe: string }): Promise<any> {
    return {
      rsi: 55,
      ma50: 180,
      ma200: 160,
      momentum: "neutral",
      notes: `Stub technical analysis for ${input.symbol}`,
      confidence: 0.55,
    };
  }
}
