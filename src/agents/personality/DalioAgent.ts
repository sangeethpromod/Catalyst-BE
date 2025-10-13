import { BaseAgent } from "../base/BaseAgent.js";

export class DalioAgent extends BaseAgent {
  constructor() {
    super("DalioAgent");
  }
  async analyze(input: { symbol: string; timeframe: string }): Promise<any> {
    return {
      thesis: `Balance macro cycles and diversification impact on ${input.symbol}.`,
      confidence: 0.55,
    };
  }
}
