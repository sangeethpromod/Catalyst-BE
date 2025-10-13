import { E as ENV } from './env.mjs';

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

export { PolygonClient as P };
