import mongoose, { Schema, Document } from "mongoose";

export interface IStockSummary extends Document {
  symbol: string;
  timeframe: string;
  truthSummary: string;
  createdAt: Date;
}

const StockSummarySchema = new Schema<IStockSummary>({
  symbol: { type: String, required: true },
  timeframe: { type: String, required: true },
  truthSummary: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const StockSummaryModel = mongoose.model<IStockSummary>(
  "StockSummary",
  StockSummarySchema,
);
