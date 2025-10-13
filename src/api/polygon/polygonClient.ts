import { ENV } from "../../utils/env.js";

/** Minimal stub client for Polygon.io */
export class PolygonClient {
  constructor(private apiKey: string = ENV.POLYGON_API_KEY) {}

  async getAggsDaily(symbol: string, from: string, to: string): Promise<any> {
    // TODO: Replace stub with real HTTP call
    return {
      symbol,
      results: [
        { t: from, c: 170 },
        { t: to, c: 175 },
      ],
    };
  }

  async getNews(symbol: string): Promise<any[]> {
    // TODO: Replace stub with real HTTP call
    return [{ title: `News about ${symbol}`, summary: "Stub news item" }];
  }
}
