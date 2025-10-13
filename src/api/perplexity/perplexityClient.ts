import { ENV } from "../../utils/env.js";

/** Minimal stub client for Perplexity API */
export class PerplexityClient {
  constructor(private apiKey: string = ENV.PERPLEXITY_KEY) {}

  async verifyFacts(
    query: string,
  ): Promise<{ verified: boolean; notes: string }> {
    // TODO: Replace stub with real HTTP call
    return {
      verified: true,
      notes: `Perplexity verified: ${query.substring(0, 100)}...`,
    };
  }
}
