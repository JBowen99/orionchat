import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { getModelById, getGoogleModelName, type ModelConfig } from "~/lib/models";
import type { Provider } from "~/contexts/api-keys-context";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  metadata?: {
    model: string;
    temperature?: number;
    finishReason?: string;
    modelType?: string;
  };
}

export interface StreamingChatResponse {
  content: string;
  delta?: string;
  model: string;
  finished?: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  metadata?: {
    model: string;
    temperature?: number;
    finishReason?: string;
    modelType?: string;
  };
}

export class ChatService {
  /**
   * Generate chat completion
   */
  async generateChatCompletion(
    request: ChatRequest,
    apiKeys: Record<Provider, string | null>
  ): Promise<ChatResponse> {
    const model = getModelById(request.model);
    if (!model) {
      throw new Error(`Model ${request.model} not found`);
    }

    const apiKey = apiKeys[model.provider];
    if (!apiKey) {
      throw new Error(
        `No API key found for provider: ${model.provider}. Please add an API key in Settings.`
      );
    }

    try {
      switch (model.provider) {
        case "openai":
          return await this.callOpenAI(model, request, apiKey);
        case "anthropic":
          return await this.callAnthropic(model, request, apiKey);
        case "google":
          return await this.callGoogle(model, request, apiKey);
        case "deepseek":
          return await this.callDeepSeek(model, request, apiKey);
        default:
          throw new Error(`Unsupported provider: ${model.provider}`);
      }
    } catch (error) {
      console.error(`Error calling ${model.name}:`, error);
      throw new Error(
        `Failed to get response from ${model.name}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate streaming chat completion
   */
  async *generateStreamingChatCompletion(
    request: ChatRequest,
    apiKeys: Record<Provider, string | null>
  ): AsyncGenerator<StreamingChatResponse, void, unknown> {
    const model = getModelById(request.model);
    if (!model) {
      throw new Error(`Model ${request.model} not found`);
    }

    const apiKey = apiKeys[model.provider];
    if (!apiKey) {
      throw new Error(
        `No API key found for provider: ${model.provider}. Please add an API key in Settings.`
      );
    }

    try {
      switch (model.provider) {
        case "openai":
          yield* this.callOpenAIStreaming(model, request, apiKey);
          break;
        case "anthropic":
          yield* this.callAnthropicStreaming(model, request, apiKey);
          break;
        case "google":
          yield* this.callGoogleStreaming(model, request, apiKey);
          break;
        case "deepseek":
          yield* this.callDeepSeekStreaming(model, request, apiKey);
          break;
        default:
          // Fallback to non-streaming for unsupported providers
          const response = await this.generateChatCompletion(request, apiKeys);
          yield {
            content: response.content,
            model: response.model,
            finished: true,
            usage: response.usage,
            metadata: response.metadata,
          };
          break;
      }
    } catch (error) {
      console.error(`Error calling streaming ${model.name}:`, error);
      throw new Error(
        `Failed to get streaming response from ${model.name}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * OpenAI API implementation
   */
  private async callOpenAI(
    model: ModelConfig,
    request: ChatRequest,
    apiKey: string
  ): Promise<ChatResponse> {
    const openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
    });

    const messages = request.messages.map((msg) => ({
      role: msg.role as "system" | "user" | "assistant",
      content: msg.content,
    }));

    const completion = await openai.chat.completions.create({
      model: model.id,
      messages: messages,
      temperature: request.temperature || model.temperature || 0.7,
      max_tokens: request.maxTokens || model.maxTokens || 4096,
      stream: false,
    });

    const chatCompletion = completion as OpenAI.Chat.Completions.ChatCompletion;
    const choice = chatCompletion.choices[0];
    
    if (!choice?.message?.content) {
      throw new Error("No response content received from OpenAI API");
    }

    const usage = chatCompletion.usage
      ? {
          inputTokens: chatCompletion.usage.prompt_tokens || 0,
          outputTokens: chatCompletion.usage.completion_tokens || 0,
        }
      : undefined;

    return {
      content: choice.message.content,
      model: model.id,
      usage,
      metadata: {
        model: model.id,
        temperature: request.temperature || model.temperature,
        finishReason: choice.finish_reason,
        modelType: this.getModelType(model.id),
      },
    };
  }

  /**
   * OpenAI streaming implementation
   */
  private async *callOpenAIStreaming(
    model: ModelConfig,
    request: ChatRequest,
    apiKey: string
  ): AsyncGenerator<StreamingChatResponse, void, unknown> {
    const openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
    });

