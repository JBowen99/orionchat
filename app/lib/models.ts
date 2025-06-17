// Centralized model configuration for all AI providers
// Based on official documentation from each provider

export interface ModelConfig {
  id: string;
  name: string;
  provider: "openai" | "anthropic" | "google" | "mistral" | "deepseek" | "custom";
  description: string;
  maxTokens?: number;
  temperature?: number;
  inputTypes?: string[];
  outputTypes?: string[];
  category?: "flagship" | "fast" | "efficient" | "specialized";
}

// Default model configuration
export const DEFAULT_MODEL_ID = "gemini-2.5-flash-preview-05-20";

// Google AI models based on https://ai.google.dev/gemini-api/docs/models
export const GOOGLE_MODELS: ModelConfig[] = [
  // Gemini 2.5 series
  {
    id: "gemini-2.5-flash-preview-05-20",
    name: "Gemini 2.5 Flash Preview",
    provider: "google",
    description: "Adaptive thinking with cost efficiency",
    maxTokens: 8192,
    temperature: 0.7,
    inputTypes: ["text", "image", "audio", "video"],
    outputTypes: ["text"],
    category: "flagship",
  },
  {
    id: "gemini-2.5-pro-preview-06-05",
    name: "Gemini 2.5 Pro Preview",
    provider: "google", 
    description: "Enhanced thinking and reasoning, multimodal understanding",
    maxTokens: 8192,
    temperature: 0.7,
    inputTypes: ["text", "image", "audio", "video"],
    outputTypes: ["text"],
    category: "flagship",
  },
  // Gemini 2.0 series
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "google",
    description: "Next generation features with speed and thinking",
    maxTokens: 8192,
    temperature: 0.7,
    inputTypes: ["text", "image", "audio", "video"],
    outputTypes: ["text"],
    category: "fast",
  },
  {
    id: "gemini-2.0-flash-lite",
    name: "Gemini 2.0 Flash Lite",
    provider: "google",
    description: "Cost efficiency and low latency",
    maxTokens: 8192,
    temperature: 0.7,
    inputTypes: ["text", "image", "audio", "video"],
    outputTypes: ["text"],
    category: "efficient",
  },
  // Gemini 1.5 series (stable)
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "google",
    description: "Complex reasoning tasks requiring more intelligence",
    maxTokens: 8192,
    temperature: 0.7,
    inputTypes: ["text", "image", "audio", "video"],
    outputTypes: ["text"],
    category: "flagship",
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "google",
    description: "Fast and versatile performance across diverse tasks",
    maxTokens: 8192,
    temperature: 0.7,
    inputTypes: ["text", "image", "audio", "video"],
    outputTypes: ["text"],
    category: "fast",
  },
  {
    id: "gemini-1.5-flash-8b",
    name: "Gemini 1.5 Flash 8B",
    provider: "google",
    description: "High volume and lower intelligence tasks",
    maxTokens: 8192,
    temperature: 0.7,
    inputTypes: ["text", "image", "audio", "video"],
    outputTypes: ["text"],
    category: "efficient",
  },
];

