import { BaseAgent } from "../base/BaseAgent.js";

export class BuffettAgent extends BaseAgent {
  constructor() {
    super("BuffettAgent");
  }
  async analyze(input: { symbol: string; timeframe: string }): Promise<any> {
    return {
      thesis: `Focus on durable competitive advantages and reasonable valuation for ${input.symbol}.`,
      confidence: 0.6,
    };
  }
}
