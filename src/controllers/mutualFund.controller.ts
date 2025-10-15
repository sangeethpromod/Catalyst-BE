import type { Request, Response } from "express";
import {
  analyzeMutualFundWithBuffett,
  analyzeMutualFundWithAckman,
} from "../mastra/analyze/mutualFundAnalyzer.js";

export async function analyzeMutualFund(req: Request, res: Response) {
  try {
    const { schemeCode, period, agentName } = req.body as {
      schemeCode: number;
      period?: "1year" | "3year" | "5year" | "all";
      agentName?: "buffett" | "ackman";
    };
    if (!schemeCode) {
      return res.status(400).json({ error: "schemeCode is required" });
    }
    const agent = (agentName ?? "buffett").toLowerCase();
    const result =
      agent === "ackman"
        ? await analyzeMutualFundWithAckman({ schemeCode, period })
        : await analyzeMutualFundWithBuffett({ schemeCode, period });

    // Trim response to requested shape
    const trimmed = {
      metrics: result.metrics,
      analysis: result.analysis,
      data: { meta: result.data?.meta },
    };
    return res.json(trimmed);
  } catch (error: any) {
    console.error("Error in analyzeMutualFund:", error);
    return res
      .status(500)
      .json({ error: error?.message || "Internal server error" });
  }
}
