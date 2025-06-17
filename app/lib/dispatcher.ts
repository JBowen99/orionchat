import type { MessageMetadata } from "~/services/chat.service";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { ALL_MODELS, getModelById, getGoogleModelName, type ModelConfig } from "./models";

export interface DispatchRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  // System prompt should be included in messages array
  systemPrompt?: string; // Deprecated - use messages array instead
  userContext?: any;
  toolsInfo?: any;
}

export interface DispatchResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  metadata?: MessageMetadata;
}

export interface StreamingDispatchResponse {
  content: string;
  delta?: string;
  model: string;
  finished?: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  metadata?: MessageMetadata;
}

// API Keys interface for integration with settings
export interface ApiKeysProvider {
  getApiKey: (provider: string) => { key: string; id: string } | undefined;
  markAsUsed: (id: string) => void;
}

class Dispatcher {
  private models: Map<string, ModelConfig> = new Map();
  private apiKeysProvider: ApiKeysProvider | null = null;

  constructor() {
    // Initialize with all available models
    ALL_MODELS.forEach((model) => {
      this.models.set(model.id, model);
    });
  }

  /**
   * Set the API keys provider for accessing stored API keys
   */
  setApiKeysProvider(provider: ApiKeysProvider): void {
    this.apiKeysProvider = provider;
  }

  /**
   * Get API key for a provider
   */
  private getApiKeyForProvider(provider: string): string | null {
    if (!this.apiKeysProvider) {
      return null;
    }

    const apiKeyData = this.apiKeysProvider.getApiKey(provider);
    if (apiKeyData) {
      // Mark the key as used
      this.apiKeysProvider.markAsUsed(apiKeyData.id);
      return apiKeyData.key;
    }

    return null;
  }

  /**
   * Register a new model configuration
   */
  registerModel(config: ModelConfig): void {
    this.models.set(config.id, config);
  }

  /**
   * Get available models
   */
  getAvailableModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  /**
   * Get model configuration by ID
   */
  getModel(modelId: string): ModelConfig | undefined {
    return this.models.get(modelId);
  }

