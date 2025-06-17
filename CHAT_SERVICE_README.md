# Chat Service Architecture

This document explains the new chat service architecture that provides a clean interface for calling AI models using the API keys context.

## Overview

The chat service consists of three main components:

1. **ChatService** (`app/services/chat.service.ts`) - Core service for API calls
2. **API Route** (`app/routes/api.chat.tsx`) - HTTP endpoint for chat completions
3. **useChat Hook** (`app/hooks/use-chat.ts`) - React hook for easy integration

## Architecture

```
Frontend Component
       ↓
   useChat Hook
       ↓
   API Route (/api/chat)
       ↓
   ChatService
       ↓
   AI Provider APIs (OpenAI, Anthropic, Google, etc.)
```

## Features

- ✅ Support for multiple AI providers (OpenAI, Anthropic, Google, DeepSeek, Mistral, Custom)
- ✅ Streaming and non-streaming responses
- ✅ Automatic API key management via API Keys Context
- ✅ Type-safe interfaces
- ✅ Error handling and retry logic
- ✅ Usage tracking and metadata
- ✅ React hook for easy integration

## Usage

### 1. Basic Usage with React Hook

```tsx
import { useChat } from "~/hooks/use-chat";

function ChatComponent() {
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat({
    model: "gemini-2.5-flash-preview-05-20",
    temperature: 0.7,
    maxTokens: 4096,
  });

  const handleSend = async () => {
    await sendMessage("Hello, how are you?");
  };

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}
      <button onClick={handleSend} disabled={isLoading}>
        Send Message
      </button>
    </div>
  );
}
```

### 2. Streaming Responses

```tsx
const { sendMessage } = useChat({
  model: "gpt-4o",
  onStreamingChunk: (chunk) => {
    console.log("New chunk:", chunk.delta);
  },
  onResponse: (response) => {
    console.log("Final response:", response);
  },
});

// Send with streaming enabled
await sendMessage("Tell me a story", { stream: true });
```

### 3. Direct API Usage

```typescript
// POST /api/chat
const response = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-3-5-sonnet-20241022",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Hello!" },
    ],
    temperature: 0.7,
    maxTokens: 1000,
    stream: false,
    apiKeys: {
      anthropic: "your-api-key-here",
      // ... other provider keys
    },
  }),
});

const result = await response.json();
```

### 4. Using the Service Directly

```typescript
import { chatService } from "~/services/chat.service";

const response = await chatService.generateChatCompletion(
  {
    model: "deepseek-chat",
    messages: [{ role: "user", content: "Hello!" }],
    temperature: 0.7,
  },
  {
    deepseek: "your-deepseek-api-key",
    // ... other provider keys
  }
);
```

## API Keys Integration

The service automatically integrates with the API Keys Context:

1. API keys are encrypted and stored locally
2. Keys are automatically passed to the service
3. Usage tracking is handled automatically
4. No manual key management required in components

## Supported Models

### OpenAI

- GPT-4.5 series (preview)
- GPT-4.1 series
- GPT-4o series (including realtime and search variants)
- O-series reasoning models (o1, o3, o4)

### Anthropic

- Claude 3.5 Sonnet
- Claude 3 series

### Google

- Gemini 2.5 series (Flash, Pro)
- Gemini 2.0 series
- Gemini 1.5 series

### DeepSeek

- DeepSeek Chat
- DeepSeek Reasoner

### Mistral & Custom

- Placeholder implementations (TODO)

## Error Handling

The service provides comprehensive error handling:

```tsx
const { error, clearError } = useChat({
  onError: (error) => {
    console.error("Chat error:", error.message);
    // Handle specific error types
    if (error.message.includes("API key")) {
      // Redirect to settings
    }
  },
});

if (error) {
  return (
    <div>
      Error: {error}
      <button onClick={clearError}>Clear</button>
    </div>
  );
}
```

## Configuration Options

### ChatRequest Interface

```typescript
interface ChatRequest {
  model: string; // Model ID
  messages: ChatMessage[]; // Conversation history
  temperature?: number; // 0.0 - 1.0 (default: 0.7)
  maxTokens?: number; // Max response tokens
  stream?: boolean; // Enable streaming
}
```

### ChatMessage Interface

```typescript
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
```

### Response Interfaces

```typescript
interface ChatResponse {
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
```

## Example Component

See `app/components/chat-example.tsx` for a complete working example that demonstrates:

- Model selection
- Streaming vs non-streaming
- Message history
- Error handling
- Loading states

## Best Practices

1. **Always handle errors**: Network requests can fail
2. **Use appropriate models**: Choose based on your use case
3. **Set reasonable limits**: Use maxTokens to control costs
4. **Handle loading states**: Provide feedback to users
5. **Secure API keys**: Never expose keys in client-side code
6. **Consider streaming**: For better UX with long responses

## Migration from Dispatcher

If migrating from the old dispatcher:

1. Replace `dispatcher.dispatch()` with `chatService.generateChatCompletion()`
2. Update message format to use the new interfaces
3. Use the `useChat` hook for React components
4. Update API key handling to use the new context

## Development

To extend the service:

1. Add new provider implementations in `ChatService`
2. Update model configurations in `models.ts`
3. Add provider-specific error handling
4. Update types as needed

## Testing

The service includes comprehensive error handling and validation:

- Model validation
- Message format validation
- API key validation
- Provider-specific error handling
- Network error handling

Make sure to test with actual API keys and various models to ensure compatibility.
