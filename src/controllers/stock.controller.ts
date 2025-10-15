import type { Request, Response } from "express";
import { getAnalysesBySymbol } from "../services/stockService.js";
import {
  getTickerDetails,
  getStockNews,
  getStockData,
} from "../mastra/tools/stockData.js";
import { fundamentalAgent } from "../mastra/agents/fundamentalAgent.js";
import { technicalAgent } from "../mastra/agents/technicalAgent.js";
import { buffettAgent } from "../mastra/agents/buffettAgent.js";
import { cohenAgent } from "../mastra/agents/cohenAgent.js";
import { dalioAgent } from "../mastra/agents/dalioAgent.js";
import { ackmanAgent } from "../mastra/agents/ackmanAgent.js";
import { thielAgent } from "../mastra/agents/thielAgent.js";
import { riskAgent } from "../mastra/agents/riskAgent.js";
import { graphDataAgent } from "../mastra/agents/graphDataAgent.js";
import { truthAgent } from "../mastra/agents/truthAgent.js";

// Simple in-memory cache for analyze results to avoid repeated agent calls
const analyzeCache: Map<string, { response: any; expiresAt: number }> = new Map();

export async function getStockAnalyses(req: Request, res: Response) {
  const { symbol } = req.params;
  const items = await getAnalysesBySymbol(symbol);
  res.json({ symbol, items });
}

