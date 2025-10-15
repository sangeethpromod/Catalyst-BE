import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { PolygonClient } from "../../api/polygon/polygonClient.js";

const polygonClient = new PolygonClient();

export const generateSnakeyChart = createTool({
  id: "Generate Snakey Chart",
  inputSchema: z.object({
    symbol: z.string().describe("Stock symbol to generate chart for"),
    timeframe: z
      .string()
      .optional()
      .describe("Timeframe for the chart (default: 3M)"),
    chartType: z
      .enum(["snakey", "line", "candlestick", "area"])
      .optional()
      .describe("Type of chart to generate"),
    indicators: z
      .array(z.string())
      .optional()
      .describe("Technical indicators to include (MA, RSI, MACD, etc.)"),
  }),
  description:
    "Generates interactive snake diagrams and line charts for stock price visualization with technical indicators",
  execute: async ({
    context: {
      symbol,
      timeframe = "3M",
      chartType = "snakey",
      indicators = [],
    },
  }) => {
    console.log(`Generating ${chartType} chart for ${symbol} (${timeframe})`);

    // Calculate date range based on timeframe
    const to = new Date();
    const from = new Date();

    if (timeframe.includes("1M")) from.setMonth(to.getMonth() - 1);
    else if (timeframe.includes("3M")) from.setMonth(to.getMonth() - 3);
    else if (timeframe.includes("6M")) from.setMonth(to.getMonth() - 6);
    else if (timeframe.includes("1Y")) from.setFullYear(to.getFullYear() - 1);
    else from.setMonth(to.getMonth() - 3); // default

    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];

    // Fetch stock data
    const stockData = await polygonClient.getAggsDaily(symbol, fromStr, toStr);
    const priceData = stockData.results || [];

    // Generate chart configuration for different chart types
    const chartConfig = generateChartConfig(
      symbol,
      priceData,
      chartType,
      indicators,
    );

    // Calculate technical indicators if requested
    const technicalData = calculateTechnicalIndicators(priceData, indicators);

    // Generate snake pattern coordinates if snakey chart
    const snakeCoordinates =
      chartType === "snakey" ? generateSnakeCoordinates(priceData) : null;

    return {
      symbol,
      chartType,
      timeframe,
      dataPoints: priceData.length,
      priceRange: {
        min: Math.min(...priceData.map((d: any) => d.l || 0)),
        max: Math.max(...priceData.map((d: any) => d.h || 0)),
        current: priceData[priceData.length - 1]?.c || 0,
      },
      chartConfig,
      technicalIndicators: technicalData,
      snakeCoordinates,
      chartUrl: generateChartUrl(symbol, chartType, timeframe),
      embedCode: generateEmbedCode(symbol, chartType, timeframe),
    };
  },
});

export const generateMultiTickerChart = createTool({
  id: "Generate Multi-Ticker Chart",
  inputSchema: z.object({
    symbols: z.array(z.string()).describe("Array of stock symbols to compare"),
    timeframe: z
      .string()
      .optional()
      .describe("Timeframe for comparison (default: 3M)"),
    normalizeData: z
      .boolean()
      .optional()
      .describe("Whether to normalize data for comparison (default: true)"),
    chartStyle: z
      .enum(["overlay", "separate", "correlation"])
      .optional()
      .describe("How to display multiple tickers"),
  }),
  description:
    "Generates comparative charts for multiple stock tickers with normalization and correlation analysis",
  execute: async ({
    context: {
      symbols,
      timeframe = "3M",
      normalizeData = true,
      chartStyle = "overlay",
    },
  }) => {
    console.log(
      `Generating multi-ticker ${chartStyle} chart for: ${symbols.join(", ")}`,
    );

    const to = new Date();
    const from = new Date();
    if (timeframe.includes("3M")) from.setMonth(to.getMonth() - 3);
    else if (timeframe.includes("6M")) from.setMonth(to.getMonth() - 6);
    else if (timeframe.includes("1Y")) from.setFullYear(to.getFullYear() - 1);
    else from.setMonth(to.getMonth() - 3);

    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];

    // Fetch data for all symbols
    const tickerData: Record<string, any[]> = {};
    for (const symbol of symbols) {
      const data = await polygonClient.getAggsDaily(symbol, fromStr, toStr);
      tickerData[symbol] = data.results || [];
    }

    // Calculate correlations between tickers
    const correlations: Record<string, number> =
      calculateCorrelations(tickerData);

    // Normalize data if requested
    const normalizedData = normalizeData
      ? normalizeTickerData(tickerData)
      : tickerData;

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
        chartStyle,
      ),
      insights: generateComparisonInsights(tickerData, correlations),
    };
  },
});

