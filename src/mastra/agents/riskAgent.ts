import { google } from "@ai-sdk/google";
import { Agent } from "@mastra/core/agent";

export const riskAgent = new Agent({
  name: "Risk Assessment Agent",
  instructions: `
You are a risk assessment specialist for stock investments.

Your role is to evaluate the risk factors of a stock for a given timeframe.

Return only JSON in this exact format: {"summary": "string", "riskScore": number, "riskFactors": {"valuationRisk": number, "earningsRisk": number, "volatilityRisk": number, "liquidityRisk": number}}
`,
  model: google("gemini-2.0-flash-exp"),
});
