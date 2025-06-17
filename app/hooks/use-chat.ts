import { useState, useCallback } from "react";
import { useApiKeys } from "~/contexts/api-keys-context";
import type { ChatMessage, ChatRequest, ChatResponse, StreamingChatResponse } from "~/services/chat.service";

export interface UseChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  onResponse?: (response: ChatResponse) => void;
  onError?: (error: Error) => void;
  onStreamingChunk?: (chunk: StreamingChatResponse) => void;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string, options?: { role?: "user" | "system" }) => Promise<void>;
  sendMessages: (messages: ChatMessage[], options?: { stream?: boolean }) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { getApiKey, apiKeys } = useApiKeys();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    model = "gemini-2.5-flash-preview-05-20", // Default model
    temperature,
    maxTokens,
    onResponse,
    onError,
    onStreamingChunk,
  } = options;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const sendMessages = useCallback(
    async (messagesToSend: ChatMessage[], options: { stream?: boolean } = {}) => {
      const { stream = false } = options;
      
      setIsLoading(true);
      setError(null);

      try {
        // Prepare API keys in the format expected by the service
        const apiKeysForService = Object.entries(apiKeys).reduce(
          (acc, [provider, keyEntry]) => {
            acc[provider as keyof typeof apiKeys] = keyEntry?.key || null;
            return acc;
          },
          {} as Record<keyof typeof apiKeys, string | null>
        );

        const chatRequest: ChatRequest = {
          model,
          messages: messagesToSend,
          temperature,
          maxTokens,
          stream,
        };

        if (stream) {
          // Handle streaming response
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...chatRequest,
              apiKeys: apiKeysForService,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to get response");
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let assistantMessage = "";

          if (reader) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");

                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    const data = line.slice(6);
                    if (data === "[DONE]") {
                      return;
                    }

                    try {
                      const parsed = JSON.parse(data);
                      // Check if this is an error response
                      if (parsed.error) {
                        throw new Error(parsed.error);
                      }

                      const streamingResponse = parsed as StreamingChatResponse;

                      if (streamingResponse.delta) {
                        assistantMessage += streamingResponse.delta;
                        // Update the last message with the current content
                        setMessages(prev => {
                          const newMessages = [...prev];
                          const lastMessage = newMessages[newMessages.length - 1];
                          if (lastMessage?.role === "assistant") {
                            lastMessage.content = assistantMessage;
                          } else {
                            newMessages.push({
                              role: "assistant",
                              content: assistantMessage,
                            });
                          }
                          return newMessages;
                        });
                      }

                      if (onStreamingChunk) {
                        onStreamingChunk(streamingResponse);
                      }

                      if (streamingResponse.finished && onResponse) {
                        onResponse({
                          content: streamingResponse.content,
                          model: streamingResponse.model,
                          usage: streamingResponse.usage,
                          metadata: streamingResponse.metadata,
                        });
                      }
                    } catch (parseError) {
                      console.error("Error parsing streaming response:", parseError);
                    }
                  }
                }
              }
            } finally {
              reader.releaseLock();
            }
          }
        } else {
          // Handle non-streaming response
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...chatRequest,
              apiKeys: apiKeysForService,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to get response");
          }

          const result = await response.json() as ChatResponse;
          
          // Add the assistant's response
          const assistantMessage: ChatMessage = {
            role: "assistant",
            content: result.content,
          };

          setMessages(prev => [...prev, assistantMessage]);

          if (onResponse) {
            onResponse(result);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        
        if (onError) {
          onError(err instanceof Error ? err : new Error(errorMessage));
        }
      } finally {
        setIsLoading(false);
      }
    },
    [model, temperature, maxTokens, apiKeys, onResponse, onError, onStreamingChunk]
  );

  const sendMessage = useCallback(
    async (content: string, options: { role?: "user" | "system" } = {}) => {
      const { role = "user" } = options;
      const newMessage: ChatMessage = { role, content };
      
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      
      // If it's a user message, send for completion
      if (role === "user") {
        await sendMessages(updatedMessages);
      }
    },
    [messages, sendMessages]
  );

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    sendMessages,
    clearMessages,
    clearError,
  };
} 