export async function analyzeStock(req: Request, res: Response) {
  const { symbol, timeframe = "3M" } = req.body;

  // Optional per-request cache
  const CACHE_TTL_MS = Number(process.env.AI_CACHE_TTL_MS ?? 15 * 60 * 1000); // 15 minutes default
  const cacheKey = `${symbol}:${timeframe}`;
  const cached = analyzeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.response);
  }

  // Helper to extract a JSON substring from possibly noisy agent output
  const extractJson = (text: string) => {
    if (!text) return text;
    // Remove markdown code fences like ```json ... ``` or ``` ... ```
    let cleaned = text.replace(/```\s*json\s*|```/gi, "");
    cleaned = cleaned.trim();

    // If it already starts with JSON, return as-is
    if (cleaned.startsWith("{") || cleaned.startsWith("[")) {
      return cleaned;
    }

    // Try to slice to the first JSON-looking segment
    const firstBrace = cleaned.indexOf("{");
    const firstBracket = cleaned.indexOf("[");
    let start = -1;
    if (firstBrace === -1) start = firstBracket;
    else if (firstBracket === -1) start = firstBrace;
    else start = Math.min(firstBrace, firstBracket);

    if (start >= 0) {
      cleaned = cleaned.slice(start);
      // Cut to the last closing bracket/brace
      const lastBrace = cleaned.lastIndexOf("}");
      const lastBracket = cleaned.lastIndexOf("]");
      let end = -1;
      if (lastBrace === -1) end = lastBracket;
      else if (lastBracket === -1) end = lastBrace;
      else end = Math.max(lastBrace, lastBracket);
      if (end >= 0) {
        cleaned = cleaned.slice(0, end + 1);
      }
    }
    return cleaned.trim();
  };

  // Helper function to safely parse agent responses with fallbacks
  const safeParseAgentResponse = (text: string, fallback: any) => {
    try {
      const parsed = JSON.parse(extractJson(text));
      if (parsed.error) {
        console.warn("Using fallback for agent response");
        return fallback;
      }
      return parsed;
    } catch (error) {
      console.error("Failed to parse agent response:", error);
      return fallback;
    }
  };

  // Throttling and retry utilities to avoid hitting rate limits
  const CALL_DELAY_MS = Number(process.env.AI_CALL_DELAY_MS ?? 600); // small delay between calls
  const MAX_RETRIES = Number(process.env.AI_MAX_RETRIES ?? 2);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const isRateLimitError = (err: any) => {
    const msg = String(err?.message || "").toLowerCase();
    return (
      err?.statusCode === 429 ||
      msg.includes("quota") ||
      msg.includes("rate limit") ||
      msg.includes("resource_exhausted")
    );
  };

  const generateWithThrottle = async (
    label: string,
    agent: any,
    messages: any[],
  ) => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const resp = await agent.generate(messages);
        // small gap before next call regardless of success
        await sleep(CALL_DELAY_MS);
        return resp;
      } catch (err) {
        if (attempt < MAX_RETRIES && isRateLimitError(err)) {
          const backoff = CALL_DELAY_MS * Math.pow(2, attempt); // exponential backoff
          console.warn(
            `[rate-limit] ${label} attempt ${attempt + 1} failed; retrying in ${backoff}ms`,
          );
          await sleep(backoff);
          continue;
        }
        // rethrow other errors or if retries exhausted
        throw err;
      }
    }
    // should never reach here
    throw new Error(`Failed to generate response for ${label}`);
  };

  try {
    // Get ticker info
    const details = await (getTickerDetails as any).execute({
      context: { symbol },
      runtimeContext: {},
    });

    // Get stock data for current price and change
    const stockDataResult = await (getStockData as any).execute({
      context: {
        symbol,
        from: "2025-10-01",
        to: new Date().toISOString().split("T")[0],
      },
      runtimeContext: {},
    });
    const dataPoints = (stockDataResult as any).data || [];
    const currentPrice = dataPoints[dataPoints.length - 1]?.c || 0;
    const previousPrice = dataPoints[dataPoints.length - 2]?.c || currentPrice;
    const changePercent = previousPrice
      ? ((currentPrice - previousPrice) / previousPrice) * 100
      : 0;
    const volume = dataPoints[dataPoints.length - 1]?.v || 0;

    const tickerInfo = {
      currentPrice,
      changePercent: parseFloat(changePercent.toFixed(2)),
      marketCap: (details as any).marketCap
        ? `${((details as any).marketCap / 1e12).toFixed(2)}T`
        : "0",
      peRatio: 0, // Not available
      sector: (details as any).sector || "Unknown",
      exchange: "NASDAQ",
      volume,
      fiftyTwoWeekHigh: 0, // Not calculated
      fiftyTwoWeekLow: 0, // Not calculated
    };

    // Get news
    const newsData = await (getStockNews as any).execute({
      context: { symbol, limit: 2 },
      runtimeContext: {},
    });
    const news = (newsData as any).articles || [];

    // Run fundamental analysis
    const fundamentalResponse = await generateWithThrottle("fundamental", fundamentalAgent, [
      {
        role: "user",
        content: `Analyze ${symbol} for ${timeframe} timeframe. Prefer JSON in this format, otherwise plain text is okay: {"summary": "string", "intrinsicValue": number, "undervaluationPercent": number, "keyMetrics": {"revenueGrowthYoY": number, "netMargin": number, "roe": number, "debtToEquity": number}}`,
      },
    ]);
    const fundamentalRawText = fundamentalResponse.text;
    const fundamentalAnalysisParsed = safeParseAgentResponse(fundamentalRawText, {
      summary: fundamentalRawText,
      intrinsicValue: 0,
      undervaluationPercent: 0,
      keyMetrics: {
        revenueGrowthYoY: 0,
        netMargin: 0,
        roe: 0,
        debtToEquity: 0
      }
    });
    const fundamentalAnalysis = { ...fundamentalAnalysisParsed, rawText: fundamentalRawText };

    // Run technical analysis
    const technicalResponse = await generateWithThrottle("technical", technicalAgent, [
      {
        role: "user",
        content: `Analyze ${symbol} for ${timeframe} timeframe. Prefer JSON in this format, otherwise plain text is okay: {"summary": "string", "indicators": {"rsi": number, "macd": {"signal": number, "histogram": number}, "movingAverages": {"MA50": number, "MA200": number}, "volumeTrend": "string"}}`,
      },
    ]);
    const technicalRawText = technicalResponse.text;
    const technicalAnalysisParsed = safeParseAgentResponse(technicalRawText, {
      summary: technicalRawText,
      indicators: {
        rsi: 50,
        macd: { signal: 0, histogram: 0 },
        movingAverages: { MA50: 0, MA200: 0 },
        volumeTrend: "neutral"
      }
    });
    const technicalAnalysis = { ...technicalAnalysisParsed, rawText: technicalRawText };

    // Run personality insights
    const personalities = ["buffett", "cohen", "dalio", "ackman", "thiel"];
    const agentMap = {
      buffett: buffettAgent,
      cohen: cohenAgent,
      dalio: dalioAgent,
      ackman: ackmanAgent,
      thiel: thielAgent,
    };
    const personalityInsights = [];
    for (const agent of personalities) {
      const response = await generateWithThrottle(
        `personality:${agent}`,
        (agentMap as any)[agent],
        [
        {
          role: "user",
          content: `Give ${agent}'s investment perspective on ${symbol} for ${timeframe} timeframe. Prefer JSON in this format, otherwise plain text is okay: {"agent": "${agent}Agent", "perspective": "string"}`,
        },
        ]
      );
      const pRawText = response.text;
      const pParsed = safeParseAgentResponse(pRawText, {
        agent: `${agent}Agent`,
        perspective: pRawText
      });
      personalityInsights.push({ ...pParsed, rawText: pRawText });
    }

    // Run risk assessment
    const riskResponse = await generateWithThrottle("risk", riskAgent, [
      {
        role: "user",
        content: `Assess risk for ${symbol} for ${timeframe} timeframe. Prefer JSON in this format, otherwise plain text is okay: {"summary": "string", "riskScore": number, "riskFactors": {"valuationRisk": number, "earningsRisk": number, "volatilityRisk": number, "liquidityRisk": number}}`,
      },
    ]);
    const riskRawText = riskResponse.text;
    const riskAssessmentParsed = safeParseAgentResponse(riskRawText, {
      summary: riskRawText,
      riskScore: 5,
      riskFactors: {
        valuationRisk: 5,
        earningsRisk: 5,
        volatilityRisk: 5,
        liquidityRisk: 5
      }
    });
    const riskAssessment = { ...riskAssessmentParsed, rawText: riskRawText };

    // Run graph data
    const graphResponse = await generateWithThrottle("graph", graphDataAgent, [
      {
        role: "user",
        content: `Generate graph data for ${symbol} for ${timeframe} timeframe. Prefer JSON in this format, otherwise plain text is okay: {"priceHistoryChart": {"label": "string", "dataPoints": [{"date": "string", "price": number}]}, "snakeyMomentumChart": {"label": "string", "dataPoints": [{"rsi": number, "momentum": number}]}, "riskDistributionChart": {"label": "string", "dataPoints": [{"category": "string", "score": number}]}}`,
      },
    ]);
    const graphRawText = graphResponse.text;
    const graphDataParsed = safeParseAgentResponse(graphRawText, {
      priceHistoryChart: {
        label: "Price History",
        dataPoints: []
      },
      snakeyMomentumChart: {
        label: "Snakey Momentum",
        dataPoints: []
      },
      riskDistributionChart: {
        label: "Risk Distribution",
        dataPoints: []
      }
    });
    const graphData = { ...graphDataParsed, rawText: graphRawText };

    // Run truth summary
    const truthResponse = await generateWithThrottle("truth", truthAgent, [
      {
        role: "user",
        content: `Given the following analyses for ${symbol} ${timeframe}: fundamental: ${JSON.stringify(
          fundamentalAnalysis
        )}, technical: ${JSON.stringify(technicalAnalysis)}, personalities: ${JSON.stringify(
          personalityInsights
        )}, risk: ${JSON.stringify(riskAssessment)}, provide a truth summary. Prefer JSON in this format, otherwise plain text is okay: {"verifiedWith": ["Gemini", "Perplexity"], "finalVerdict": "string", "confidence": number}`,
      },
    ]);
    const truthRawText = truthResponse.text;
    const truthSummaryParsed = safeParseAgentResponse(truthRawText, {
      verifiedWith: ["Gemini", "Perplexity"],
      finalVerdict: truthRawText,
      confidence: 0
    });
    const truthSummary = { ...truthSummaryParsed, rawText: truthRawText };

    // Format news highlights
    const newsHighlights = news.map((n: any) => ({
      headline: n.title,
      source: n.author || "Unknown",
      url: n.url,
      summary: n.summary,
    }));

    // Combine response
    const response = {
      symbol,
      companyName: (details as any).name || "Unknown",
      timeframe,
      asOf: new Date().toISOString(),
      tickerInfo,
      fundamentalAnalysis,
      technicalAnalysis,
      personalityInsights,
      riskAssessment,
      graphData,
      truthSummary,
      newsHighlights,
    };

  // update cache
  analyzeCache.set(cacheKey, { response, expiresAt: Date.now() + CACHE_TTL_MS });
  res.json(response);
  } catch (error) {
    console.error("Error in analyzeStock:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
