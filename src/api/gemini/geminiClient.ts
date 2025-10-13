import { ENV } from "../../utils/env.js";

/** Minimal stub client for Gemini API */
export class GeminiClient {
  constructor(private apiKey: string = ENV.GEMINI_KEY) {}

  async summarize(prompt: string): Promise<string> {
    // TODO: Replace stub with real HTTP call
    return `Gemini summary: ${prompt.substring(0, 100)}...`;
  }
}