  /**
   * Main dispatch method - routes request to appropriate model API
   */
  async dispatch(request: DispatchRequest): Promise<DispatchResponse> {
    const model = this.getModel(request.model);
    if (!model) {
      throw new Error(`Model ${request.model} not found`);
    }

    // Get API key for the model's provider
    const apiKey = this.getApiKeyForProvider(model.provider);
    if (!apiKey) {
      throw new Error(`No API key found for provider: ${model.provider}. Please add an API key in Settings.`);
    }

    // Use messages as-is - system prompt should already be included
    const processedMessages = this.processMessageHistory(request.messages);

    try {
      switch (model.provider) {
        case "openai":
          return await this.callOpenAI(model, { ...request, messages: processedMessages }, apiKey);
        case "anthropic":
          return await this.callAnthropic(model, { ...request, messages: processedMessages }, apiKey);
        case "google":
          return await this.callGoogle(model, { ...request, messages: processedMessages }, apiKey);
        case "mistral":
          return await this.callMistral(model, { ...request, messages: processedMessages }, apiKey);
        case "deepseek":
          return await this.callDeepSeek(model, { ...request, messages: processedMessages }, apiKey);
        case "custom":
          return await this.callCustom(model, { ...request, messages: processedMessages }, apiKey);
        default:
          throw new Error(`Unsupported provider: ${model.provider}`);
      }
    } catch (error) {
      console.error(`Error dispatching to ${model.name}:`, error);
      throw new Error(
        `Failed to get response from ${model.name}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Main streaming dispatch method - routes streaming request to appropriate model API
   */
  async *dispatchStreaming(request: DispatchRequest): AsyncGenerator<StreamingDispatchResponse, void, unknown> {
    const model = this.getModel(request.model);
    if (!model) {
      throw new Error(`Model ${request.model} not found`);
    }

    // Get API key for the model's provider
    const apiKey = this.getApiKeyForProvider(model.provider);
    if (!apiKey) {
      throw new Error(`No API key found for provider: ${model.provider}. Please add an API key in Settings.`);
    }

    // Use messages as-is - system prompt should already be included
    const processedMessages = this.processMessageHistory(request.messages);
    const requestWithProcessedMessages = { ...request, messages: processedMessages, stream: true };

    try {
      switch (model.provider) {
        case "openai":
          yield* this.callOpenAIStreaming(model, requestWithProcessedMessages, apiKey);
          break;
        case "anthropic":
          yield* this.callAnthropicStreaming(model, requestWithProcessedMessages, apiKey);
          break;
        case "google":
          yield* this.callGoogleStreaming(model, requestWithProcessedMessages, apiKey);
          break;
        case "deepseek":
          yield* this.callDeepSeekStreaming(model, requestWithProcessedMessages, apiKey);
          break;
        default:
          // Fallback to non-streaming for unsupported providers
          const response = await this.dispatch(requestWithProcessedMessages);
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
      console.error(`Error dispatching streaming to ${model.name}:`, error);
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
    request: DispatchRequest,
    apiKey: string
  ): Promise<DispatchResponse> {
    try {
      const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
      });

      // Convert our messages to OpenAI format
      const messages = request.messages.map(msg => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
      }));

      // Determine appropriate max_tokens based on model type
      const getMaxTokens = () => {
        // O-series reasoning models typically need more tokens
        if (model.id.startsWith('o1') || model.id.startsWith('o3') || model.id.startsWith('o4')) {
          return request.maxTokens || model.maxTokens || 8192;
        }
        // GPT-4.5 and other advanced models
        if (model.id.includes('4.5') || model.id.includes('4.1')) {
          return request.maxTokens || model.maxTokens || 4096;
        }
        // Default for other models
        return request.maxTokens || model.maxTokens || 4096;
      };

      // Prepare API call parameters
      const apiParams: any = {
        model: model.id,
        messages: messages,
        temperature: request.temperature || model.temperature || 0.7,
        max_tokens: getMaxTokens(),
        stream: false, // Explicitly set to false to get non-stream response
      };

      // Special handling for reasoning models (O-series)
      if (model.id.startsWith('o1') || model.id.startsWith('o3') || model.id.startsWith('o4')) {
        // Reasoning models often work better with specific temperature settings
        apiParams.temperature = Math.min(apiParams.temperature, 1.0);
      }

      // Make the API call
      const completion = await openai.chat.completions.create(apiParams);

      // Type assertion since we know stream is false
      const chatCompletion = completion as OpenAI.Chat.Completions.ChatCompletion;
      
      const choice = chatCompletion.choices[0];
      if (!choice?.message?.content) {
        throw new Error("No response content received from OpenAI API");
      }

      // Extract usage information
      const usage = chatCompletion.usage ? {
        inputTokens: chatCompletion.usage.prompt_tokens || 0,
        outputTokens: chatCompletion.usage.completion_tokens || 0,
      } : undefined;

      return {
        content: choice.message.content,
        model: model.id,
        usage,
        metadata: {
          model: model.id,
          temperature: apiParams.temperature,
          finishReason: choice.finish_reason,
          // Add model-specific metadata
          modelType: this.getModelType(model.id),
        },
      };
    } catch (error) {
      console.error("OpenAI API error:", error);
      
      // Enhanced error handling with specific error types
      if (error instanceof Error) {
        // Handle specific OpenAI API errors
        if (error.message.includes('insufficient_quota')) {
          throw new Error(`OpenAI API quota exceeded. Please check your billing and usage limits.`);
        }
        if (error.message.includes('invalid_api_key')) {
          throw new Error(`Invalid OpenAI API key. Please check your API key in Settings.`);
        }
        if (error.message.includes('model_not_found')) {
          throw new Error(`Model ${model.id} not found or not accessible with your API key.`);
        }
        if (error.message.includes('rate_limit_exceeded')) {
          throw new Error(`OpenAI API rate limit exceeded. Please try again in a moment.`);
        }
        if (error.message.includes('context_length_exceeded')) {
          throw new Error(`Message too long for ${model.name}. Please reduce the message length.`);
        }
      }
      
      throw new Error(
        `OpenAI API error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * OpenAI streaming API implementation
   */
  private async *callOpenAIStreaming(
    model: ModelConfig,
    request: DispatchRequest,
    apiKey: string
  ): AsyncGenerator<StreamingDispatchResponse, void, unknown> {
    try {
      const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
      });

      // Convert our messages to OpenAI format
      const messages = request.messages.map(msg => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
      }));

      // Determine appropriate max_tokens based on model type
      const getMaxTokens = () => {
        // O-series reasoning models typically need more tokens
        if (model.id.startsWith('o1') || model.id.startsWith('o3') || model.id.startsWith('o4')) {
          return request.maxTokens || model.maxTokens || 8192;
        }
        // GPT-4.5 and other advanced models
        if (model.id.includes('4.5') || model.id.includes('4.1')) {
          return request.maxTokens || model.maxTokens || 4096;
        }
        // Default for other models
        return request.maxTokens || model.maxTokens || 4096;
      };

      // Prepare API call parameters
      const apiParams: any = {
        model: model.id,
        messages: messages,
        temperature: request.temperature || model.temperature || 0.7,
        max_tokens: getMaxTokens(),
        stream: true, // Enable streaming
      };

      // Special handling for reasoning models (O-series) - they don't support streaming
      if (model.id.startsWith('o1') || model.id.startsWith('o3') || model.id.startsWith('o4')) {
        // Fallback to non-streaming for reasoning models
        apiParams.stream = false;
        const completion = await openai.chat.completions.create(apiParams);
        const chatCompletion = completion as OpenAI.Chat.Completions.ChatCompletion;
        const choice = chatCompletion.choices[0];
        
        if (!choice?.message?.content) {
          throw new Error("No response content received from OpenAI API");
        }

        const usage = chatCompletion.usage ? {
          inputTokens: chatCompletion.usage.prompt_tokens || 0,
          outputTokens: chatCompletion.usage.completion_tokens || 0,
        } : undefined;

        yield {
          content: choice.message.content,
          model: model.id,
          finished: true,
          usage,
          metadata: {
            model: model.id,
            temperature: apiParams.temperature,
            finishReason: choice.finish_reason,
            modelType: this.getModelType(model.id),
          },
        };
        return;
      }

      // Make the streaming API call
      const stream = (await openai.chat.completions.create(apiParams) as unknown) as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
      
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
              temperature: apiParams.temperature,
              modelType: this.getModelType(model.id),
            },
          };
        }

        // Handle final chunk with usage information
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
              temperature: apiParams.temperature,
              finishReason: choice.finish_reason,
              modelType: this.getModelType(model.id),
            },
          };
        }
      }
    } catch (error) {
      console.error("OpenAI streaming API error:", error);
      
      // Enhanced error handling with specific error types
      if (error instanceof Error) {
        if (error.message.includes('insufficient_quota')) {
          throw new Error(`OpenAI API quota exceeded. Please check your billing and usage limits.`);
        }
        if (error.message.includes('invalid_api_key')) {
          throw new Error(`Invalid OpenAI API key. Please check your API key in Settings.`);
        }
        if (error.message.includes('model_not_found')) {
          throw new Error(`Model ${model.id} not found or not accessible with your API key.`);
        }
        if (error.message.includes('rate_limit_exceeded')) {
          throw new Error(`OpenAI API rate limit exceeded. Please try again in a moment.`);
        }
        if (error.message.includes('context_length_exceeded')) {
          throw new Error(`Message too long for ${model.name}. Please reduce the message length.`);
        }
      }
      
      throw new Error(
        `OpenAI streaming API error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Helper method to determine model type for metadata
   */
  private getModelType(modelId: string): string {
    if (modelId.startsWith('o1') || modelId.startsWith('o3') || modelId.startsWith('o4')) {
      return 'reasoning';
    }
    if (modelId.includes('audio')) {
      return 'audio';
    }
    if (modelId.includes('search')) {
      return 'search';
    }
    if (modelId.includes('realtime')) {
      return 'realtime';
    }
    if (modelId.includes('4.5')) {
      return 'advanced';
    }
    if (modelId.includes('4.1')) {
      return 'latest';
    }
    if (modelId.includes('4o')) {
      return 'multimodal';
    }
    if (modelId.includes('gpt-4')) {
      return 'flagship';
    }
    if (modelId.includes('3.5')) {
      return 'efficient';
    }
    return 'standard';
  }

  /**
   * Anthropic API implementation
   */
  private async callAnthropic(
    model: ModelConfig,
    request: DispatchRequest,
    apiKey: string
  ): Promise<DispatchResponse> {
    try {
      const anthropic = new Anthropic({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
      });

      // Convert our messages to Anthropic format
      const { system, messages } = this.convertMessagesToAnthropicFormat(request.messages);

      // Make the API call
      const message = await anthropic.messages.create({
        model: model.id,
        max_tokens: request.maxTokens || model.maxTokens || 4096,
        temperature: request.temperature || model.temperature || 0.7,
        system: system,
        messages: messages,
      });

      // Extract the content from the response
      const content = message.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('');

      if (!content) {
        throw new Error("No response content received from Anthropic API");
      }

      // Extract usage information
      const usage = message.usage ? {
        inputTokens: message.usage.input_tokens || 0,
        outputTokens: message.usage.output_tokens || 0,
      } : undefined;

      return {
        content: content,
        model: model.id,
        usage,
        metadata: {
          model: model.id,
          temperature: request.temperature || model.temperature,
          finishReason: message.stop_reason,
        },
      };
    } catch (error) {
      console.error("Anthropic API error:", error);
      throw new Error(
        `Anthropic API error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Anthropic streaming API implementation
   */
  private async *callAnthropicStreaming(
    model: ModelConfig,
    request: DispatchRequest,
    apiKey: string
  ): AsyncGenerator<StreamingDispatchResponse, void, unknown> {
    try {
      const anthropic = new Anthropic({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
      });

      // Convert our messages to Anthropic format
      const { system, messages } = this.convertMessagesToAnthropicFormat(request.messages);

      // Make the streaming API call
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
        if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
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

        if (chunk.type === 'message_stop') {
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

        // Handle usage information
        if (chunk.type === 'message_start' && chunk.message?.usage) {
          totalUsage = {
            inputTokens: chunk.message.usage.input_tokens || 0,
            outputTokens: chunk.message.usage.output_tokens || 0,
          };
        }
      }
    } catch (error) {
      console.error("Anthropic streaming API error:", error);
      throw new Error(
        `Anthropic streaming API error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Google API implementation
   */
  private async callGoogle(
    model: ModelConfig,
    request: DispatchRequest,
    apiKey: string
  ): Promise<DispatchResponse> {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Map model ID to Google model name using centralized function
      const googleModelName = getGoogleModelName(model.id);
      const googleModel = genAI.getGenerativeModel({ model: googleModelName });

      // Convert messages to Google format
      const { systemInstruction, contents } = this.convertMessagesToGoogleFormat(request.messages);

      // Configure generation parameters
      const generationConfig = {
        temperature: request.temperature || model.temperature || 0.7,
        maxOutputTokens: request.maxTokens || model.maxTokens || 8192,
      };

      // Generate response
      const result = await googleModel.generateContent({
        contents,
        systemInstruction,
        generationConfig,
      });

      const response = await result.response;
      const text = response.text();

      // Extract usage information if available
      const usage = response.usageMetadata ? {
        inputTokens: response.usageMetadata.promptTokenCount || 0,
        outputTokens: response.usageMetadata.candidatesTokenCount || 0,
      } : undefined;

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
    } catch (error) {
      console.error("Google API error:", error);
      throw new Error(
        `Google API error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Google streaming API implementation
   */
  private async *callGoogleStreaming(
    model: ModelConfig,
    request: DispatchRequest,
    apiKey: string
  ): AsyncGenerator<StreamingDispatchResponse, void, unknown> {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Map model ID to Google model name using centralized function
      const googleModelName = getGoogleModelName(model.id);
      const googleModel = genAI.getGenerativeModel({ model: googleModelName });

      // Convert messages to Google format
      const { systemInstruction, contents } = this.convertMessagesToGoogleFormat(request.messages);

      // Configure generation parameters
      const generationConfig = {
        temperature: request.temperature || model.temperature || 0.7,
        maxOutputTokens: request.maxTokens || model.maxTokens || 8192,
      };

      // Generate streaming response
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
      
      // Extract usage information if available
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
    } catch (error) {
      console.error("Google streaming API error:", error);
      throw new Error(
        `Google streaming API error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Mistral API implementation
   */
  private async callMistral(
    model: ModelConfig,
    request: DispatchRequest,
    apiKey: string
  ): Promise<DispatchResponse> {
    // TODO: Implement Mistral API call
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API delay
    
    return {
      content: `Mock response from ${model.name}: ${request.messages[request.messages.length - 1]?.content}`,
      model: model.id,
      usage: {
        inputTokens: 110,
        outputTokens: 55,
      },
      metadata: {
        model: model.id,
        temperature: request.temperature || model.temperature,
      },
    };
  }

  /**
   * DeepSeek API implementation
   */
  private async callDeepSeek(
    model: ModelConfig,
    request: DispatchRequest,
    apiKey: string
  ): Promise<DispatchResponse> {
    try {
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: "https://api.deepseek.com",
        dangerouslyAllowBrowser: true,
      });

      // Convert our messages to OpenAI format
      const messages = request.messages.map(msg => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
      }));

      // Make the API call
      const completion = await openai.chat.completions.create({
        model: model.id, // Use the model ID directly (deepseek-chat or deepseek-reasoner)
        messages: messages,
        temperature: request.temperature || model.temperature || 0.7,
        max_tokens: request.maxTokens || model.maxTokens || 8192,
        stream: false, // Explicitly set to false to get non-stream response
      });

      // Type assertion since we know stream is false
      const chatCompletion = completion as OpenAI.Chat.Completions.ChatCompletion;
      
      const choice = chatCompletion.choices[0];
      if (!choice?.message?.content) {
        throw new Error("No response content received from DeepSeek API");
      }

      // Extract usage information
      const usage = chatCompletion.usage ? {
        inputTokens: chatCompletion.usage.prompt_tokens || 0,
        outputTokens: chatCompletion.usage.completion_tokens || 0,
      } : undefined;

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
    } catch (error) {
      console.error("DeepSeek API error:", error);
      throw new Error(
        `DeepSeek API error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * DeepSeek streaming API implementation
   */
  private async *callDeepSeekStreaming(
    model: ModelConfig,
    request: DispatchRequest,
    apiKey: string
  ): AsyncGenerator<StreamingDispatchResponse, void, unknown> {
    try {
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: "https://api.deepseek.com",
        dangerouslyAllowBrowser: true,
      });

      // Convert our messages to OpenAI format
      const messages = request.messages.map(msg => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
      }));

      // Make the streaming API call
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

        // Handle final chunk with usage information
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
    } catch (error) {
      console.error("DeepSeek streaming API error:", error);
      throw new Error(
        `DeepSeek streaming API error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Custom model implementation
   */
  private async callCustom(
    model: ModelConfig,
    request: DispatchRequest,
    apiKey: string
  ): Promise<DispatchResponse> {
    // TODO: Implement custom model API call
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API delay
    
    return {
      content: `Mock response from ${model.name}: ${request.messages[request.messages.length - 1]?.content}`,
      model: model.id,
      usage: {
        inputTokens: 80,
        outputTokens: 40,
      },
      metadata: {
        model: model.id,
        temperature: request.temperature || model.temperature,
      },
    };
  }

  /**
   * Process message history for context management
   * TODO: Implement message history processing (trimming, summarization)
   */
  private processMessageHistory(messages: DispatchRequest["messages"]): DispatchRequest["messages"] {
    // Placeholder for message history processing
    return messages;
  }

  /**
   * Convert our message format to Google's format
   */
  private convertMessagesToGoogleFormat(messages: DispatchRequest["messages"]) {
    let systemInstruction: string | undefined;
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

    for (const message of messages) {
      if (message.role === "system") {
        // Google uses systemInstruction for system messages
        systemInstruction = message.content;
      } else if (message.role === "user") {
        contents.push({
          role: "user",
          parts: [{ text: message.content }],
        });
      } else if (message.role === "assistant") {
        // Google uses "model" instead of "assistant"
        contents.push({
          role: "model",
          parts: [{ text: message.content }],
        });
      }
    }

    return { systemInstruction, contents };
  }

  /**
   * Convert our message format to Anthropic's format
   */
  private convertMessagesToAnthropicFormat(messages: DispatchRequest["messages"]) {
    let system: string | undefined;
    const anthropicMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

    for (const message of messages) {
      if (message.role === "system") {
        // Anthropic uses a separate system parameter
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

// Export singleton instance
export const dispatcher = new Dispatcher();

// Re-export types and functions for convenience
export type { ModelConfig };
export { getModelById, getModelDisplayName } from "./models"; 