// OpenAI models
export const OPENAI_MODELS: ModelConfig[] = [
  // GPT-4.5 series
  {
    id: "gpt-4.5-preview",
    name: "GPT-4.5 Preview",
    provider: "openai",
    description: "Most advanced GPT model with enhanced capabilities",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "flagship",
  },
  // GPT-4.1 series
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    provider: "openai",
    description: "Latest GPT-4.1 model with improved performance",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "flagship",
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "openai",
    description: "Efficient GPT-4.1 model for cost-effective tasks",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "efficient",
  },
  {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    provider: "openai",
    description: "Ultra-efficient GPT-4.1 model for high-volume tasks",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "efficient",
  },
  // GPT-4o series
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    description: "Most capable multimodal model",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "flagship",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    description: "Fast and efficient multimodal model",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "efficient",
  },
  {
    id: "gpt-4o-realtime-preview",
    name: "GPT-4o Realtime Preview",
    provider: "openai",
    description: "GPT-4o optimized for real-time interactions",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image", "audio"],
    outputTypes: ["text", "audio"],
    category: "specialized",
  },
  {
    id: "gpt-4o-mini-realtime-preview",
    name: "GPT-4o Mini Realtime Preview",
    provider: "openai",
    description: "Efficient GPT-4o for real-time applications",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image", "audio"],
    outputTypes: ["text", "audio"],
    category: "specialized",
  },
  {
    id: "gpt-4o-search-preview",
    name: "GPT-4o Search Preview",
    provider: "openai",
    description: "GPT-4o with enhanced web search capabilities",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "specialized",
  },
  {
    id: "gpt-4o-mini-search-preview",
    name: "GPT-4o Mini Search Preview",
    provider: "openai",
    description: "Efficient GPT-4o with web search capabilities",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "specialized",
  },
  // O-series models (reasoning models)
  {
    id: "o3",
    name: "O3",
    provider: "openai",
    description: "Advanced reasoning model with enhanced problem-solving",
    maxTokens: 8192,
    temperature: 0.7,
    inputTypes: ["text"],
    outputTypes: ["text"],
    category: "specialized",
  },
  {
    id: "o3-mini",
    name: "O3 Mini",
    provider: "openai",
    description: "Efficient reasoning model for complex tasks",
    maxTokens: 8192,
    temperature: 0.7,
    inputTypes: ["text"],
    outputTypes: ["text"],
    category: "specialized",
  },
  {
    id: "o3-pro",
    name: "O3 Pro",
    provider: "openai",
    description: "Professional-grade reasoning model",
    maxTokens: 8192,
    temperature: 0.7,
    inputTypes: ["text"],
    outputTypes: ["text"],
    category: "flagship",
  },
  {
    id: "o4-mini",
    name: "O4 Mini",
    provider: "openai",
    description: "Next-generation efficient reasoning model",
    maxTokens: 8192,
    temperature: 0.7,
    inputTypes: ["text"],
    outputTypes: ["text"],
    category: "specialized",
  },
  {
    id: "o1",
    name: "O1",
    provider: "openai",
    description: "Advanced reasoning model for complex problem solving",
    maxTokens: 8192,
    temperature: 0.7,
    inputTypes: ["text"],
    outputTypes: ["text"],
    category: "specialized",
  },
  {
    id: "o1-mini",
    name: "O1 Mini",
    provider: "openai",
    description: "Efficient reasoning model for everyday tasks",
    maxTokens: 8192,
    temperature: 0.7,
    inputTypes: ["text"],
    outputTypes: ["text"],
    category: "specialized",
  },
  {
    id: "o1-pro",
    name: "O1 Pro",
    provider: "openai",
    description: "Professional reasoning model with enhanced capabilities",
    maxTokens: 8192,
    temperature: 0.7,
    inputTypes: ["text"],
    outputTypes: ["text"],
    category: "flagship",
  },
  // Legacy models (still supported)
  {
    id: "chatgpt-4o-latest",
    name: "ChatGPT-4o Latest",
    provider: "openai",
    description: "Latest ChatGPT-4o model",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "flagship",
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openai",
    description: "High performance with latest knowledge",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text"],
    outputTypes: ["text"],
    category: "flagship",
  },
  {
    id: "gpt-4",
    name: "GPT-4",
    provider: "openai",
    description: "Original GPT-4 model",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text"],
    outputTypes: ["text"],
    category: "flagship",
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openai",
    description: "Fast and reliable for most tasks",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text"],
    outputTypes: ["text"],
    category: "fast",
  },
  {
    id: "gpt-3.5-turbo-instruct",
    name: "GPT-3.5 Turbo Instruct",
    provider: "openai",
    description: "Instruction-following variant of GPT-3.5",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text"],
    outputTypes: ["text"],
    category: "fast",
  },
];

