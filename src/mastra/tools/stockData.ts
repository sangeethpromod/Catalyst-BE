import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { PolygonClient } from "../../api/polygon/polygonClient.js";

const polygonClient = new PolygonClient();

export const getStockData = createTool({
  id: "Get Stock Data",
  inputSchema: z.object({
    symbol: z.string().describe("Stock symbol (e.g., AAPL, MSFT)"),
    from: z.string().describe("Start date in YYYY-MM-DD format"),
    to: z.string().describe("End date in YYYY-MM-DD format"),
  }),
  description:
    "Fetches daily aggregated stock data for a given symbol and date range using Polygon API",
  execute: async ({ context: { symbol, from, to } }) => {
    console.log(`Fetching stock data for ${symbol} from ${from} to ${to}`);
    const data = await polygonClient.getAggsDaily(symbol, from, to);
    return {
      symbol,
      data: data.results,
      priceRange: {
        start: data.results[0]?.c || 0,
        end: data.results[data.results.length - 1]?.c || 0,
      },
    };
  },
});

export const getStockNews = createTool({
  id: "Get Stock News",
  inputSchema: z.object({
    symbol: z.string().describe("Stock symbol to get news for"),
    limit: z
      .number()
      .optional()
      .describe("Number of news articles to fetch (default: 10)"),
  }),
  description: "Fetches recent news articles for a given stock symbol",
  execute: async ({ context: { symbol, limit = 10 } }) => {
    console.log(`Fetching ${limit} news articles for ${symbol}`);
    const news = await polygonClient.getNews(symbol, limit);
    return {
      symbol,
      articles: news.map((article) => ({
        title: article.title,
        summary: article.summary || article.description,
        publishedDate: article.published_utc,
        url: article.article_url,
        author: article.author,
        keywords: article.keywords,
      })),
      count: news.length,
    };
  },
});

export const getTickerDetails = createTool({
  id: "Get Ticker Details",
  inputSchema: z.object({
    symbol: z.string().describe("Stock symbol to get company details for"),
  }),
  description:
    "Fetches company information and details for a given stock symbol",
  execute: async ({ context: { symbol } }) => {
    console.log(`Fetching company details for ${symbol}`);
    const details = await polygonClient.getTickerDetails(symbol);
    return {
      symbol: details.ticker || symbol,
      name: details.name,
      description: details.description,
      marketCap: details.market_cap,
      sector: details.sic_description,
      industry: details.type,
      website: details.homepage_url,
      totalEmployees: details.total_employees,
      listDate: details.list_date,
    };
  },
});
