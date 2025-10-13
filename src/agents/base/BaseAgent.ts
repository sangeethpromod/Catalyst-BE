/**
 * Base class for Mastra-style agents.
 */
export abstract class BaseAgent {
  constructor(protected name: string) {}
  abstract analyze(input: any): Promise<any>;
}
