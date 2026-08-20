import type { LLMRequest, LLMResponse, ProviderName } from "@nusantara/core";

export abstract class BaseLLMProvider {
  abstract readonly name: ProviderName;

  protected abstract fetchLLM(request: LLMRequest): Promise<LLMResponse>;

  async generateLLM(request: LLMRequest): Promise<LLMResponse> {
    this.validateRequest(request);
    return this.fetchLLM(request);
  }

  protected validateRequest(request: LLMRequest): void {
    if (!request.message?.trim()) {
      throw new Error("Message is required");
    }
  }
}
