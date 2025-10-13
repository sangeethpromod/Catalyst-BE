import { BaseAgent } from "./base/BaseAgent.js";
import { PolygonClient } from "../api/polygon/polygonClient.js";
import { computeBasicSeriesMetrics } from "../api/polygon/polygonUtils.js";

/** Fetches price/time series and related news from Polygon. */
export class GraphDataAgent extends BaseAgent {
  private polygon = new PolygonClient();

  constructor() {
    super("GraphDataAgent");
  }

  async analyze(input: { symbol: string; timeframe: string }): Promise<any> {
    // Stub compute from/to dates (e.g., last 3 months)
    const to = new Date();
    const from = new Date();
    if (input.timeframe.toUpperCase().includes("3"))
      from.setMonth(to.getMonth() - 3);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);

    const aggs = await this.polygon.getAggsDaily(input.symbol, fromStr, toStr);
    const metrics = computeBasicSeriesMetrics(aggs.results);
    const news = await this.polygon.getNews(input.symbol);

    return { series: aggs.results, metrics, news };
  }
}
