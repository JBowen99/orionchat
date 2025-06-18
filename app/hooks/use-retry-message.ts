import { useState, useCallback } from "react";
import { useChat } from "./use-chat";
import { useChatMessageContext } from "~/contexts/chat-message-context";
import { useApiKeys } from "~/contexts/api-keys-context";
import { getModelById } from "~/lib/models";
import type { ChatMessage } from "~/services/chat.service";

export interface UseRetryMessageOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  onRetryStart?: () => void;
  onRetryComplete?: () => void;
  onRetryError?: (error: Error) => void;
}

export interface UseRetryMessageReturn {
  retryMessage: (messageId: string) => Promise<void>;
  isRetrying: boolean;
  retryError: string | null;
  clearRetryError: () => void;
}

export function useRetryMessage(options: UseRetryMessageOptions = {}): UseRetryMessageReturn {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  
  const { 
    model,
    temperature, 
    maxTokens,
    onRetryStart,
    onRetryComplete,
    onRetryError,
  } = options;

  // === RETRY LOGIC: Uses main chat hook to ensure consistency ===
  const chatHook = useChat({
    model,
    temperature,
    maxTokens,
    usePersistedMessages: true,  // Retry always uses persistence
    enableSystemPrompts: true,   // Retry uses same system prompting as regular messages
    onError: (error) => {
      setRetryError(error.message);
      if (onRetryError) {
        onRetryError(error);
      }
    },
  });

  const { messages, persistedMessages, chatId } = chatHook;
  const { updateMessage, deleteMessage } = useChatMessageContext();
  const { apiKeys } = useApiKeys();

  const clearRetryError = useCallback(() => {
    setRetryError(null);
  }, []);

  const retryMessage = useCallback(
    async (targetMessageId: string) => {
      if (!chatId) {
        throw new Error("No chat ID available for retry");
      }

      if (!persistedMessages || persistedMessages.length === 0) {
        throw new Error("No persisted messages available for retry");
      }

      setIsRetrying(true);
      setRetryError(null);

      try {
        if (onRetryStart) {
          onRetryStart();
        }

        // === RETRY LOGIC: Find the target message ===
        const targetMessage = persistedMessages.find((m) => m.id === targetMessageId);
        if (!targetMessage) {
          throw new Error("Target message not found");
        }

        // === RETRY LOGIC: Extract model and parameters from target message ===
        const metadata = targetMessage.metadata as {
          model?: string;
          temperature?: number;
          maxTokens?: number;
        } | null;

        const messageModel = metadata?.model || model;
        if (!messageModel) {
          throw new Error("Cannot retry: No model information found in message");
        }

        // Validate model configuration
        const modelConfig = getModelById(messageModel);
        if (!modelConfig) {
          throw new Error(`Model ${messageModel} not found`);
        }

        // Check if we have the required API key
        const apiKeysForService = Object.entries(apiKeys).reduce(
          (acc, [provider, keyEntry]) => {
            acc[provider as keyof typeof apiKeys] = keyEntry?.key || null;
            return acc;
          },
          {} as Record<keyof typeof apiKeys, string | null>
        );

        const requiredApiKey = apiKeysForService[modelConfig.provider];
        if (!requiredApiKey) {
          throw new Error(
            `No API key found for ${modelConfig.provider}. Please add an API key in Settings.`
          );
        }

        // === RETRY LOGIC: Find the target message index ===
        const targetIndex = persistedMessages.findIndex((m) => m.id === targetMessageId);
        if (targetIndex === -1) {
          throw new Error("Target message not found in conversation");
        }

        // === RETRY LOGIC: Delete all messages after the target message (including the target) ===
        const messagesToDelete = persistedMessages.slice(targetIndex);

        // Delete messages in reverse order (newest first) to maintain consistency
        for (let i = messagesToDelete.length - 1; i >= 0; i--) {
          const messageToDelete = messagesToDelete[i];
          await deleteMessage(messageToDelete.id);
        }

        // === RETRY LOGIC: Get conversation history up to the parent message ===
        const conversationHistory: ChatMessage[] = persistedMessages
          .slice(0, targetIndex)
          .map((msg) => ({
            role: msg.role as "system" | "user" | "assistant",
            content: msg.content || "",
          }));

        // === RETRY LOGIC: Find the last user message to retry ===
        let lastUserMessage: ChatMessage | null = null;
        for (let i = conversationHistory.length - 1; i >= 0; i--) {
          if (conversationHistory[i].role === "user") {
            lastUserMessage = conversationHistory[i];
            break;
          }
        }

        if (!lastUserMessage) {
          throw new Error("No user message found to retry");
        }

        // === RETRY LOGIC: Use main chat hook to resend the message ===
        // This ensures retry goes through the same system prompting, persistence, etc.
        const fullConversationHistory = [...conversationHistory, lastUserMessage];
        await chatHook.sendMessages(fullConversationHistory, { 
          stream: true 
        });

        if (onRetryComplete) {
          onRetryComplete();
        }

      } catch (error) {
        console.error("Error retrying message:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to retry message";
        setRetryError(errorMessage);
        
        if (onRetryError) {
          onRetryError(error instanceof Error ? error : new Error(errorMessage));
        }
        
        throw error;
      } finally {
        setIsRetrying(false);
      }
    },
    [
      chatId,
      persistedMessages,
      model,
      temperature,
      maxTokens,
      chatHook,
      updateMessage,
      deleteMessage,
      apiKeys,
      onRetryStart,
      onRetryComplete,
      onRetryError,
    ]
  );

  return {
    retryMessage,
    isRetrying: isRetrying || chatHook.isLoading, // Include main chat loading state
    retryError,
    clearRetryError,
  };
} 