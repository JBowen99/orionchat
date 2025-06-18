import { useState, useCallback } from "react";
import { useApiKeys } from "~/contexts/api-keys-context";
import { useSettings } from "~/contexts/settings-context";
import { useUser } from "~/contexts/user-context";
import { useChatMessageContext } from "~/contexts/chat-message-context";
import { systemPromptBuilder } from "~/lib/system-prompt-builder";
import { chatService } from "~/services/chat.service";
import { getModelById } from "~/lib/models";
import { v4 as uuidv4 } from "uuid";
import type { ChatMessage, ChatRequest, ChatResponse, StreamingChatResponse } from "~/services/chat.service";
import type { Message } from "~/contexts/chat-message-context";

export interface UseChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  onResponse?: (response: ChatResponse) => void;
  onError?: (error: Error) => void;
  onStreamingChunk?: (chunk: StreamingChatResponse) => void;
  // === CORE FEATURES ===
  usePersistedMessages?: boolean; // Enable message persistence integration
  enableSystemPrompts?: boolean; // Enable system prompting with user context
}

export interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string, options?: { role?: "user" | "system" }) => Promise<void>;
  sendMessages: (messages: ChatMessage[], options?: { stream?: boolean }) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
  // === PERSISTENCE FEATURES ===
  persistedMessages?: Message[]; // Access to persisted messages when enabled
  chatId?: string | null; // Current chat ID when using persistence
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { apiKeys } = useApiKeys();
  
  // === USER SETTINGS INTEGRATION ===
  const { preferences } = useSettings(); // User settings for system prompts
  const { user } = useUser(); // User context for personalization
  
  // === MESSAGE PERSISTENCE INTEGRATION ===
  const persistenceContext = options.usePersistedMessages ? useChatMessageContext() : null;
  
  // State management - use persisted messages if enabled, otherwise internal state
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const {
    model = "gemini-2.5-flash-preview-05-20",
    temperature,
    maxTokens,
    onResponse,
    onError,
    onStreamingChunk,
    usePersistedMessages = false,
    enableSystemPrompts = false,
  } = options;

  // === MESSAGE PERSISTENCE: Choose message source ===
  const messages = usePersistedMessages && persistenceContext 
    ? persistenceContext.messages.map((msg): ChatMessage => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content || "",
      }))
    : internalMessages;

  const chatId = usePersistedMessages && persistenceContext ? persistenceContext.chatId : null;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearMessages = useCallback(() => {
    if (usePersistedMessages && persistenceContext) {
      // === MESSAGE PERSISTENCE: Clear persisted messages ===
      // Note: This would need to be implemented in the context
      console.warn("Clear persisted messages not implemented");
    } else {
      setInternalMessages([]);
    }
    setError(null);
  }, [usePersistedMessages, persistenceContext]);

  // === SYSTEM PROMPTING: Build enhanced messages with context ===
  const buildEnhancedMessages = useCallback((messagesToSend: ChatMessage[]): ChatMessage[] => {
    if (!enableSystemPrompts) {
      return messagesToSend;
    }

    // Build system prompt context
    const systemPromptContext = {
      userSettings: preferences,
      modelConfig: getModelById(model),
      conversationContext: {
        messages: messagesToSend,
      },
    };

    // Generate system prompt
    const systemPrompt = systemPromptBuilder.buildSystemPrompt(systemPromptContext);

    // Check if there's already a system message
    const hasSystemMessage = messagesToSend.some(msg => msg.role === "system");
    
    if (hasSystemMessage) {
      // Replace existing system message
      return messagesToSend.map(msg => 
        msg.role === "system" 
          ? { ...msg, content: systemPrompt }
          : msg
      );
    } else {
      // Add system message at the beginning
      return [
        { role: "system", content: systemPrompt },
        ...messagesToSend
      ];
    }
  }, [enableSystemPrompts, preferences, model]);

  const sendMessages = useCallback(
    async (messagesToSend: ChatMessage[], options: { stream?: boolean } = {}) => {
      const { stream = false } = options;
      
      setIsLoading(true);
      setError(null);

      try {
        // === SYSTEM PROMPTING: Enhance messages with system prompt ===
        const enhancedMessages = buildEnhancedMessages(messagesToSend);

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
          messages: enhancedMessages, // Use enhanced messages with system prompt
          temperature,
          maxTokens,
          stream,
        };

        if (usePersistedMessages && persistenceContext) {
          // === MESSAGE PERSISTENCE: Use direct service call for better integration ===
          const modelConfig = getModelById(model);
          if (!modelConfig) {
            throw new Error(`Model ${model} not found`);
          }

          // Check if we have the required API key
          const requiredApiKey = apiKeysForService[modelConfig.provider];
          if (!requiredApiKey) {
            throw new Error(
              `No API key found for ${modelConfig.provider}. Please add an API key in Settings.`
            );
          }

          if (stream) {
            // Create loading message placeholder for persistence
            const assistantMessageId = uuidv4();
            const loadingMessage: Message = {
              id: assistantMessageId,
              chat_id: chatId!,
              role: "assistant",
              content: "",
              type: "text",
              created_at: new Date().toISOString(),
              parent_message_id: null,
              metadata: { loading: true },
            };

            await persistenceContext.addMessage(loadingMessage);
            setStreamingMessageId(assistantMessageId);

            // Call streaming service directly
            const streamingResponse = chatService.generateStreamingChatCompletion(
              chatRequest,
              apiKeysForService
            );

            let fullContent = "";
            let finalMetadata = null;
            let isFirstChunk = true;

            for await (const chunk of streamingResponse) {
              if (chunk.delta) {
                fullContent += chunk.delta;

                // === MESSAGE PERSISTENCE: Update persisted message ===
                if (isFirstChunk) {
                  await persistenceContext.updateMessage(assistantMessageId, {
                    content: fullContent,
                    metadata: { streaming: true },
                  });
                  isFirstChunk = false;
                } else {
                  await persistenceContext.updateMessage(assistantMessageId, {
                    content: fullContent,
                    metadata: { streaming: true },
                  });
                }

                if (onStreamingChunk) {
                  onStreamingChunk(chunk);
                }
              }

              if (chunk.finished) {
                finalMetadata = chunk.metadata;

                // === MESSAGE PERSISTENCE: Final update to mark streaming complete ===
                await persistenceContext.updateMessage(assistantMessageId, {
                  content: chunk.content,
                  metadata: finalMetadata
                    ? JSON.parse(JSON.stringify(finalMetadata))
                    : null,
                });

                if (onResponse) {
                  onResponse({
                    content: chunk.content,
                    model: chunk.model,
                    usage: chunk.usage,
                    metadata: chunk.metadata,
                  });
                }
                break;
              }
            }

            setStreamingMessageId(null);
          } else {
            // Non-streaming with persistence
            const response = await chatService.generateChatCompletion(
              chatRequest,
              apiKeysForService
            );

            // === MESSAGE PERSISTENCE: Add assistant response ===
            const assistantMessageId = uuidv4();
            const assistantMessage: Message = {
              id: assistantMessageId,
              chat_id: chatId!,
              role: "assistant",
              content: response.content,
              type: "text",
              created_at: new Date().toISOString(),
              parent_message_id: null,
              metadata: response.metadata ? JSON.parse(JSON.stringify(response.metadata)) : null,
            };

            await persistenceContext.addMessage(assistantMessage);

            if (onResponse) {
              onResponse(response);
            }
          }
        } else {
          // === ORIGINAL FUNCTIONALITY: HTTP API call for non-persisted usage ===
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
                        if (parsed.error) {
                          throw new Error(parsed.error);
                        }

                        const streamingResponse = parsed as StreamingChatResponse;

                        if (streamingResponse.delta) {
                          assistantMessage += streamingResponse.delta;
                          setInternalMessages(prev => {
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
            
            const assistantMessage: ChatMessage = {
              role: "assistant",
              content: result.content,
            };

            setInternalMessages(prev => [...prev, assistantMessage]);

            if (onResponse) {
              onResponse(result);
            }
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        
        // === MESSAGE PERSISTENCE: Handle errors with persistence ===
        if (usePersistedMessages && persistenceContext && streamingMessageId) {
          try {
            await persistenceContext.updateMessage(streamingMessageId, {
              content: errorMessage,
              type: "error",
              metadata: {
                error: errorMessage,
                originalError: err instanceof Error ? err.stack : String(err),
              },
            });
          } catch (updateErr) {
            console.error("Error updating message with error:", updateErr);
          }
          setStreamingMessageId(null);
        }
        
        if (onError) {
          onError(err instanceof Error ? err : new Error(errorMessage));
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      model, 
      temperature, 
      maxTokens, 
      apiKeys, 
      onResponse, 
      onError, 
      onStreamingChunk,
      buildEnhancedMessages,
      usePersistedMessages,
      persistenceContext,
      chatId,
      streamingMessageId
    ]
  );

  const sendMessage = useCallback(
    async (content: string, options: { role?: "user" | "system" } = {}) => {
      const { role = "user" } = options;
      const newMessage: ChatMessage = { role, content };
      
      if (usePersistedMessages && persistenceContext && chatId) {
        // === MESSAGE PERSISTENCE: Add user message to persistence ===
        const userMessageId = uuidv4();
        const userMessage: Message = {
          id: userMessageId,
          chat_id: chatId,
          role: role,
          content: content,
          type: "text",
          created_at: new Date().toISOString(),
          parent_message_id: null,
          metadata: null,
        };

        await persistenceContext.addMessage(userMessage);

        // If it's a user message, send for completion
        if (role === "user") {
          // === CONVERSATION CONTEXT: Use full conversation history ===
          const conversationHistory = [...messages, newMessage];
          await sendMessages(conversationHistory, { stream: true });
        }
      } else {
        // === ORIGINAL FUNCTIONALITY: Internal state management ===
        const updatedMessages = [...messages, newMessage];
        setInternalMessages(updatedMessages);
        
        if (role === "user") {
          await sendMessages(updatedMessages);
        }
      }
    },
    [messages, sendMessages, usePersistedMessages, persistenceContext, chatId]
  );

  const returnValue: UseChatReturn = {
    messages,
    isLoading,
    error,
    sendMessage,
    sendMessages,
    clearMessages,
    clearError,
  };

  // === PERSISTENCE FEATURES: Add persistence-related data when enabled ===
  if (usePersistedMessages) {
    returnValue.persistedMessages = persistenceContext?.messages;
    returnValue.chatId = chatId;
  }

  return returnValue;
} 