// Helper functions
function generateChartConfig(
  symbol: string,
  data: any[],
  chartType: string,
  indicators: string[],
) {
  const baseConfig = {
    title: `${symbol} - ${chartType.toUpperCase()} Chart`,
    xAxis: { type: "datetime", title: "Date" },
    yAxis: { title: "Price ($)" },
    series: [],
  };

  // Add price series based on chart type
  if (chartType === "snakey") {
    (baseConfig.series as any[]).push({
      name: "Snake Path",
      type: "line",
      data: data.map((d, i) => [i, d.c]),
      curve: "smooth",
      strokeWidth: 3,
      gradient: true,
    });
  } else if (chartType === "candlestick") {
    (baseConfig.series as any[]).push({
      name: symbol,
      type: "candlestick",
      data: data.map((d) => [d.t, d.o, d.h, d.l, d.c]),
    });
  } else {
    (baseConfig.series as any[]).push({
      name: symbol,
      type: chartType,
      data: data.map((d) => [d.t, d.c]),
    });
  }

  return baseConfig;
}

function calculateTechnicalIndicators(data: any[], indicators: string[]) {
  const results: Record<string, any> = {};

  if (indicators.includes("MA")) {
    results["MA20"] = calculateMovingAverage(data, 20);
    results["MA50"] = calculateMovingAverage(data, 50);
  }

  if (indicators.includes("RSI")) {
    results["RSI"] = calculateRSI(data, 14);
  }

  return results;
}

function calculateMovingAverage(data: any[], period: number) {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const sum = data
      .slice(i - period + 1, i + 1)
      .reduce((acc, d) => acc + (d.c || 0), 0);
    return sum / period;
  });
}

function calculateRSI(data: any[], period: number) {
  // Simplified RSI calculation
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const change = (data[i].c || 0) - (data[i - 1].c || 0);
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  return gains.map((_, i) => {
    if (i < period - 1) return null;
    const avgGain =
      gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
    const avgLoss =
      losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
    return avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  });
}

function generateSnakeCoordinates(data: any[]) {
  // Generate smooth curve coordinates for snake-like visualization
  return data.map((d, i) => ({
    x: i,
    y: d.c,
    timestamp: d.t,
    volume: d.v,
    curvature: calculateCurvature(data, i),
  }));
}

function calculateCurvature(data: any[], index: number) {
  if (index === 0 || index === data.length - 1) return 0;

  const prev = data[index - 1].c || 0;
  const curr = data[index].c || 0;
  const next = data[index + 1].c || 0;

  // Simple curvature calculation
  return (next - curr - (curr - prev)) / 2;
}

function calculateCorrelations(tickerData: any) {
  const symbols = Object.keys(tickerData);
  const correlations: Record<string, number> = {};

  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const symbol1 = symbols[i];
      const symbol2 = symbols[j];
      const correlation = calculatePearsonCorrelation(
        tickerData[symbol1].map((d: any) => d.c),
        tickerData[symbol2].map((d: any) => d.c),
      );
      correlations[`${symbol1}_${symbol2}`] = correlation;
    }
  }

  return correlations;
}

function calculatePearsonCorrelation(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length);
  const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
  const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
  const sumXY = x.slice(0, n).reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumXX = x.slice(0, n).reduce((acc, xi) => acc + xi * xi, 0);
  const sumYY = y.slice(0, n).reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY),
  );

  return denominator === 0 ? 0 : numerator / denominator;
}

