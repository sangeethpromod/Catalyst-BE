function formatMutualFundMarkdown(metrics: ReturnType<typeof analyzeMutualFundMetrics>, analysis: string): string {
  // Table for performance metrics
  const perfTable = `| Period | Absolute Return (%) | CAGR (%) |
|--------|--------------------|----------|
| 1 Year | ${metrics.returns.oneYear?.absoluteReturn ?? "N/A"} | ${metrics.returns.oneYear?.cagr ?? "N/A"} |
| 3 Year | ${metrics.returns.threeYear?.absoluteReturn ?? "N/A"} | ${metrics.returns.threeYear?.cagr ?? "N/A"} |
| 5 Year | ${metrics.returns.fiveYear?.absoluteReturn ?? "N/A"} | ${metrics.returns.fiveYear?.cagr ?? "N/A"} |`;

  // Table for risk metrics
  const riskTable = `| Metric | Value |
|--------|-------|
| Annualized Volatility | ${metrics.riskMetrics.volatility}% |
| Track Record | ${metrics.riskMetrics.fundAge} |
| Data Points | ${metrics.dataPoints} |`;

  // Fund details
  const detailsTable = `| Field | Value |
|-------|-------|
| Name | ${metrics.fundName} |
| Fund House | ${metrics.fundHouse} |
| Category | ${metrics.category} |
| Type | ${metrics.type} |
| Current NAV | ₹${metrics.currentNav} |`;

  // Graph summary
  const graphSummary = summarizeGraphs(metrics);

  // Compose markdown
  return `
**Fund Details**

${detailsTable}

**Performance Metrics**

${perfTable}

**Risk Metrics**

${riskTable}

**Charts Summary**

${graphSummary}

**Agent Analysis**

${analysis.trim()}
`;
}
import { buffettAgent } from "../agents/buffettAgent.js";
import { ackmanAgent } from "../agents/ackmanAgent.js";

interface MutualFundData {
  meta: {
    fund_house: string;
    scheme_type: string;
    scheme_category: string;
    scheme_code: number;
    scheme_name: string;
  };
  data: Array<{
    date: string;
    nav: string;
  }>;
  status: string;
}

interface MFAnalysisRequest {
  schemeCode: number;
  period?: "1year" | "3year" | "5year" | "all"; // For filtering historical data
}

async function fetchMutualFundData(
  schemeCode: number,
): Promise<MutualFundData> {
  const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch mutual fund data: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

function calculateReturns(
  navData: Array<{ date: string; nav: string }>,
  years: number,
) {
  if (navData.length === 0) return null;

  const sortedData = [...navData].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const latestNav = parseFloat(sortedData[0].nav);
  const daysAgo = years * 365;

  // Find NAV closest to target date
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - daysAgo);

  const oldNavEntry = sortedData.find(
    (entry) => new Date(entry.date) <= targetDate,
  );

  if (!oldNavEntry) return null;

  const oldNav = parseFloat(oldNavEntry.nav);
  const returns = ((latestNav - oldNav) / oldNav) * 100;
  const cagr = (Math.pow(latestNav / oldNav, 1 / years) - 1) * 100;

  return {
    absoluteReturn: Number(returns.toFixed(2)),
    cagr: Number(cagr.toFixed(2)),
    years,
  };
}

function calculateVolatility(
  navData: Array<{ date: string; nav: string }>,
  days: number = 365,
) {
  const sortedData = [...navData]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, days);

  if (sortedData.length < 2) return null;

  const returns = [];
  for (let i = 0; i < sortedData.length - 1; i++) {
    const currentNav = parseFloat(sortedData[i].nav);
    const prevNav = parseFloat(sortedData[i + 1].nav);
    returns.push((currentNav - prevNav) / prevNav);
  }

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
    returns.length;
  const stdDev = Math.sqrt(variance) * Math.sqrt(252); // Annualized

  return (stdDev * 100).toFixed(2);
}