// Anthropic models
export const ANTHROPIC_MODELS: ModelConfig[] = [
  // Claude 4 Models
  {
    id: "claude-opus-4-20250514",
    name: "Claude 4 Opus",
    provider: "anthropic",
    description: "Most advanced Claude model with superior reasoning and capabilities",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "flagship",
  },
  {
    id: "claude-opus-4-0",
    name: "Claude 4 Opus (Latest)",
    provider: "anthropic",
    description: "Latest Claude 4 Opus model (alias)",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "flagship",
  },
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude 4 Sonnet",
    provider: "anthropic",
    description: "Balanced Claude 4 model with excellent performance and efficiency",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "flagship",
  },
  {
    id: "claude-sonnet-4-0",
    name: "Claude 4 Sonnet (Latest)",
    provider: "anthropic",
    description: "Latest Claude 4 Sonnet model (alias)",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "flagship",
  },
  // Claude 3.7 Models
  {
    id: "claude-3-7-sonnet-20250219",
    name: "Claude 3.7 Sonnet",
    provider: "anthropic",
    description: "Enhanced Claude 3.5 with improved reasoning and capabilities",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "flagship",
  },
  {
    id: "claude-3-7-sonnet-latest",
    name: "Claude 3.7 Sonnet (Latest)",
    provider: "anthropic",
    description: "Latest Claude 3.7 Sonnet model (alias)",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "flagship",
  },
  // Claude 3.5 Models
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    description: "Most intelligent model with advanced reasoning",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "flagship",
  },
  {
    id: "claude-3-5-sonnet-latest",
    name: "Claude 3.5 Sonnet (Latest)",
    provider: "anthropic",
    description: "Latest Claude 3.5 Sonnet model (alias)",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "flagship",
  },
  {
    id: "claude-3-5-sonnet-20240620",
    name: "Claude 3.5 Sonnet (June)",
    provider: "anthropic",
    description: "Previous version of Claude 3.5 Sonnet",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "flagship",
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    description: "Fast and lightweight for quick tasks",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "fast",
  },
  {
    id: "claude-3-5-haiku-latest",
    name: "Claude 3.5 Haiku (Latest)",
    provider: "anthropic",
    description: "Latest Claude 3.5 Haiku model (alias)",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "fast",
  },
  // Claude 3 Models
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    provider: "anthropic",
    description: "Most capable model for complex tasks",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "flagship",
  },
  {
    id: "claude-3-opus-latest",
    name: "Claude 3 Opus (Latest)",
    provider: "anthropic",
    description: "Latest Claude 3 Opus model (alias)",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "flagship",
  },
  {
    id: "claude-3-sonnet-20240229",
    name: "Claude 3 Sonnet",
    provider: "anthropic",
    description: "Balanced performance for most tasks",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "fast",
  },
  {
    id: "claude-3-haiku-20240307",
    name: "Claude 3 Haiku",
    provider: "anthropic",
    description: "Fast and efficient for simple tasks",
    maxTokens: 4096,
    temperature: 0.7,
    inputTypes: ["text", "image"],
    outputTypes: ["text"],
    category: "efficient",
  },
];

// DeepSeek models based on https://api-docs.deepseek.com/quick_start/pricing
export const DEEPSEEK_MODELS: ModelConfig[] = [
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat (V3-0324)",
    provider: "deepseek",
    description: "DeepSeek-V3-0324 with 64K context, JSON output and function calling",
    maxTokens: 8192, // Default 4K, maximum 8K
    temperature: 0.7,
    inputTypes: ["text"],
    outputTypes: ["text"],
    category: "flagship",
  },
  {
    id: "deepseek-reasoner",
    name: "DeepSeek Reasoner (R1-0528)",
    provider: "deepseek",
    description: "DeepSeek-R1-0528 reasoning model with 64K context and enhanced CoT",
    maxTokens: 64000, // Default 32K, maximum 64K
    temperature: 0.7,
    inputTypes: ["text"],
    outputTypes: ["text"],
    category: "specialized",
  },
];

// All models combined
export const ALL_MODELS: ModelConfig[] = [
  ...GOOGLE_MODELS,
  ...OPENAI_MODELS,
  ...ANTHROPIC_MODELS,
  ...DEEPSEEK_MODELS,
];

// Models organized by provider for UI display
export const MODELS_BY_PROVIDER = {
  Google: GOOGLE_MODELS,
  OpenAI: OPENAI_MODELS,
  Anthropic: ANTHROPIC_MODELS,
  DeepSeek: DEEPSEEK_MODELS,
} as const;

// Helper functions
export function getModelById(modelId: string): ModelConfig | undefined {
  return ALL_MODELS.find(model => model.id === modelId);
}

export function getDefaultModel(): ModelConfig {
  const defaultModel = getModelById(DEFAULT_MODEL_ID);
  if (!defaultModel) {
    throw new Error(`Default model ${DEFAULT_MODEL_ID} not found in model configuration`);
  }
  return defaultModel;
}

export function getModelsByProvider(provider: string): ModelConfig[] {
  return ALL_MODELS.filter(model => model.provider === provider);
}

export function getModelDisplayName(modelId: string): string {
  const model = getModelById(modelId);
  return model?.name || modelId;
}

// Google-specific model name mapping for API calls
export function getGoogleModelName(modelId: string): string {
  const modelMap: Record<string, string> = {
    "gemini-2.5-flash-preview-05-20": "gemini-2.5-flash-preview-05-20",
    "gemini-2.5-pro-preview-06-05": "gemini-2.5-pro-preview-06-05", 
    "gemini-2.0-flash": "gemini-2.0-flash",
    "gemini-2.0-flash-lite": "gemini-2.0-flash-lite",
    "gemini-1.5-pro": "gemini-1.5-pro",
    "gemini-1.5-flash": "gemini-1.5-flash",
    "gemini-1.5-flash-8b": "gemini-1.5-flash-8b",
  };
  
  return modelMap[modelId] || "gemini-1.5-flash";
} 