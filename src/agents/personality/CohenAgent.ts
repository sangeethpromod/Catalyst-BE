import { BaseAgent } from "../base/BaseAgent.js";

export class CohenAgent extends BaseAgent {
  constructor() {
    super("CohenAgent");
  }
  async analyze(input: { symbol: string; timeframe: string }): Promise<any> {
    return {
      thesis: `Trading-oriented perspective; exploit short-term dislocations in ${input.symbol}.`,
      confidence: 0.55,
    };
  }
}
