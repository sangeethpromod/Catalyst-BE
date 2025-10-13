import { BaseAgent } from "../base/BaseAgent.js";

export class AckmanAgent extends BaseAgent {
  constructor() {
    super("AckmanAgent");
  }
  async analyze(input: { symbol: string; timeframe: string }): Promise<any> {
    return {
      thesis: `Concentrated bets with activist mindset for ${input.symbol}.`,
      confidence: 0.55,
    };
  }
}
