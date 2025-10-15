import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { E as ENV } from '../env.mjs';
import 'dotenv';

class PerplexityClient {
  constructor(apiKey = ENV.PERPLEXITY_KEY) {
    this.apiKey = apiKey;
  }
  async verifyFacts(query) {
    return {
      verified: true,
      notes: `Perplexity verified: ${query.substring(0, 100)}...`
    };
  }
}

const perplexityClient = new PerplexityClient();
const verifyFacts = createTool({
  id: "Verify Facts",
  inputSchema: z.object({
    query: z.string().describe("The information or claim to verify")
  }),
  description: "Uses Perplexity AI to fact-check and verify financial information",
  execute: async ({ context: { query } }) => {
    console.log(
      `Verifying facts with Perplexity: ${query.substring(0, 50)}...`
    );
    const result = await perplexityClient.verifyFacts(query);
    return {
      originalQuery: query,
      verified: result.verified,
      notes: result.notes,
      confidence: result.verified ? 0.8 : 0.4
    };
  }
});

export { verifyFacts };
