import mongoose, { Schema, Document } from "mongoose";

export interface IStockAnalysis extends Document {
  symbol: string;
  timeframe: string;
  fundamental: unknown;
  technical: unknown;
  risk: unknown;
  personalities: Record<string, unknown>;
  truthSummary: string;
  graphData?: unknown;
  createdAt: Date;
}

const StockAnalysisSchema = new Schema<IStockAnalysis>({
  symbol: { type: String, required: true },
  timeframe: { type: String, required: true },
  fundamental: { type: Schema.Types.Mixed },
  technical: { type: Schema.Types.Mixed },
  risk: { type: Schema.Types.Mixed },
  personalities: { type: Schema.Types.Mixed },
  truthSummary: { type: String },
  graphData: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

export const StockAnalysisModel = mongoose.model<IStockAnalysis>(
  "StockAnalysis",
  StockAnalysisSchema,
);
