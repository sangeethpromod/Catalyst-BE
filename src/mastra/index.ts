import { Mastra } from "@mastra/core";
import { fundamentalAgent } from "./agents/fundamentalAgent.js";
import { technicalAgent } from "./agents/technicalAgent.js";
import { truthAgent } from "./agents/truthAgent.js";
import { graphDataAgent } from "./agents/graphDataAgent.js";
import { buffettAgent } from "./agents/buffettAgent.js";
import { dalioAgent } from "./agents/dalioAgent.js";
import { ackmanAgent } from "./agents/ackmanAgent.js";
import { cohenAgent } from "./agents/cohenAgent.js";
import { thielAgent } from "./agents/thielAgent.js";
import { riskAgent } from "./agents/riskAgent.js";
import { chartVisualizationAgent } from "./agents/chartVisualizationAgent.js";

export const mastra = new Mastra({
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
    chartVisualizationAgent,
  },
});
