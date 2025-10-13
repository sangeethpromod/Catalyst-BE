import { FundamentalAgent } from "../agents/analysis/FundamentalAgent";
import { TechnicalAgent } from "../agents/analysis/TechnicalAgent";
import { RiskAgent } from "../agents/analysis/RiskAgent";
import { BuffettAgent } from "../agents/personality/BuffettAgent.js";
import { CohenAgent } from "../agents/personality/CohenAgent.js";
import { DalioAgent } from "../agents/personality/DalioAgent.js";
import { AckmanAgent } from "../agents/personality/AckmanAgent.js";
import { ThielAgent } from "../agents/personality/ThielAgent.js";
import { TruthAgent } from "../agents/TruthAgent.js";
import { GraphDataAgent } from "../agents/GraphDataAgent.js";

export async function runAgents(symbol: string, timeframe: string) {
  const fundamental = await new FundamentalAgent().analyze({
    symbol,
    timeframe,
  });
  const technical = await new TechnicalAgent().analyze({ symbol, timeframe });
  const risk = await new RiskAgent().analyze({ symbol, timeframe });

  const personalities: Record<string, any> = {};
  personalities["Buffett"] = await new BuffettAgent().analyze({
    symbol,
    timeframe,
  });
  personalities["Cohen"] = await new CohenAgent().analyze({
    symbol,
    timeframe,
  });
  personalities["Dalio"] = await new DalioAgent().analyze({
    symbol,
    timeframe,
  });
  personalities["Ackman"] = await new AckmanAgent().analyze({
    symbol,
    timeframe,
  });
  personalities["Thiel"] = await new ThielAgent().analyze({
    symbol,
    timeframe,
  });

  const truth = await new TruthAgent().analyze({
    symbol,
    timeframe,
    fundamental,
    technical,
    risk,
    personalities,
  });
  const graph = await new GraphDataAgent().analyze({ symbol, timeframe });

  return {
    fundamental,
    technical,
    risk,
    personalities,
    truthSummary: truth.summary,
    graphData: graph,
  };
}
