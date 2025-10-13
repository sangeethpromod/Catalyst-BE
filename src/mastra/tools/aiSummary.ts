import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { GeminiClient } from "../../api/gemini/geminiClient.js";

const geminiClient = new GeminiClient();

export const summarizeData = createTool({
  id: "Summarize Data",
  inputSchema: z.object({
    prompt: z.string().describe("The data or prompt to summarize"),
    maxLength: z.number().optional().describe("Maximum length of summary"),
  }),
  description:
    "Uses Gemini AI to create concise summaries of financial data or analysis",
  execute: async ({ context: { prompt, maxLength } }) => {
    console.log(`Summarizing data with Gemini...`);
    const summary = await geminiClient.summarize(prompt);

    // If maxLength specified, truncate
    const finalSummary =
      maxLength && summary.length > maxLength
        ? summary.substring(0, maxLength) + "..."
        : summary;

    return {
      originalLength: prompt.length,
      summaryLength: finalSummary.length,
      summary: finalSummary,
    };
  },
});