function normalizeTickerData(tickerData: any) {
  const normalized: Record<string, any[]> = {};

  Object.keys(tickerData).forEach((symbol) => {
    const data = tickerData[symbol];
    const basePrice = data[0]?.c || 1;

    normalized[symbol] = data.map((d: any) => ({
      ...d,
      normalizedPrice: ((d.c || 0) / basePrice) * 100,
      percentChange: (((d.c || 0) - basePrice) / basePrice) * 100,
    }));
  });

  return normalized;
}

function calculatePerformanceMetrics(tickerData: any) {
  const metrics: Record<string, any> = {};

  Object.keys(tickerData).forEach((symbol) => {
    const data = tickerData[symbol];
    const firstPrice = data[0]?.c || 0;
    const lastPrice = data[data.length - 1]?.c || 0;
    const prices = data.map((d: any) => d.c || 0);

    metrics[symbol] = {
      totalReturn: ((lastPrice - firstPrice) / firstPrice) * 100,
      volatility: calculateVolatility(prices),
      maxDrawdown: calculateMaxDrawdown(prices),
      sharpeRatio: calculateSharpeRatio(prices),
    };
  });

  return metrics;
}

function calculateVolatility(prices: number[]) {
  const returns = prices
    .slice(1)
    .map((price, i) => (price - prices[i]) / prices[i]);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((acc, ret) => acc + Math.pow(ret - avgReturn, 2), 0) /
    returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized volatility
}

function calculateMaxDrawdown(prices: number[]) {
  let maxDrawdown = 0;
  let peak = prices[0];

  for (const price of prices) {
    if (price > peak) peak = price;
    const drawdown = (peak - price) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  return maxDrawdown * 100;
}

function calculateSharpeRatio(prices: number[], riskFreeRate = 0.02) {
  const returns = prices
    .slice(1)
    .map((price, i) => (price - prices[i]) / prices[i]);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const excessReturn = avgReturn - riskFreeRate / 252; // Daily risk-free rate
  const volatility = Math.sqrt(
    returns.reduce((acc, ret) => acc + Math.pow(ret - avgReturn, 2), 0) /
      returns.length,
  );

  return volatility === 0 ? 0 : excessReturn / volatility;
}

function generateMultiTickerChartConfig(
  symbols: string[],
  data: any,
  chartStyle: string,
) {
  return {
    title: `Multi-Ticker Comparison - ${chartStyle.toUpperCase()}`,
    chartStyle,
    symbols,
    layout: chartStyle === "separate" ? "subplots" : "overlay",
    colors: generateColorPalette(symbols.length),
  };
}

function generateComparisonInsights(tickerData: any, correlations: any) {
  const insights = [];

  // Find highest and lowest correlations
  const corrEntries = Object.entries(correlations);
  const highestCorr = (corrEntries as [string, number][]).reduce(
    ([maxKey, maxVal], [currKey, currVal]) =>
      currVal > maxVal ? [currKey, currVal] : [maxKey, maxVal],
    ["", -Infinity],
  );
  const lowestCorr = (corrEntries as [string, number][]).reduce(
    ([minKey, minVal], [currKey, currVal]) =>
      currVal < minVal ? [currKey, currVal] : [minKey, minVal],
    ["", Infinity],
  );

  insights.push(
    `Highest correlation: ${highestCorr[0]} (${(highestCorr[1] * 100).toFixed(2)}%)`,
  );
  insights.push(
    `Lowest correlation: ${lowestCorr[0]} (${(lowestCorr[1] * 100).toFixed(2)}%)`,
  );

  return insights;
}

function generateColorPalette(count: number) {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FECA57",
    "#FF9FF3",
    "#54A0FF",
  ];
  return colors.slice(0, count);
}

function generateChartUrl(
  symbol: string,
  chartType: string,
  timeframe: string,
) {
  return `https://charts.catalyst-be.com/${symbol}/${chartType}?timeframe=${timeframe}`;
}

function generateEmbedCode(
  symbol: string,
  chartType: string,
  timeframe: string,
) {
  return `<iframe src="${generateChartUrl(symbol, chartType, timeframe)}" width="800" height="400" frameborder="0"></iframe>`;
}
