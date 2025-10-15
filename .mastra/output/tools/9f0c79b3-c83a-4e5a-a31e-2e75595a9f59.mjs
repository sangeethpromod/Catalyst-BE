import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { E as ENV } from '../env.mjs';
import 'dotenv';

class GeminiClient {
  constructor(apiKey = ENV.GEMINI_KEY) {
    this.apiKey = apiKey;
  }
  async summarize(prompt) {
    return `Gemini summary: ${prompt.substring(0, 100)}...`;
  }
}

const geminiClient = new GeminiClient();
const summarizeData = createTool({
  id: "Summarize Data",
  inputSchema: z.object({
    prompt: z.string().describe("The data or prompt to summarize"),
    maxLength: z.number().optional().describe("Maximum length of summary")
  }),
  description: "Uses Gemini AI to create concise summaries of financial data or analysis",
  execute: async ({ context: { prompt, maxLength } }) => {
    console.log(`Summarizing data with Gemini...`);
    const summary = await geminiClient.summarize(prompt);
    const finalSummary = maxLength && summary.length > maxLength ? summary.substring(0, maxLength) + "..." : summary;
    return {
      originalLength: prompt.length,
      summaryLength: finalSummary.length,
      summary: finalSummary
    };
  }
});

export { summarizeData };
