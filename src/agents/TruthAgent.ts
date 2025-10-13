import { BaseAgent } from "./base/BaseAgent.js";
import { GeminiClient } from "../api/gemini/geminiClient.js";
import { PerplexityClient } from "../api/perplexity/perplexityClient.js";

/** Aggregates outputs and produces a truthful summary using Gemini + Perplexity (stub). */
export class TruthAgent extends BaseAgent {
  private gemini = new GeminiClient();
  private perplexity = new PerplexityClient();

  constructor() {
    super("TruthAgent");
  }

  async analyze(input: {
    symbol: string;
    timeframe: string;
    fundamental: any;
    technical: any;
    risk: any;
    personalities: Record<string, any>;
  }): Promise<{ summary: string; confidence: number }> {
    const prompt =
      `Create a concise, truthful summary about ${input.symbol} over ${input.timeframe} using data: ` +
      `fundamental=${JSON.stringify(input.fundamental)}, ` +
      `technical=${JSON.stringify(input.technical)}, ` +
      `risk=${JSON.stringify(input.risk)}, ` +
      `personalities=${Object.keys(input.personalities).join(", ")}`;

    const base = await this.gemini.summarize(prompt);
    const verify = await this.perplexity.verifyFacts(base);
    const confidence = verify.verified ? 0.7 : 0.5;
    return { summary: `${base}\nVerification: ${verify.notes}`, confidence };
  }
}