    const messages = request.messages.map((msg) => ({
      role: msg.role as "system" | "user" | "assistant",
      content: msg.content,
    }));

    // Special handling for reasoning models (O-series) - they don't support streaming
    if (model.id.startsWith("o1") || model.id.startsWith("o3") || model.id.startsWith("o4")) {
      const completion = await openai.chat.completions.create({
        model: model.id,
        messages: messages,
        temperature: request.temperature || model.temperature || 0.7,
        max_tokens: request.maxTokens || model.maxTokens || 8192,
        stream: false,
      });

      const chatCompletion = completion as OpenAI.Chat.Completions.ChatCompletion;
      const choice = chatCompletion.choices[0];

      if (!choice?.message?.content) {
        throw new Error("No response content received from OpenAI API");
      }

      const usage = chatCompletion.usage
        ? {
            inputTokens: chatCompletion.usage.prompt_tokens || 0,
            outputTokens: chatCompletion.usage.completion_tokens || 0,
          }
        : undefined;

      yield {
        content: choice.message.content,
        model: model.id,
        finished: true,
        usage,
        metadata: {
          model: model.id,
          temperature: request.temperature || model.temperature,
          finishReason: choice.finish_reason,
          modelType: this.getModelType(model.id),
        },
      };
      return;
    }

    const stream = (await openai.chat.completions.create({
      model: model.id,
      messages: messages,
      temperature: request.temperature || model.temperature || 0.7,
      max_tokens: request.maxTokens || model.maxTokens || 4096,
      stream: true,
    })) as unknown as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;

    let fullContent = "";
    let totalUsage: { inputTokens: number; outputTokens: number } | undefined;

