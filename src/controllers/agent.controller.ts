import type { Request, Response } from "express";
import { FundamentalAgent } from "../agents/analysis/FundamentalAgent.js";
import { TechnicalAgent } from "../agents/analysis/TechnicalAgent.js";
import { RiskAgent } from "../agents/analysis/RiskAgent.js";
import { BuffettAgent } from "../agents/personality/BuffettAgent.js";
import { CohenAgent } from "../agents/personality/CohenAgent.js";
import { DalioAgent } from "../agents/personality/DalioAgent.js";
import { AckmanAgent } from "../agents/personality/AckmanAgent.js";
import { ThielAgent } from "../agents/personality/ThielAgent.js";

export async function testAgent(req: Request, res: Response) {
  const { name } = req.params;
  const { symbol = "AAPL", timeframe = "3M" } = req.query as any;
  const map: Record<string, any> = {
    fundamental: FundamentalAgent,
    technical: TechnicalAgent,
    risk: RiskAgent,
    buffett: BuffettAgent,
    cohen: CohenAgent,
    dalio: DalioAgent,
    ackman: AckmanAgent,
    thiel: ThielAgent,
  };
  const AgentCls = map[name.toLowerCase()];
  if (!AgentCls) return res.status(404).json({ error: "Unknown agent" });
  const output = await new AgentCls().analyze({ symbol, timeframe });
  res.json({ name, output });
}
