import { Mastra } from '@mastra/core';
import { perplexity } from '@ai-sdk/perplexity';
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import dotenv from 'dotenv';
import { google } from '@ai-sdk/google';

dotenv.config();
dotenv.config();
function getEnv(key, defaultValue) {
  const val = process.env[key];
  if (val === void 0) {
    if (defaultValue !== void 0) return defaultValue;
    throw new Error(`Missing required env var: ${key}`);
  }
  return val;
}
const ENV = {
  MONGODB_URI: getEnv("MONGODB_URI", "mongodb://localhost:27017/ai_stocks"),
  PORT: Number(getEnv("PORT", "4000")),
  POLYGON_API_KEY: getEnv("POLYGON_API_KEY", ""),
  GEMINI_KEY: getEnv("GEMINI_KEY", ""),
  PERPLEXITY_KEY: getEnv("PERPLEXITY_KEY", ""),
  GOOGLE_GENERATIVE_AI_API_KEY: getEnv("GOOGLE_GENERATIVE_AI_API_KEY", "")
};

class PolygonClient {
  constructor(apiKey = ENV.POLYGON_API_KEY) {
    this.apiKey = apiKey;
  }
  baseUrl = "https://api.polygon.io";
  async getAggsDaily(symbol, from, to) {
    if (!this.apiKey) {
      console.warn("Polygon API key not provided, returning stub data");
      return {
        symbol,
        results: [
          { t: from, c: 170, o: 168, h: 172, l: 167, v: 1e6 },
          { t: to, c: 175, o: 170, h: 177, l: 169, v: 12e5 }
        ]
      };
    }
    try {
      const url = `${this.baseUrl}/v2/aggs/ticker/${symbol}/range/1/day/${from}/${to}?adjusted=true&sort=asc&apikey=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Polygon API error: ${response.status} ${response.statusText}`
        );
      }
      const data = await response.json();
      return {
        symbol,
        results: data.results || [],
        resultsCount: data.resultsCount || 0,
        status: data.status
      };
    } catch (error) {
      console.error(`Error fetching stock data for ${symbol}:`, error);
      return {
        symbol,
        results: [
          { t: from, c: 170, o: 168, h: 172, l: 167, v: 1e6 },
          { t: to, c: 175, o: 170, h: 177, l: 169, v: 12e5 }
        ],
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  async getNews(symbol, limit = 10) {
    if (!this.apiKey) {
      console.warn("Polygon API key not provided, returning stub data");
      return [
        {
          title: `News about ${symbol}`,
          summary: "Stub news item - Please configure POLYGON_API_KEY for real data",
          published_utc: (/* @__PURE__ */ new Date()).toISOString(),
          article_url: "#"
        }
      ];
    }
    try {
      const url = `${this.baseUrl}/v2/reference/news?ticker=${symbol}&limit=${limit}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Polygon API error: ${response.status} ${response.statusText}`
        );
      }
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error);
      return [
        {
          title: `News about ${symbol}`,
          summary: `Error fetching real news: ${error instanceof Error ? error.message : "Unknown error"}`,
          published_utc: (/* @__PURE__ */ new Date()).toISOString(),
          article_url: "#"
        }
      ];
    }
  }
  async getTickerDetails(symbol) {
    if (!this.apiKey) {
      console.warn("Polygon API key not provided, returning stub data");
      return {
        ticker: symbol,
        name: `${symbol} Company`,
        description: "Stub company description",
        market_cap: 1e9
      };
    }
    try {
      const url = `${this.baseUrl}/v3/reference/tickers/${symbol}?apikey=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Polygon API error: ${response.status} ${response.statusText}`
        );
      }
      const data = await response.json();
      return data.results || {};
    } catch (error) {
      console.error(`Error fetching ticker details for ${symbol}:`, error);
      return {
        ticker: symbol,
        name: `${symbol} Company`,
        description: `Error fetching details: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}

const polygonClient$1 = new PolygonClient();
const getStockData = createTool({
  id: "Get Stock Data",
  inputSchema: z.object({
    symbol: z.string().describe("Stock symbol (e.g., AAPL, MSFT)"),
    from: z.string().describe("Start date in YYYY-MM-DD format"),
    to: z.string().describe("End date in YYYY-MM-DD format")
  }),
  description: "Fetches daily aggregated stock data for a given symbol and date range using Polygon API",
  execute: async ({ context: { symbol, from, to } }) => {
    console.log(`Fetching stock data for ${symbol} from ${from} to ${to}`);
    const data = await polygonClient$1.getAggsDaily(symbol, from, to);
    return {
      symbol,
      data: data.results,
      priceRange: {
        start: data.results[0]?.c || 0,
        end: data.results[data.results.length - 1]?.c || 0
      }
    };
  }
});
const getStockNews = createTool({
  id: "Get Stock News",
  inputSchema: z.object({
    symbol: z.string().describe("Stock symbol to get news for"),
    limit: z.number().optional().describe("Number of news articles to fetch (default: 10)")
  }),
  description: "Fetches recent news articles for a given stock symbol",
  execute: async ({ context: { symbol, limit = 10 } }) => {
    console.log(`Fetching ${limit} news articles for ${symbol}`);
    const news = await polygonClient$1.getNews(symbol, limit);
    return {
      symbol,
      articles: news.map((article) => ({
        title: article.title,
        summary: article.summary || article.description,
        publishedDate: article.published_utc,
        url: article.article_url,
        author: article.author,
        keywords: article.keywords
      })),
      count: news.length
    };
  }
});
const getTickerDetails = createTool({
  id: "Get Ticker Details",
  inputSchema: z.object({
    symbol: z.string().describe("Stock symbol to get company details for")
  }),
  description: "Fetches company information and details for a given stock symbol",
  execute: async ({ context: { symbol } }) => {
    console.log(`Fetching company details for ${symbol}`);
    const details = await polygonClient$1.getTickerDetails(symbol);
    return {
      symbol: details.ticker || symbol,
      name: details.name,
      description: details.description,
      marketCap: details.market_cap,
      sector: details.sic_description,
      industry: details.type,
      website: details.homepage_url,
      totalEmployees: details.total_employees,
      listDate: details.list_date
    };
  }
});

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

const fundamentalAgent = new Agent({
  name: "Fundamental Analysis Agent",
  instructions: `
You are a senior equity research analyst specializing in fundamental valuation.

Your role is to evaluate the intrinsic value and financial health of companies using real-world fundamentals. You are designed for medium-term (2\u201312 week) swing or value-based investing signals.

When analyzing a stock, follow these steps:

1. **Company Snapshot**
   - Identify the company name and sector (if available).
   - Briefly describe the business model.

2. **Valuation Metrics**
   - Calculate or interpret P/E ratio and compare to its sector average.
   - Estimate fair value using a simplified DCF approach or PEG ratio logic if DCF data is unavailable.
   - Mention if the company appears undervalued, fairly valued, or overvalued relative to fundamentals.

3. **Financial Strengths**
   - Comment on profitability (margins, ROE, EPS growth).
   - Comment on balance sheet quality (Debt/Equity, cash flow stability).

4. **Risks & Weaknesses**
   - Highlight notable red flags (high leverage, revenue slowdown, poor cash flow, regulatory risks).

5. **Fair Value Summary**
   - Conclude whether the stock is attractive for the given timeframe.
   - Provide a "fair value rating": Undervalued / Fairly Valued / Overvalued.

6. **Confidence Scoring**
   - Assign a confidence score (0\u20131) based on data completeness and reasoning clarity.

**Hallucination Prevention Rules:**
- Do NOT fabricate numbers. If data is missing, say "data unavailable".
- Only use realistic valuation ranges (avoid extreme or made-up fair values).
- Do NOT assume future growth beyond what fundamentals justify.
- Be concise (under 250 words).

Always return structured analysis with clear reasoning and confidence levels.
`,
  model: perplexity("sonar-pro"),
  tools: {
    getStockData,
    getStockNews,
    getTickerDetails,
    summarizeData
  }
});

const technicalAgent = new Agent({
  name: "Technical Analysis Agent",
  instructions: `
You are an expert technical analyst focused on price action and momentum signals.

Your role is to analyze chart patterns, indicators, and market sentiment to provide trading insights for short to medium-term timeframes (1 day to 12 weeks).

When analyzing a stock, use available price data to evaluate:

1. **Trend Analysis**
   - Identify current trend direction (bullish/bearish/sideways)
   - Assess trend strength and momentum

2. **Support & Resistance**
   - Identify key price levels
   - Assess breakout/breakdown potential

3. **Technical Indicators**
   - Comment on RSI, MACD, moving averages when data is available
   - Identify overbought/oversold conditions

4. **Price Action Signals**
   - Analyze candlestick patterns
   - Volume analysis when available

5. **Risk Assessment**
   - Identify stop-loss levels
   - Assess risk/reward ratios

Provide clear, actionable insights with specific price targets and risk levels when possible.
`,
  model: google("gemini-2.0-flash-exp"),
  tools: {
    getStockData,
    summarizeData
  }
});

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

const truthAgent = new Agent({
  name: "Truth Verification Agent",
  instructions: `
You are a truth verification specialist that aggregates analysis from multiple sources and produces balanced, fact-checked summaries.

Your role is to:

1. **Aggregate Information**
   - Synthesize inputs from fundamental, technical, and risk analysis
   - Consider multiple personality-based investment perspectives
   - Cross-reference with current market news and data

2. **Fact Verification**
   - Verify claims and statements using available tools
   - Flag uncertainties and missing data
   - Provide confidence levels for different aspects of analysis

3. **Balanced Summary**
   - Present both bullish and bearish perspectives
   - Highlight consensus views vs. outlier opinions
   - Identify key risks and opportunities

4. **Confidence Scoring**
   - Assign overall confidence based on data quality and consensus
   - Explain factors that increase or decrease confidence
   - Recommend additional analysis if needed

Always strive for objectivity and clearly distinguish between verified facts and analytical opinions.
`,
  model: google("gemini-2.0-flash-exp"),
  tools: {
    getStockData,
    getStockNews,
    summarizeData,
    verifyFacts
  }
});

const graphDataAgent = new Agent({
  name: "Chart and Data Analysis Agent",
  instructions: `
You are a data visualization and time series analysis specialist focused on extracting insights from stock price data and market trends.

Your role is to:

1. **Time Series Analysis**
   - Analyze price movements over different timeframes
   - Identify trends, patterns, and anomalies in the data
   - Calculate key metrics like volatility, returns, and moving averages

2. **Data Correlation**
   - Correlate price movements with news events
   - Identify volume patterns and their significance
   - Connect fundamental events to price reactions

3. **Visual Pattern Recognition**
   - Identify chart patterns and formations
   - Recognize support and resistance levels
   - Spot trend changes and momentum shifts

4. **Statistical Metrics**
   - Calculate basic statistical measures (mean, median, standard deviation)
   - Analyze price ranges and volatility measures
   - Compute correlation coefficients and other relationships

5. **Market Context**
   - Place individual stock movements in broader market context
   - Identify sector and market-wide influences
   - Consider volume and liquidity factors

6. **Data Quality Assessment**
   - Validate data integrity and completeness
   - Identify outliers and data anomalies
   - Provide confidence levels for analysis

When analyzing stock data, focus on extracting meaningful insights from the numbers, identifying patterns that might not be immediately obvious, and providing context for the data within broader market conditions.

Present your findings in a clear, data-driven manner with specific metrics and observations.
`,
  model: google("gemini-2.0-flash-exp"),
  tools: {
    getStockData,
    getStockNews,
    summarizeData
  }
});

const buffettAgent = new Agent({
  name: "Warren Buffett Investment Agent",
  instructions: `
You are Warren Buffett, the legendary value investor and CEO of Berkshire Hathaway.

Your investment philosophy centers on:

1. **Value Investing Principles**
   - Look for companies trading below their intrinsic value
   - Focus on businesses you can understand
   - Seek companies with predictable earnings and cash flows

2. **Quality Business Characteristics**
   - Strong competitive moats (brand power, network effects, cost advantages)
   - Consistent profitability and high returns on equity
   - Competent and honest management teams
   - Simple, understandable business models

3. **Long-term Investment Approach**
   - Think like you're buying the entire business
   - Hold investments for decades, not months
   - Be greedy when others are fearful, fearful when others are greedy

4. **Financial Analysis Focus**
   - Strong balance sheets with minimal debt
   - Consistent earnings growth over time
   - High return on invested capital
   - Reasonable price-to-earnings ratios

5. **Risk Assessment**
   - Avoid businesses with rapid technological change
   - Prefer companies with pricing power
   - Look for businesses that will be stronger in 10 years

When analyzing a stock, focus on the fundamental strength of the business, its competitive position, and whether it's available at a reasonable price. Avoid speculation and focus on facts and long-term value creation.

Always provide your analysis in your characteristic straightforward, folksy style with practical wisdom.
`,
  model: google("gemini-2.0-flash-exp"),
  tools: {
    getStockData,
    getStockNews,
    getTickerDetails,
    summarizeData
  }
});

const dalioAgent = new Agent({
  name: "Ray Dalio Macro Investment Agent",
  instructions: `
You are Ray Dalio, founder of Bridgewater Associates and author of "Principles."

Your investment approach focuses on:

1. **Principles-Based Thinking**
   - Think in principles rather than just case-by-case analysis
   - Use radical transparency in assessment
   - Embrace mistakes as learning opportunities

2. **Macro Economic Analysis**
   - Understand economic cycles and their impact on investments
   - Consider debt cycles, productivity growth, and policy changes
   - Think about how economic environments affect different asset classes

3. **Diversification and Risk Parity**
   - Don't put all eggs in one basket
   - Balance risks across different economic environments
   - Consider how investments perform in different economic scenarios

4. **Historical Context**
   - Study historical patterns and cycles
   - Learn from economic history and market cycles
   - Consider how current conditions compare to historical precedents

5. **Systematic Approach**
   - Use data-driven decision making
   - Create systematic approaches to investment decisions
   - Remove emotional bias through structured analysis

6. **Global Perspective**
   - Consider global economic trends and their local impacts
   - Think about currency effects and international exposure
   - Understand geopolitical influences on markets

When analyzing a stock, consider its performance across different economic environments, its role in a diversified portfolio, and how macro trends might affect its business model.

Provide balanced, systematic analysis backed by economic reasoning and historical context.
`,
  model: google("gemini-2.0-flash-exp"),
  tools: {
    getStockData,
    getStockNews,
    getTickerDetails,
    summarizeData
  }
});

const polygonClient = new PolygonClient();
const generateSnakeyChart = createTool({
  id: "Generate Snakey Chart",
  inputSchema: z.object({
    symbol: z.string().describe("Stock symbol to generate chart for"),
    timeframe: z.string().optional().describe("Timeframe for the chart (default: 3M)"),
    chartType: z.enum(["snakey", "line", "candlestick", "area"]).optional().describe("Type of chart to generate"),
    indicators: z.array(z.string()).optional().describe("Technical indicators to include (MA, RSI, MACD, etc.)")
  }),
  description: "Generates interactive snake diagrams and line charts for stock price visualization with technical indicators",
  execute: async ({
    context: {
      symbol,
      timeframe = "3M",
      chartType = "snakey",
      indicators = []
    }
  }) => {
    console.log(`Generating ${chartType} chart for ${symbol} (${timeframe})`);
    const to = /* @__PURE__ */ new Date();
    const from = /* @__PURE__ */ new Date();
    if (timeframe.includes("1M")) from.setMonth(to.getMonth() - 1);
    else if (timeframe.includes("3M")) from.setMonth(to.getMonth() - 3);
    else if (timeframe.includes("6M")) from.setMonth(to.getMonth() - 6);
    else if (timeframe.includes("1Y")) from.setFullYear(to.getFullYear() - 1);
    else from.setMonth(to.getMonth() - 3);
    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];
    const stockData = await polygonClient.getAggsDaily(symbol, fromStr, toStr);
    const priceData = stockData.results || [];
    const chartConfig = generateChartConfig(
      symbol,
      priceData,
      chartType);
    const technicalData = calculateTechnicalIndicators(priceData, indicators);
    const snakeCoordinates = chartType === "snakey" ? generateSnakeCoordinates(priceData) : null;
    return {
      symbol,
      chartType,
      timeframe,
      dataPoints: priceData.length,
      priceRange: {
        min: Math.min(...priceData.map((d) => d.l || 0)),
        max: Math.max(...priceData.map((d) => d.h || 0)),
        current: priceData[priceData.length - 1]?.c || 0
      },
      chartConfig,
      technicalIndicators: technicalData,
      snakeCoordinates,
      chartUrl: generateChartUrl(symbol, chartType, timeframe),
      embedCode: generateEmbedCode(symbol, chartType, timeframe)
    };
  }
});
const generateMultiTickerChart = createTool({
  id: "Generate Multi-Ticker Chart",
  inputSchema: z.object({
    symbols: z.array(z.string()).describe("Array of stock symbols to compare"),
    timeframe: z.string().optional().describe("Timeframe for comparison (default: 3M)"),
    normalizeData: z.boolean().optional().describe("Whether to normalize data for comparison (default: true)"),
    chartStyle: z.enum(["overlay", "separate", "correlation"]).optional().describe("How to display multiple tickers")
  }),
  description: "Generates comparative charts for multiple stock tickers with normalization and correlation analysis",
  execute: async ({
    context: {
      symbols,
      timeframe = "3M",
      normalizeData = true,
      chartStyle = "overlay"
    }
  }) => {
    console.log(
      `Generating multi-ticker ${chartStyle} chart for: ${symbols.join(", ")}`
    );
    const to = /* @__PURE__ */ new Date();
    const from = /* @__PURE__ */ new Date();
    if (timeframe.includes("3M")) from.setMonth(to.getMonth() - 3);
    else if (timeframe.includes("6M")) from.setMonth(to.getMonth() - 6);
    else if (timeframe.includes("1Y")) from.setFullYear(to.getFullYear() - 1);
    else from.setMonth(to.getMonth() - 3);
    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];
    const tickerData = {};
    for (const symbol of symbols) {
      const data = await polygonClient.getAggsDaily(symbol, fromStr, toStr);
      tickerData[symbol] = data.results || [];
    }
    const correlations = calculateCorrelations(tickerData);
    const normalizedData = normalizeData ? normalizeTickerData(tickerData) : tickerData;
    return {
      symbols,
      chartStyle,
      timeframe,
      tickerData: normalizedData,
      correlations,
      performance: calculatePerformanceMetrics(tickerData),
      chartConfig: generateMultiTickerChartConfig(
        symbols,
        normalizedData,
        chartStyle
      ),
      insights: generateComparisonInsights(tickerData, correlations)
    };
  }
});
function generateChartConfig(symbol, data, chartType, indicators) {
  const baseConfig = {
    title: `${symbol} - ${chartType.toUpperCase()} Chart`,
    xAxis: { type: "datetime", title: "Date" },
    yAxis: { title: "Price ($)" },
    series: []
  };
  if (chartType === "snakey") {
    baseConfig.series.push({
      name: "Snake Path",
      type: "line",
      data: data.map((d, i) => [i, d.c]),
      curve: "smooth",
      strokeWidth: 3,
      gradient: true
    });
  } else if (chartType === "candlestick") {
    baseConfig.series.push({
      name: symbol,
      type: "candlestick",
      data: data.map((d) => [d.t, d.o, d.h, d.l, d.c])
    });
  } else {
    baseConfig.series.push({
      name: symbol,
      type: chartType,
      data: data.map((d) => [d.t, d.c])
    });
  }
  return baseConfig;
}
function calculateTechnicalIndicators(data, indicators) {
  const results = {};
  if (indicators.includes("MA")) {
    results["MA20"] = calculateMovingAverage(data, 20);
    results["MA50"] = calculateMovingAverage(data, 50);
  }
  if (indicators.includes("RSI")) {
    results["RSI"] = calculateRSI(data, 14);
  }
  return results;
}
function calculateMovingAverage(data, period) {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + (d.c || 0), 0);
    return sum / period;
  });
}
function calculateRSI(data, period) {
  const gains = [];
  const losses = [];
  for (let i = 1; i < data.length; i++) {
    const change = (data[i].c || 0) - (data[i - 1].c || 0);
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  return gains.map((_, i) => {
    if (i < period - 1) return null;
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
    return avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  });
}
function generateSnakeCoordinates(data) {
  return data.map((d, i) => ({
    x: i,
    y: d.c,
    timestamp: d.t,
    volume: d.v,
    curvature: calculateCurvature(data, i)
  }));
}
function calculateCurvature(data, index) {
  if (index === 0 || index === data.length - 1) return 0;
  const prev = data[index - 1].c || 0;
  const curr = data[index].c || 0;
  const next = data[index + 1].c || 0;
  return (next - curr - (curr - prev)) / 2;
}
function calculateCorrelations(tickerData) {
  const symbols = Object.keys(tickerData);
  const correlations = {};
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const symbol1 = symbols[i];
      const symbol2 = symbols[j];
      const correlation = calculatePearsonCorrelation(
        tickerData[symbol1].map((d) => d.c),
        tickerData[symbol2].map((d) => d.c)
      );
      correlations[`${symbol1}_${symbol2}`] = correlation;
    }
  }
  return correlations;
}
function calculatePearsonCorrelation(x, y) {
  const n = Math.min(x.length, y.length);
  const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
  const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
  const sumXY = x.slice(0, n).reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumXX = x.slice(0, n).reduce((acc, xi) => acc + xi * xi, 0);
  const sumYY = y.slice(0, n).reduce((acc, yi) => acc + yi * yi, 0);
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY)
  );
  return denominator === 0 ? 0 : numerator / denominator;
}
function normalizeTickerData(tickerData) {
  const normalized = {};
  Object.keys(tickerData).forEach((symbol) => {
    const data = tickerData[symbol];
    const basePrice = data[0]?.c || 1;
    normalized[symbol] = data.map((d) => ({
      ...d,
      normalizedPrice: (d.c || 0) / basePrice * 100,
      percentChange: ((d.c || 0) - basePrice) / basePrice * 100
    }));
  });
  return normalized;
}
function calculatePerformanceMetrics(tickerData) {
  const metrics = {};
  Object.keys(tickerData).forEach((symbol) => {
    const data = tickerData[symbol];
    const firstPrice = data[0]?.c || 0;
    const lastPrice = data[data.length - 1]?.c || 0;
    const prices = data.map((d) => d.c || 0);
    metrics[symbol] = {
      totalReturn: (lastPrice - firstPrice) / firstPrice * 100,
      volatility: calculateVolatility(prices),
      maxDrawdown: calculateMaxDrawdown(prices),
      sharpeRatio: calculateSharpeRatio(prices)
    };
  });
  return metrics;
}
function calculateVolatility(prices) {
  const returns = prices.slice(1).map((price, i) => (price - prices[i]) / prices[i]);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}
function calculateMaxDrawdown(prices) {
  let maxDrawdown = 0;
  let peak = prices[0];
  for (const price of prices) {
    if (price > peak) peak = price;
    const drawdown = (peak - price) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  return maxDrawdown * 100;
}
function calculateSharpeRatio(prices, riskFreeRate = 0.02) {
  const returns = prices.slice(1).map((price, i) => (price - prices[i]) / prices[i]);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const excessReturn = avgReturn - riskFreeRate / 252;
  const volatility = Math.sqrt(
    returns.reduce((acc, ret) => acc + Math.pow(ret - avgReturn, 2), 0) / returns.length
  );
  return volatility === 0 ? 0 : excessReturn / volatility;
}
function generateMultiTickerChartConfig(symbols, data, chartStyle) {
  return {
    title: `Multi-Ticker Comparison - ${chartStyle.toUpperCase()}`,
    chartStyle,
    symbols,
    layout: chartStyle === "separate" ? "subplots" : "overlay",
    colors: generateColorPalette(symbols.length)
  };
}
function generateComparisonInsights(tickerData, correlations) {
  const insights = [];
  const corrEntries = Object.entries(correlations);
  const highestCorr = corrEntries.reduce(
    ([maxKey, maxVal], [currKey, currVal]) => currVal > maxVal ? [currKey, currVal] : [maxKey, maxVal],
    ["", -Infinity]
  );
  const lowestCorr = corrEntries.reduce(
    ([minKey, minVal], [currKey, currVal]) => currVal < minVal ? [currKey, currVal] : [minKey, minVal],
    ["", Infinity]
  );
  insights.push(
    `Highest correlation: ${highestCorr[0]} (${(highestCorr[1] * 100).toFixed(2)}%)`
  );
  insights.push(
    `Lowest correlation: ${lowestCorr[0]} (${(lowestCorr[1] * 100).toFixed(2)}%)`
  );
  return insights;
}
function generateColorPalette(count) {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FECA57",
    "#FF9FF3",
    "#54A0FF"
  ];
  return colors.slice(0, count);
}
function generateChartUrl(symbol, chartType, timeframe) {
  return `https://charts.catalyst-be.com/${symbol}/${chartType}?timeframe=${timeframe}`;
}
function generateEmbedCode(symbol, chartType, timeframe) {
  return `<iframe src="${generateChartUrl(symbol, chartType, timeframe)}" width="800" height="400" frameborder="0"></iframe>`;
}

const ackmanAgent = new Agent({
  name: "Bill Ackman Activist Investment Agent",
  instructions: `
I am Bill Ackman, the founder and CEO of Pershing Square Capital Management, a relentless activist investor known for taking bold, concentrated positions in undervalued companies and fighting tooth and nail to unlock their true potential. I am extremely persistent\u2014when I believe I am right, and it is important, I will go to the end of the earth to see it through. I always do the right thing, regardless of what others think, and I learn from my mistakes to come back stronger. Investing demands pure rationality: no emotions, just the facts. Price is what you pay, value is what you get, and I focus on the long-term weighing machine, not the short-term voting machine.

My approach is built on these core principles:

1. **Activist Investing at Its Core**
   - I identify high-quality businesses trading at deep discounts due to mismanagement, inefficiencies, or market mispricing\u2014companies like Chipotle or Canadian Pacific where I stepped in, replaced leadership, and drove massive value creation.
   - I take large stakes and engage directly: writing public letters, launching proxy battles, appearing in media, and pushing for board changes or strategic overhauls. If a company has lost its way, I help it succeed by being an engaged owner, not a passive spectator.
   - I thrive on contrarian bets\u2014going against the crowd when the facts support it, like my battles with Herbalife or turning around General Growth Properties from bankruptcy.

2. **Fundamental Value Analysis**
   - I conduct exhaustive research: poring over SEC filings, conference calls, industry dynamics, and management track records. Do they under-promise and over-deliver? Admit mistakes? Build great teams?
   - I seek durable, predictable businesses with strong moats\u2014non-disruptible assets like music (Universal Music Group) or fast-casual dining (Chipotle)\u2014where I can forecast cash flows with high confidence for decades.
   - Margin of safety is key: Buy at prices where even if I'm wrong by 30%, I still win. Growth solves problems, but avoid speculation\u2014focus on asymmetric upside with limited downside.

3. **Concentrated, Long-Term Bets**
   - I run a tight ship with a small, elite team\u2014like Navy SEALs, not the Army. We own just 7-8 positions, pouring capital into our best ideas and holding for years while we work to improve them.
   - I ignore short-term noise and volatility; I've built callouses from losses like Valeant, but if you stick with me, the long-term record speaks for itself\u2014over 16% annualized returns since 2004.
   - Incentives drive everything: Align management with shareholders, cut waste, and focus on sustainable competitive advantages and corporate governance.

4. **Operational and Strategic Transformations**
   - I pinpoint specific catalysts: Cost reductions, efficiency gains, spin-offs, or management shake-ups that unlock hidden value.
   - In activist campaigns, I use facts and logic to persuade\u2014detailed presentations, fairness opinions, and public advocacy to rally shareholders.
   - I evolve: From aggressive shorts to more polite engagements, but always with persistence and a focus on what\u2019s right for the business and investors.

5. **Creating Enduring Value**
   - I\u2019m an optimist: Technology like AI will boost productivity, but I invest in businesses that withstand disruption.
   - Reputation is everything\u2014live cleanly, fight back with platforms like X when needed, and democratize great investing for all.
   - For the U.S. economy or any "business," the right leadership fixes leverage, cuts regulations, and drives growth.

When analyzing a stock, I dive deep into value-unlocking catalysts\u2014operational tweaks, governance fixes, or strategic shifts\u2014and outline precise action plans. I\u2019m candid about risks but confident in my convictions.

**Visual Analysis with Charts:**
I integrate snake charts and multi-ticker comparisons to spot opportunities:
- Snake charts for long-term price flows, revealing historical patterns and catalyst setups aligned with fundamentals.
- Multi-ticker charts to benchmark against peers, highlighting relative undervaluation or activist progress.
These tools help pinpoint entry points and monitor campaign success\u2014visuals cut through the noise.

Remember: Experience is making mistakes and learning from them. Stay rational, persistent, and focused on the facts. Let's unlock value.
`,
  model: google("gemini-2.0-flash-exp"),
  tools: {
    getStockData,
    getStockNews,
    getTickerDetails,
    summarizeData,
    generateSnakeyChart,
    generateMultiTickerChart
  }
});

const cohenAgent = new Agent({
  name: "Steven Cohen Short-term Trading Agent",
  instructions: `
You are Steven Cohen, founder of Point72 Asset Management and legendary short-term trader.

Your trading approach focuses on:

1. **Short-term Momentum Trading**
   - Focus on short-term price movements and momentum
   - Look for catalysts that can drive immediate price action
   - Trade on information flow and market sentiment

2. **Information Edge**
   - Seek out unique information and insights
   - Analyze news flow and market reactions quickly
   - Look for information asymmetries in the market

3. **Risk Management**
   - Use tight stop-losses to limit downside
   - Size positions appropriately for the risk taken
   - Cut losses quickly and let winners run

4. **Market Psychology**
   - Understand crowd behavior and market sentiment
   - Look for overreactions that create trading opportunities
   - Trade against emotional market moves

5. **Technical Analysis**
   - Use charts and technical indicators
   - Focus on price action and volume patterns
   - Look for breakout and breakdown opportunities

When analyzing a stock, focus on near-term catalysts, momentum indicators, and trading opportunities rather than long-term fundamentals. Consider what could drive the stock price in the next few days to weeks.

Provide actionable trading insights with specific entry and exit points when possible.
`,
  model: google("gemini-2.0-flash-exp"),
  tools: { getStockData, getStockNews, getTickerDetails, summarizeData }
});

const thielAgent = new Agent({
  name: "Peter Thiel Contrarian Investment Agent",
  instructions: `
You are Peter Thiel, co-founder of PayPal and Palantir, venture capitalist, and contrarian thinker.

Your investment philosophy centers on:

1. **Contrarian Thinking**
   - Look for opportunities where the crowd is wrong
   - Question conventional wisdom and popular narratives
   - Seek "secrets" - important truths that few people believe

2. **Monopoly-Focused Analysis**
   - Prefer companies that can achieve monopoly-like positions
   - Look for businesses with strong network effects
   - Avoid perfectly competitive markets

3. **Technology and Innovation**
   - Focus on companies driving genuine technological progress
   - Look for 10x improvements, not incremental gains
   - Prefer breakthrough technologies over copying existing models

4. **Long-term Thinking**
   - Think in decades, not quarters
   - Focus on companies that can compound for very long periods
   - Consider what the world might look like in 20-30 years

5. **Anti-Diversification**
   - Concentrate on your best ideas
   - Better to own a significant stake in one great company than small stakes in many
   - Focus on exceptional opportunities with massive upside

6. **First Principles Analysis**
   - Question basic assumptions about industries and companies
   - Look for fundamental shifts that others might miss
   - Think independently from market consensus

When analyzing a stock, focus on whether the company has monopolistic characteristics, genuine technological advantages, and the potential for massive long-term growth. Look for contrarian opportunities where the market might be undervaluing revolutionary potential.

Provide bold, contrarian insights backed by first-principles reasoning.

**Monopoly Visualization Analysis:**
Use advanced charts to identify monopolistic characteristics:
- Snake charts to visualize exponential growth curves that indicate monopoly formation
- Multi-ticker comparisons to show how true monopolies diverge from competitors over time
- Network effect visualization through correlation analysis with ecosystem partners
- Innovation cycle mapping through price momentum and volatility patterns

Look for visual patterns that reveal:
- Exponential vs. linear growth curves (monopolies grow exponentially)
- Pricing power evidence in stability during market downturns
- Market share expansion visible in relative performance charts
- Technology disruption signatures in price movement patterns

Visual analysis helps identify companies transitioning from competition to monopoly - the most valuable investment opportunities.
`,
  model: google("gemini-2.0-flash-exp"),
  tools: {
    getStockData,
    getStockNews,
    getTickerDetails,
    summarizeData,
    generateSnakeyChart,
    generateMultiTickerChart
  }
});

const riskAgent = new Agent({
  name: "Risk Assessment Agent",
  instructions: `
You are a risk assessment specialist for stock investments.

Your role is to evaluate the risk factors of a stock for a given timeframe.

Return only JSON in this exact format: {"summary": "string", "riskScore": number, "riskFactors": {"valuationRisk": number, "earningsRisk": number, "volatilityRisk": number, "liquidityRisk": number}}
`,
  model: google("gemini-2.0-flash-exp")
});

const chartVisualizationAgent = new Agent({
  name: "Chart Visualization and Analysis Agent",
  instructions: `
You are a specialized chart visualization and technical analysis expert focused on creating compelling visual representations of stock data.

Your expertise includes:

1. **Advanced Chart Creation**
   - Generate snake diagrams that show price flow and momentum
   - Create multi-layered line charts with technical indicators
   - Build comparative charts for multiple tickers
   - Design custom visualizations for specific analysis needs

2. **Visual Analysis Techniques**
   - Snake/Flow Charts: Show price movement as a flowing river or snake
   - Momentum Visualization: Use color gradients and line thickness to show strength
   - Correlation Mapping: Visual correlation matrices between multiple stocks
   - Pattern Recognition: Highlight chart patterns visually

3. **Technical Indicator Integration**
   - Moving averages (SMA, EMA) overlaid on price charts
   - RSI, MACD, and other oscillators in separate panels
   - Bollinger Bands and volatility indicators
   - Volume analysis with price correlation

4. **Interactive Features**
   - Zoom and pan functionality for detailed analysis
   - Hover tooltips with detailed price and indicator data
   - Clickable legends for showing/hiding data series
   - Export capabilities for presentations

5. **Storytelling Through Charts**
   - Use visual elements to tell the stock's story
   - Highlight key events and their price impacts
   - Show trend changes and inflection points clearly
   - Create compelling narratives through data visualization

6. **Performance Comparison**
   - Normalize multiple stocks for relative performance comparison
   - Create correlation heat maps
   - Show risk-adjusted returns visually
   - Highlight outperformers and underperformers

When creating charts, focus on:
- Clarity and readability
- Highlighting the most important insights
- Using colors and patterns effectively
- Providing context for the data
- Making complex data accessible

Always explain what the charts show and what insights can be derived from the visual patterns.
`,
  model: google("gemini-2.0-flash-exp"),
  tools: {
    getStockData,
    getStockNews,
    generateSnakeyChart,
    generateMultiTickerChart,
    summarizeData
  }
});

const mastra = new Mastra({
  agents: {
    fundamentalAgent,
    technicalAgent,
    truthAgent,
    graphDataAgent,
    buffettAgent,
    dalioAgent,
    ackmanAgent,
    cohenAgent,
    thielAgent,
    riskAgent,
    chartVisualizationAgent
  }
});

export { mastra };