    for await (const chunk of stream) {
      const choice = chunk.choices[0];

      if (choice?.delta?.content) {
        const delta = choice.delta.content;
        fullContent += delta;

        yield {
          content: fullContent,
          delta: delta,
          model: model.id,
          finished: false,
          metadata: {
            model: model.id,
            temperature: request.temperature || model.temperature,
            modelType: this.getModelType(model.id),
          },
        };
      }

      if (choice?.finish_reason) {
        if (chunk.usage) {
          totalUsage = {
            inputTokens: chunk.usage.prompt_tokens || 0,
            outputTokens: chunk.usage.completion_tokens || 0,
          };
        }

        yield {
          content: fullContent,
          model: model.id,
          finished: true,
          usage: totalUsage,
          metadata: {
            model: model.id,
            temperature: request.temperature || model.temperature,
            finishReason: choice.finish_reason,
            modelType: this.getModelType(model.id),
          },
        };
      }
    }
  }

  /**
   * Anthropic API implementation
   */
  private async callAnthropic(
    model: ModelConfig,
    request: ChatRequest,
    apiKey: string
  ): Promise<ChatResponse> {
    const anthropic = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
    });

    const { system, messages } = this.convertMessagesToAnthropicFormat(request.messages);

    const message = await anthropic.messages.create({
      model: model.id,
      max_tokens: request.maxTokens || model.maxTokens || 4096,
      temperature: request.temperature || model.temperature || 0.7,
      system: system,
      messages: messages,
    });

    const content = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    if (!content) {
      throw new Error("No response content received from Anthropic API");
    }

    const usage = message.usage
      ? {
          inputTokens: message.usage.input_tokens || 0,
          outputTokens: message.usage.output_tokens || 0,
        }
      : undefined;

    return {
      content: content,
      model: model.id,
      usage,
      metadata: {
        model: model.id,
        temperature: request.temperature || model.temperature,
        finishReason: message.stop_reason || undefined,
      },
    };
  }

  /**
   * Anthropic streaming implementation
   */
  private async *callAnthropicStreaming(
    model: ModelConfig,
    request: ChatRequest,
    apiKey: string
  ): AsyncGenerator<StreamingChatResponse, void, unknown> {
    const anthropic = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
    });

    const { system, messages } = this.convertMessagesToAnthropicFormat(request.messages);

    const stream = await anthropic.messages.create({
      model: model.id,
      max_tokens: request.maxTokens || model.maxTokens || 4096,
      temperature: request.temperature || model.temperature || 0.7,
      system: system,
      messages: messages,
      stream: true,
    });

    let fullContent = "";
    let totalUsage: { inputTokens: number; outputTokens: number } | undefined;

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta?.type === "text_delta") {
        const delta = chunk.delta.text;
        fullContent += delta;

        yield {
          content: fullContent,
          delta: delta,
          model: model.id,
          finished: false,
          metadata: {
            model: model.id,
            temperature: request.temperature || model.temperature,
          },
        };
      }

      if (chunk.type === "message_stop") {
        yield {
          content: fullContent,
          model: model.id,
          finished: true,
          usage: totalUsage,
          metadata: {
            model: model.id,
            temperature: request.temperature || model.temperature,
          },
        };
      }

      if (chunk.type === "message_start" && chunk.message?.usage) {
        totalUsage = {
          inputTokens: chunk.message.usage.input_tokens || 0,
          outputTokens: chunk.message.usage.output_tokens || 0,
        };
      }
    }
  }

  /**
   * Google API implementation
   */
  private async callGoogle(
    model: ModelConfig,
    request: ChatRequest,
    apiKey: string
  ): Promise<ChatResponse> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const googleModelName = getGoogleModelName(model.id);
    const googleModel = genAI.getGenerativeModel({ model: googleModelName });

    const { systemInstruction, contents } = this.convertMessagesToGoogleFormat(request.messages);

    const generationConfig = {
      temperature: request.temperature || model.temperature || 0.7,
      maxOutputTokens: request.maxTokens || model.maxTokens || 8192,
    };

    const result = await googleModel.generateContent({
      contents,
      systemInstruction,
      generationConfig,
    });

    const response = await result.response;
    const text = response.text();

    const usage = response.usageMetadata
      ? {
          inputTokens: response.usageMetadata.promptTokenCount || 0,
          outputTokens: response.usageMetadata.candidatesTokenCount || 0,
        }
      : undefined;

    return {
      content: text,
      model: model.id,
      usage,
      metadata: {
        model: model.id,
        temperature: request.temperature || model.temperature,
        finishReason: response.candidates?.[0]?.finishReason,
      },
    };
  }

  /**
   * Google streaming implementation
   */
  private async *callGoogleStreaming(
    model: ModelConfig,
    request: ChatRequest,
    apiKey: string
  ): AsyncGenerator<StreamingChatResponse, void, unknown> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const googleModelName = getGoogleModelName(model.id);
    const googleModel = genAI.getGenerativeModel({ model: googleModelName });

    const { systemInstruction, contents } = this.convertMessagesToGoogleFormat(request.messages);

    const generationConfig = {
      temperature: request.temperature || model.temperature || 0.7,
      maxOutputTokens: request.maxTokens || model.maxTokens || 8192,
    };

    const result = await googleModel.generateContentStream({
      contents,
      systemInstruction,
      generationConfig,
    });

    let fullContent = "";
    let totalUsage: { inputTokens: number; outputTokens: number } | undefined;

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        fullContent += chunkText;

        yield {
          content: fullContent,
          delta: chunkText,
          model: model.id,
          finished: false,
          metadata: {
            model: model.id,
            temperature: request.temperature || model.temperature,
          },
        };
      }
    }

    const finalResponse = await result.response;

    if (finalResponse.usageMetadata) {
      totalUsage = {
        inputTokens: finalResponse.usageMetadata.promptTokenCount || 0,
        outputTokens: finalResponse.usageMetadata.candidatesTokenCount || 0,
      };
    }

    yield {
      content: fullContent,
      model: model.id,
      finished: true,
      usage: totalUsage,
      metadata: {
        model: model.id,
        temperature: request.temperature || model.temperature,
        finishReason: finalResponse.candidates?.[0]?.finishReason,
      },
    };
  }

  /**
   * DeepSeek API implementation
   */
  private async callDeepSeek(
    model: ModelConfig,
    request: ChatRequest,
    apiKey: string
  ): Promise<ChatResponse> {
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://api.deepseek.com",
      dangerouslyAllowBrowser: true,
    });

    const messages = request.messages.map((msg) => ({
      role: msg.role as "system" | "user" | "assistant",
      content: msg.content,
    }));

    const completion = await openai.chat.completions.create({
      model: model.id,
      messages: messages,
      temperature: request.temperature || model.temperature || 0.7,
      max_tokens: request.maxTokens || model.maxTokens || 8192,
      stream: false,
    });

    const chatCompletion = completion as OpenAI.Chat.Completions.ChatCompletion;
    const choice = chatCompletion.choices[0];

    if (!choice?.message?.content) {
      throw new Error("No response content received from DeepSeek API");
    }

    const usage = chatCompletion.usage
      ? {
          inputTokens: chatCompletion.usage.prompt_tokens || 0,
          outputTokens: chatCompletion.usage.completion_tokens || 0,
        }
      : undefined;

    return {
      content: choice.message.content,
      model: model.id,
      usage,
      metadata: {
        model: model.id,
        temperature: request.temperature || model.temperature,
        finishReason: choice.finish_reason,
      },
    };
  }

  /**
   * DeepSeek streaming implementation
   */
  private async *callDeepSeekStreaming(
    model: ModelConfig,
    request: ChatRequest,
    apiKey: string
  ): AsyncGenerator<StreamingChatResponse, void, unknown> {
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://api.deepseek.com",
      dangerouslyAllowBrowser: true,
    });

    const messages = request.messages.map((msg) => ({
      role: msg.role as "system" | "user" | "assistant",
      content: msg.content,
    }));

    const stream = await openai.chat.completions.create({
      model: model.id,
      messages: messages,
      temperature: request.temperature || model.temperature || 0.7,
      max_tokens: request.maxTokens || model.maxTokens || 8192,
      stream: true,
    });

    let fullContent = "";
    let totalUsage: { inputTokens: number; outputTokens: number } | undefined;

    for await (const chunk of stream) {
      const choice = chunk.choices[0];

      if (choice?.delta?.content) {
        const delta = choice.delta.content;
        fullContent += delta;

        yield {
          content: fullContent,
          delta: delta,
          model: model.id,
          finished: false,
          metadata: {
            model: model.id,
            temperature: request.temperature || model.temperature,
          },
        };
      }

      if (choice?.finish_reason) {
        if (chunk.usage) {
          totalUsage = {
            inputTokens: chunk.usage.prompt_tokens || 0,
            outputTokens: chunk.usage.completion_tokens || 0,
          };
        }

        yield {
          content: fullContent,
          model: model.id,
          finished: true,
          usage: totalUsage,
          metadata: {
            model: model.id,
            temperature: request.temperature || model.temperature,
            finishReason: choice.finish_reason,
          },
        };
      }
    }
  }

  /**
   * Helper method to determine model type for metadata
   */
  private getModelType(modelId: string): string {
    if (modelId.startsWith("o1") || modelId.startsWith("o3") || modelId.startsWith("o4")) {
      return "reasoning";
    }
    if (modelId.includes("audio")) {
      return "audio";
    }
    if (modelId.includes("search")) {
      return "search";
    }
    if (modelId.includes("realtime")) {
      return "realtime";
    }
    if (modelId.includes("4.5")) {
      return "advanced";
    }
    if (modelId.includes("4.1")) {
      return "latest";
    }
    if (modelId.includes("4o")) {
      return "multimodal";
    }
    if (modelId.includes("gpt-4")) {
      return "flagship";
    }
    if (modelId.includes("3.5")) {
      return "efficient";
    }
    return "standard";
  }

  /**
   * Convert messages to Google format
   */
  private convertMessagesToGoogleFormat(messages: ChatMessage[]) {
    let systemInstruction: string | undefined;
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

    for (const message of messages) {
      if (message.role === "system") {
        systemInstruction = message.content;
      } else if (message.role === "user") {
        contents.push({
          role: "user",
          parts: [{ text: message.content }],
        });
      } else if (message.role === "assistant") {
        contents.push({
          role: "model",
          parts: [{ text: message.content }],
        });
      }
    }

    return { systemInstruction, contents };
  }

  /**
   * Convert messages to Anthropic format
   */
  private convertMessagesToAnthropicFormat(messages: ChatMessage[]) {
    let system: string | undefined;
    const anthropicMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

    for (const message of messages) {
      if (message.role === "system") {
        system = message.content;
      } else if (message.role === "user" || message.role === "assistant") {
        anthropicMessages.push({
          role: message.role,
          content: message.content,
        });
      }
    }

    return { system, messages: anthropicMessages };
  }
}

export const chatService = new ChatService(); 