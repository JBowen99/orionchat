import { useState, useCallback, useMemo } from "react";
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
  retryMessage: (messageId: string, options?: { model?: string }) => Promise<void>;
  isRetrying: boolean;
  retryError: string | null;
  clearRetryError: () => void;
}

export function useRetryMessage(options: UseRetryMessageOptions = {}): UseRetryMessageReturn {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [currentRetryModel, setCurrentRetryModel] = useState<string | undefined>(undefined);
  
  const { 
    model: defaultModel,
    temperature, 
    maxTokens,
    onRetryStart,
    onRetryComplete,
    onRetryError,
  } = options;

  const { updateMessage, deleteMessage } = useChatMessageContext();
  const { apiKeys } = useApiKeys();
  const { messages: persistedMessages, chatId } = useChatMessageContext();

  // Create chat hook with dynamic model support
  const chatHook = useChat({
    model: currentRetryModel || defaultModel || "gemini-2.5-flash-preview-05-20",
    temperature,
    maxTokens,
    usePersistedMessages: true,
    enableSystemPrompts: true,
    onError: (error) => {
      setRetryError(error.message);
      setIsRetrying(false);
      if (onRetryError) {
        onRetryError(error);
      }
    },
  });

  const clearRetryError = useCallback(() => {
    setRetryError(null);
  }, []);

  const retryMessage = useCallback(
    async (targetMessageId: string, retryOptions: { model?: string } = {}) => {
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

        // === RETRY LOGIC: Determine model to use ===
        const metadata = targetMessage.metadata as {
          model?: string;
          temperature?: number;
          maxTokens?: number;
        } | null;

        const modelToUse = retryOptions.model || defaultModel || metadata?.model || "gemini-2.5-flash-preview-05-20";

        // Validate model configuration
        const modelConfig = getModelById(modelToUse);
        if (!modelConfig) {
          throw new Error(`Model ${modelToUse} not found`);
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

        // Set the model for the retry
        setCurrentRetryModel(modelToUse);

        // === RETRY LOGIC: Find the target message index ===
        const targetIndex = persistedMessages.findIndex((m) => m.id === targetMessageId);
        if (targetIndex === -1) {
          throw new Error("Target message not found in conversation");
        }

        // === RETRY LOGIC: Handle deletion based on message type ===
        let deletionStartIndex: number;
        let conversationHistoryEndIndex: number;

        if (targetMessage.role === "user") {
          conversationHistoryEndIndex = targetIndex + 1;
          deletionStartIndex = targetIndex + 1;
          while (deletionStartIndex < persistedMessages.length && persistedMessages[deletionStartIndex].role !== "assistant") {
            deletionStartIndex++;
          }
        } else {
          deletionStartIndex = targetIndex;
          conversationHistoryEndIndex = targetIndex;
        }

        // === RETRY LOGIC: Delete messages from the determined start point ===
        if (deletionStartIndex < persistedMessages.length) {
          const messagesToDelete = persistedMessages.slice(deletionStartIndex);
          
          for (let i = messagesToDelete.length - 1; i >= 0; i--) {
            const messageToDelete = messagesToDelete[i];
            await deleteMessage(messageToDelete.id);
          }
        }

        // === RETRY LOGIC: Get conversation history up to the determined point ===
        const conversationHistory: ChatMessage[] = persistedMessages
          .slice(0, conversationHistoryEndIndex)
          .map((msg) => ({
            role: msg.role as "system" | "user" | "assistant",
            content: msg.content || "",
          }));

        // === RETRY LOGIC: Use chat hook with selected model to resend the message ===
        await chatHook.sendMessages(conversationHistory, { 
          stream: true,
          chatId 
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
        setCurrentRetryModel(undefined);
      }
    },
    [
      chatId,
      persistedMessages,
      defaultModel,
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
    isRetrying: isRetrying || chatHook.isLoading,
    retryError,
    clearRetryError,
  };
} 