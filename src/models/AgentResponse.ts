import mongoose, { Schema, Document } from "mongoose";

export interface IAgentResponse extends Document {
  agentName: string;
  output: unknown;
  confidence: number;
  timestamp: Date;
}

const AgentResponseSchema = new Schema<IAgentResponse>({
  agentName: { type: String, required: true },
  output: { type: Schema.Types.Mixed, required: true },
  confidence: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

export const AgentResponseModel = mongoose.model<IAgentResponse>(
  "AgentResponse",
  AgentResponseSchema,
);
