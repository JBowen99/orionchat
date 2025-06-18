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
  sendMessage: (content: string, options?: { role?: "user" | "system"; model?: string; chatId?: string }) => Promise<void>;
  sendMessages: (messages: ChatMessage[], options?: { stream?: boolean; chatId?: string }) => Promise<void>;
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

  // Helper method to create user-friendly error messages
  const createUserFriendlyErrorMessage = useCallback((errorMessage: string): string => {
    // Handle specific API errors with user-friendly messages
    if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
      return "❌ **Error Processing Request**\n\nInvalid API key. Please check your API key configuration in Settings.";
    }
    
    if (errorMessage.includes("Rate limit") || errorMessage.includes("RATE_LIMITED") || errorMessage.includes("429")) {
      return "❌ **Error Processing Request**\n\nRate limit exceeded. Please wait a moment before trying again.";
    }
    
    if (errorMessage.includes("quota") || errorMessage.includes("billing") || errorMessage.includes("QUOTA_EXCEEDED")) {
      return "❌ **Error Processing Request**\n\nAPI quota exceeded. Please check your account billing and usage limits.";
    }
    
    if (errorMessage.includes("context length") || errorMessage.includes("too long") || errorMessage.includes("MAX_TOKENS")) {
      return "❌ **Error Processing Request**\n\nMessage too long for this model. Please try a shorter message or use a model with a larger context window.";
    }
    
    if (errorMessage.includes("network") || errorMessage.includes("fetch") || errorMessage.includes("connection")) {
      return "❌ **Error Processing Request**\n\nNetwork connection error. Please check your internet connection and try again.";
    }
    
    // Default generic error message
    return "❌ **Error Processing Request**\n\nSomething went wrong while processing your request. Please try again.";
  }, []);

  // Helper method to categorize error types
  const getErrorType = useCallback((error: any): string => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes("API key") || errorMessage.includes("API_KEY_INVALID")) {
      return "API_KEY_ERROR";
    }
    if (errorMessage.includes("Rate limit") || errorMessage.includes("429")) {
      return "RATE_LIMIT_ERROR";
    }
    if (errorMessage.includes("quota") || errorMessage.includes("billing")) {
      return "QUOTA_ERROR";
    }
    if (errorMessage.includes("context length") || errorMessage.includes("too long")) {
      return "CONTEXT_LENGTH_ERROR";
    }
    if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      return "NETWORK_ERROR";
    }
    
    return "UNKNOWN_ERROR";
  }, []);

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
    async (messagesToSend: ChatMessage[], options: { stream?: boolean; chatId?: string } = {}) => {
      const { stream = false, chatId: providedChatId } = options;
      
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
          // Determine and validate chatId for persistence
          const targetChatId = providedChatId || chatId;
          console.log("sendMessages - providedChatId:", providedChatId, "contextChatId:", chatId, "targetChatId:", targetChatId);
          
          if (!targetChatId) {
            throw new Error("No chat ID available for message persistence. Cannot send messages without a valid chat context.");
          }
          
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
              chat_id: targetChatId,
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
            let updateTimeout: NodeJS.Timeout | null = null;

            // Debounced update function to reduce database writes
            const debouncedUpdate = (content: string, metadata: any, isFinal = false) => {
              if (updateTimeout) {
                clearTimeout(updateTimeout);
              }

              if (isFinal) {
                // Immediate update for final chunk
                persistenceContext.updateMessage(assistantMessageId, {
                  content,
                  metadata,
                });
              } else {
                // Debounced update for streaming chunks
                updateTimeout = setTimeout(() => {
                  persistenceContext.updateMessage(assistantMessageId, {
                    content,
                    metadata: { streaming: true },
                  });
                }, 300); // Update database every 300ms max
              }
            };

            for await (const chunk of streamingResponse) {
              if (chunk.delta) {
                fullContent += chunk.delta;

                // === OPTIMIZED: Immediate UI update, debounced database update ===
                // Update UI immediately for responsive feel
                // Note: UI updates happen automatically through persistenceContext.messages changes
                persistenceContext.updateMessageContent(assistantMessageId, fullContent);

                if (isFirstChunk) {
                  // First chunk gets immediate database update
                  await persistenceContext.updateMessage(assistantMessageId, {
                    content: fullContent,
                    metadata: { streaming: true },
                  });
                  isFirstChunk = false;
                } else {
                  // Subsequent chunks use debounced updates
                  debouncedUpdate(fullContent, { streaming: true });
                }

                if (onStreamingChunk) {
                  onStreamingChunk(chunk);
                }
              }

              if (chunk.finished) {
                // Clear any pending debounced update
                if (updateTimeout) {
                  clearTimeout(updateTimeout);
                }

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
              chat_id: targetChatId,
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
        
        // Provide more context for chat ID errors
        if (errorMessage.includes("chat ID")) {
          setError(`Chat Error: ${errorMessage}`);
        } else {
          setError(errorMessage);
        }
        
        // === MESSAGE PERSISTENCE: Handle errors with persistence ===
        if (usePersistedMessages && persistenceContext) {
          try {
            // Get the target chat ID from the same logic as used above
            const errorTargetChatId = providedChatId || chatId;
            
            // Create a proper error message to display in chat
            const errorMessageId = streamingMessageId || uuidv4();
            const userFriendlyError = createUserFriendlyErrorMessage(errorMessage);
            
            const errorMessageObj: Message = {
              id: errorMessageId,
              chat_id: errorTargetChatId || "", // Fallback to empty string if no chat ID
              role: "assistant",
              content: userFriendlyError,
              type: "error",
              created_at: new Date().toISOString(),
              parent_message_id: null,
              metadata: {
                error: userFriendlyError,
                originalError: err instanceof Error ? err.stack || err.message : String(err),
                errorType: getErrorType(err),
                timestamp: new Date().toISOString(),
                model: model,
              },
            };

            if (streamingMessageId) {
              // Update existing streaming message with error
              await persistenceContext.updateMessage(streamingMessageId, {
                content: errorMessageObj.content,
                type: "error",
                metadata: errorMessageObj.metadata,
              });
            } else if (errorTargetChatId) {
              // Add new error message only if we have a valid chat ID
              await persistenceContext.addMessage(errorMessageObj);
            }
          } catch (updateErr) {
            console.error("Error updating message with error:", updateErr);
          }
          setStreamingMessageId(null);
        } else {
          // === NON-PERSISTED: Add error message to internal state ===
          const userFriendlyError = createUserFriendlyErrorMessage(errorMessage);
          const errorChatMessage: ChatMessage = {
            role: "assistant",
            content: userFriendlyError,
          };
          setInternalMessages(prev => [...prev, errorChatMessage]);
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
    async (content: string, options: { role?: "user" | "system"; model?: string; chatId?: string } = {}) => {
      const { role = "user", model: messageModel, chatId: providedChatId } = options;
      const newMessage: ChatMessage = { role, content };
      
      // Determine target chatId and validate
      const targetChatId = providedChatId || chatId;
      
      console.log("sendMessage - providedChatId:", providedChatId, "contextChatId:", chatId, "targetChatId:", targetChatId);
      
      if (usePersistedMessages && persistenceContext) {
        if (!targetChatId) {
          throw new Error("No chat ID available. Please ensure you're in a valid chat context or provide a chatId parameter.");
        }
        
        // === MESSAGE PERSISTENCE: Add user message to persistence ===
        const userMessageId = uuidv4();
        const userMessage: Message = {
          id: userMessageId,
          chat_id: targetChatId,
          role: role,
          content: content,
          type: "text",
          created_at: new Date().toISOString(),
          parent_message_id: null,
          metadata: messageModel ? { model: messageModel } : null,
        };

        console.log("sendMessage - Adding user message with chatId:", targetChatId);
        await persistenceContext.addMessage(userMessage);

        // If it's a user message, send for completion
        if (role === "user") {
          // === CONVERSATION CONTEXT: Use full conversation history ===
          const conversationHistory = [...messages, newMessage];
          console.log("sendMessage - Calling sendMessages with chatId:", targetChatId);
          await sendMessages(conversationHistory, { stream: true, chatId: targetChatId });
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