// Use only data from 2019-01-01 onward
function filterNavDataFrom2019(navData: Array<{ date: string; nav: string }>) {
  const floor = new Date("2019-01-01").getTime();
  return navData.filter((p) => new Date(p.date).getTime() >= floor);
}

// Build monthly returns heatmap data from NAV series
function buildMonthlyReturnsHeatmap(
  navData: Array<{ date: string; nav: string }>
) {
  if (!navData?.length) {
    return {
      label: "Monthly Returns Treemap",
      data: [],
    };
  }

  // Group by YYYY-MM
  const byMonth = new Map<string, { first: number; last: number }>();
  const sorted = [...navData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  for (const p of sorted) {
    const d = new Date(p.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const nav = parseFloat(p.nav);
    if (!byMonth.has(key)) byMonth.set(key, { first: nav, last: nav });
    else byMonth.get(key)!.last = nav;
  }

  // Build treemap: group by year, each year has months as children
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const yearMap = new Map<
    number,
    Array<{
      month: string;
      return: number;
      sign: "positive" | "negative" | "zero";
    }>
  >();
  for (const [key, val] of Array.from(byMonth.entries()).sort()) {
    const [y, m] = key.split("-");
    const year = Number(y);
    const monthIdx = Number(m) - 1;
    const ret = val.first > 0 ? ((val.last - val.first) / val.first) * 100 : 0;
    let sign: "positive" | "negative" | "zero" = "zero";
    if (ret > 0) sign = "positive";
    else if (ret < 0) sign = "negative";
    const monthObj = {
      month: months[monthIdx],
      return: Number(ret.toFixed(2)),
      sign,
    };
    if (!yearMap.has(year)) yearMap.set(year, [monthObj]);
    else yearMap.get(year)!.push(monthObj);
  }

  // Convert to array for treemap
  const data: Array<{
    year: number;
    children: Array<{
      month: string;
      return: number;
      sign: "positive" | "negative" | "zero";
    }>;
  }> = [];
  for (const [year, children] of Array.from(yearMap.entries()).sort(
    (a, b) => a[0] - b[0],
  )) {
    data.push({ year, children });
  }

  return { label: "Monthly Returns Treemap", data };
}



function buildRiskRewardData(
  navData: Array<{ date: string; nav: string }>,
  returns1Y: ReturnType<typeof calculateReturns> | null,
  returns3Y: ReturnType<typeof calculateReturns> | null,
  returns5Y: ReturnType<typeof calculateReturns> | null
) {
  const risk1Y = calculateVolatility(navData, 365);
  const risk3Y = calculateVolatility(navData, 365 * 3);
  const risk5Y = calculateVolatility(navData, 365 * 5);

  const points: Array<{
    period: string;
    risk: number;
    reward: number;
    ratio: number;
  }> = [];
  if (returns1Y) {
    const risk = Number(risk1Y || 0);
    const reward = Number(returns1Y.cagr || 0);
    const ratio = risk ? Number((reward / risk).toFixed(2)) : 0;
    points.push({ period: "1Y", risk, reward, ratio });
  }
  if (returns3Y) {
    const risk = Number(risk3Y || 0);
    const reward = Number(returns3Y.cagr || 0);
    const ratio = risk ? Number((reward / risk).toFixed(2)) : 0;
    points.push({ period: "3Y", risk, reward, ratio });
  }
  if (returns5Y) {
    const risk = Number(risk5Y || 0);
    const reward = Number(returns5Y.cagr || 0);
    const ratio = risk ? Number((reward / risk).toFixed(2)) : 0;
    points.push({ period: "5Y", risk, reward, ratio });
  }

  return { label: "Risk vs Reward", data: points };
}

function analyzeMutualFundMetrics(data: MutualFundData) {
  const { meta, data: navDataAll } = data;
  const navData = filterNavDataFrom2019(navDataAll);

  const returns1Y = calculateReturns(navData, 1);
  const returns3Y = calculateReturns(navData, 3);
  const returns5Y = calculateReturns(navData, 5);
  const volatility = calculateVolatility(navData);

  const sortedData = [...navData].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const currentNav = sortedData[0]?.nav;
  const fundAge = navData.length; // Days of data available

  return {
    fundName: meta.scheme_name,
    fundHouse: meta.fund_house,
    category: meta.scheme_category,
    type: meta.scheme_type,
    currentNav: currentNav,
    returns: {
      oneYear: returns1Y,
      threeYear: returns3Y,
      fiveYear: returns5Y,
    },
    riskMetrics: {
      volatility: volatility,
      fundAge: `${Math.floor(fundAge / 365)} years`,
    },
    dataPoints: navData.length,
    graphs: {
      heatmap: buildMonthlyReturnsHeatmap(navData),
      riskReward: buildRiskRewardData(navData, returns1Y, returns3Y, returns5Y),
    },
  };
}

function summarizeGraphs(metrics: ReturnType<typeof analyzeMutualFundMetrics>) {
  // Flatten treemap to get all months
  const heatTree = metrics.graphs.heatmap.data;
  const rr = metrics.graphs.riskReward.data;
  const allMonths: Array<{ year: number; month: string; return: number }> = [];
  for (const yearObj of heatTree) {
    for (const m of yearObj.children) {
      allMonths.push({ year: yearObj.year, month: m.month, return: m.return });
    }
  }
  // Best/worst monthly since 2019
  let best: { year: number; month: string; return: number } | undefined;
  let worst: { year: number; month: string; return: number } | undefined;
  for (const m of allMonths) {
    if (!best || m.return > best.return) best = m;
    if (!worst || m.return < worst.return) worst = m;
  }
  // Average of last 12 months
  const last12 = allMonths.slice(-12);
  const avg12 =
    last12.length > 0
      ? Number(
          (
            last12.reduce(
              (s, x) => s + (Number.isFinite(x.return) ? x.return : 0),
              0,
            ) / last12.length
          ).toFixed(2),
        )
      : null;

  const rr1 = rr.find((p) => p.period === "1Y");
  const rr3 = rr.find((p) => p.period === "3Y");
  const rr5 = rr.find((p) => p.period === "5Y");

  const lines: string[] = [];
  lines.push("Charts Summary (2019+ data):");
  if (avg12 !== null || best || worst) {
    lines.push(
      `- Heatmap: avg last 12m ${avg12 ?? "N/A"}%` +
        (best ? `, best ${best.month} ${best.year} ${best.return}%` : "") +
        (worst ? `, worst ${worst.month} ${worst.year} ${worst.return}%` : ""),
    );
  } else {
    lines.push("- Heatmap: insufficient data");
  }
  const fmtRR = (p?: {
    risk: number;
    reward: number;
    ratio: number;
    period: string;
  }) =>
    p
      ? `${p.period}: reward ${p.reward}% vs risk ${p.risk}% (ratio ${p.ratio})`
      : undefined;
  const rrParts = [fmtRR(rr1), fmtRR(rr3), fmtRR(rr5)].filter(
    Boolean,
  ) as string[];
  lines.push(
    rrParts.length
      ? `- Risk/Reward: ${rrParts.join(", ")}`
      : "- Risk/Reward: insufficient data",
  );
  return lines.join("\n");
}

export async function analyzeMutualFundWithBuffett(request: MFAnalysisRequest) {
  try {
    console.log(`Fetching data for scheme code: ${request.schemeCode}...`);

    // Fetch mutual fund data
    const mfData = await fetchMutualFundData(request.schemeCode);

    if (mfData.status !== "SUCCESS") {
      throw new Error("Failed to fetch mutual fund data from API");
    }

    // Calculate key metrics
    const metrics = analyzeMutualFundMetrics(mfData);

    // Create a detailed prompt for Warren Buffett analysis
    const graphSummary = summarizeGraphs(metrics);
    const analysisPrompt = `
Analyze this Indian mutual fund from a value investing perspective:

**Fund Details:**
- Name: ${metrics.fundName}
- Fund House: ${metrics.fundHouse}
- Category: ${metrics.category}
- Type: ${metrics.type}
- Current NAV: ₹${metrics.currentNav}

**Performance Metrics:**
- 1-Year Return: ${metrics.returns.oneYear?.absoluteReturn || "N/A"}% (CAGR: ${metrics.returns.oneYear?.cagr || "N/A"}%)
- 3-Year Return: ${metrics.returns.threeYear?.absoluteReturn || "N/A"}% (CAGR: ${metrics.returns.threeYear?.cagr || "N/A"}%)
- 5-Year Return: ${metrics.returns.fiveYear?.absoluteReturn || "N/A"}% (CAGR: ${metrics.returns.fiveYear?.cagr || "N/A"}%)

**Risk Metrics:**
- Annualized Volatility: ${metrics.riskMetrics.volatility}%
- Track Record: ${metrics.riskMetrics.fundAge}
- Data Points Available: ${metrics.dataPoints}

Please provide your assessment covering:
1. Is this the kind of investment vehicle you'd consider?
2. How do the returns compare to what you'd expect from direct stock ownership?
3. What concerns do you have about mutual fund investing in general?
4. What questions would you ask about the underlying holdings?
5. Is the expense ratio and management approach aligned with shareholder interests?
6. Your overall verdict: Would this fit in a value investor's portfolio?

Remember to be honest about the limitations - you prefer owning businesses directly where you can evaluate management and moats clearly.
\n${graphSummary}
`;

    // Get Buffett's analysis
    const response = await buffettAgent.generate([
      {
        role: "user",
        content: analysisPrompt,
      },
    ]);

    // Return Markdown-formatted response
    return {
      metrics,
      analysis: response.text,
      markdown: formatMutualFundMarkdown(metrics, response.text),
      data: { meta: mfData.meta },
    };
  } catch (error) {
    console.error("Error analyzing mutual fund:", error);
    throw error;
  }
}

export async function analyzeMutualFundWithAckman(request: MFAnalysisRequest) {
  try {
    console.log(`Fetching data for scheme code: ${request.schemeCode}...`);

    const mfData = await fetchMutualFundData(request.schemeCode);
    if (mfData.status !== "SUCCESS") {
      throw new Error("Failed to fetch mutual fund data from API");
    }

    const metrics = analyzeMutualFundMetrics(mfData);

    const graphSummary = summarizeGraphs(metrics);
    const analysisPrompt = `
Analyze this Indian mutual fund with an activist, value-unlocking lens:

Fund: ${metrics.fundName}
House: ${metrics.fundHouse}
Category: ${metrics.category}
Type: ${metrics.type}
Current NAV: ₹${metrics.currentNav}

Performance (CAGR if available):
- 1Y: ${metrics.returns.oneYear?.cagr ?? "N/A"}%
- 3Y: ${metrics.returns.threeYear?.cagr ?? "N/A"}%
- 5Y: ${metrics.returns.fiveYear?.cagr ?? "N/A"}%

Risk:
- Volatility: ${metrics.riskMetrics.volatility}%
- Track record: ${metrics.riskMetrics.fundAge}

Provide:
1) Activist view: any structural inefficiencies or fees to cut?
2) Expected return profile vs owning a concentrated basket of high-quality equities
3) Risks and downside scenarios
4) Verdict for a concentrated, activist-style portfolio.
\n${graphSummary}
`;

    const response = await ackmanAgent.generate([
      { role: "user", content: analysisPrompt },
    ]);

    // Return Markdown-formatted response
    return {
      metrics,
      analysis: response.text,
      markdown: formatMutualFundMarkdown(metrics, response.text),
      data: { meta: mfData.meta },
    };
  } catch (error) {
    console.error("Error analyzing mutual fund (Ackman):", error);
    throw error;
  }
}

// Example usage (uncomment to run locally)
// async function main() {
//   const result = await analyzeMutualFundWithBuffett({ schemeCode: 119132 });
//   console.log("\n=== Analysis Complete ===", result.metrics);
// }
// main();
