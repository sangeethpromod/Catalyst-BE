import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { PerplexityClient } from "../../api/perplexity/perplexityClient.js";

const perplexityClient = new PerplexityClient();

export const verifyFacts = createTool({
  id: "Verify Facts",
  inputSchema: z.object({
    query: z.string().describe("The information or claim to verify"),
  }),
  description:
    "Uses Perplexity AI to fact-check and verify financial information",
  execute: async ({ context: { query } }) => {
    console.log(
      `Verifying facts with Perplexity: ${query.substring(0, 50)}...`,
    );
    const result = await perplexityClient.verifyFacts(query);
    return {
      originalQuery: query,
      verified: result.verified,
      notes: result.notes,
      confidence: result.verified ? 0.8 : 0.4,
    };
  },
});
