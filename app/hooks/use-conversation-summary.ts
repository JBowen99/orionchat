import { useState, useCallback } from "react";
import { useApiKeys } from "~/contexts/api-keys-context";
import { chatService } from "~/services/chat.service";
import type { ChatMessage } from "~/services/chat.service";
import type { Message } from "~/contexts/chat-message-context";

export interface UseConversationSummaryOptions {
  model?: string;
  maxSummaryLength?: number;
  onSummaryStart?: () => void;
  onSummaryComplete?: (summary: string) => void;
  onSummaryError?: (error: Error) => void;
}

export interface UseConversationSummaryReturn {
  createSummary: (messages: Message[] | ChatMessage[]) => Promise<string>;
  updateSummary: (currentSummary: string, newMessages: Message[] | ChatMessage[]) => Promise<string>;
  isGenerating: boolean;
  summaryError: string | null;
  clearSummaryError: () => void;
}

export function useConversationSummary(
  options: UseConversationSummaryOptions = {}
): UseConversationSummaryReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const { apiKeys } = useApiKeys();

  const {
    model = "gemini-2.5-flash-preview-05-20",
    maxSummaryLength = 200,
    onSummaryStart,
    onSummaryComplete,
    onSummaryError,
  } = options;

  const clearSummaryError = useCallback(() => {
    setSummaryError(null);
  }, []);

  // Convert any message format to ChatMessage format
  const normalizeMessages = useCallback((messages: Message[] | ChatMessage[]): ChatMessage[] => {
    return messages.map((msg) => {
      // Check if it's already a ChatMessage format
      if ('role' in msg && typeof msg.role === 'string' && 'content' in msg && typeof msg.content === 'string') {
        return msg as ChatMessage;
      }
      
      // Convert from Message (database) format to ChatMessage format
      const dbMessage = msg as Message;
      return {
        role: dbMessage.role as "system" | "user" | "assistant",
        content: dbMessage.content || "",
      };
    });
  }, []);

  // Generate system prompt for summarization
  const createSummaryPrompt = useCallback((
    type: 'create' | 'update',
    currentSummary?: string
  ): string => {
    const basePrompt = `You are a helpful assistant that creates concise, informative summaries of conversations. `;
    
    if (type === 'create') {
      return `${basePrompt}Please analyze the following conversation and create a clear, comprehensive summary that captures:

1. The main topics discussed
2. Key questions asked and answers provided  
3. Important decisions or conclusions reached
4. Any action items or next steps mentioned

Keep the summary concise but informative, around ${maxSummaryLength} words or less. Focus on the most important and relevant information.

Conversation to summarize:`;
    } else {
      return `${basePrompt}I have an existing conversation summary and some new messages. Please update the summary to include the new information while maintaining coherence and keeping it concise.

Current summary:
${currentSummary}

Please analyze the new messages below and create an updated summary that:
1. Incorporates the new information
2. Maintains the context from the existing summary
3. Removes any redundant information
4. Stays around ${maxSummaryLength} words or less

New messages to incorporate:`;
    }
  }, [maxSummaryLength]);

  // Convert messages to a readable format for the AI
  const formatMessagesForSummary = useCallback((messages: ChatMessage[]): string => {
    return messages
      .filter(msg => msg.role !== 'system') // Exclude system messages from summary
      .map((msg, index) => {
        const speaker = msg.role === 'user' ? 'User' : 'Assistant';
        return `${index + 1}. ${speaker}: ${msg.content}`;
      })
      .join('\n\n');
  }, []);

  const createSummary = useCallback(
    async (messages: Message[] | ChatMessage[]): Promise<string> => {
      if (!messages || messages.length === 0) {
        throw new Error("No messages provided for summarization");
      }

      setIsGenerating(true);
      setSummaryError(null);
      
      if (onSummaryStart) {
        onSummaryStart();
      }

      try {
        const normalizedMessages = normalizeMessages(messages);
        const systemPrompt = createSummaryPrompt('create');
        const formattedMessages = formatMessagesForSummary(normalizedMessages);

        const summaryMessages: ChatMessage[] = [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user", 
            content: formattedMessages,
          },
        ];

        // Prepare API keys for the chat service
        const apiKeysForService = Object.entries(apiKeys).reduce(
          (acc, [provider, keyEntry]) => {
            acc[provider as keyof typeof apiKeys] = keyEntry?.key || null;
            return acc;
          },
          {} as Record<keyof typeof apiKeys, string | null>
        );

        const response = await chatService.generateChatCompletion({
          model,
          messages: summaryMessages,
          temperature: 0.3, // Lower temperature for more consistent summaries
          maxTokens: Math.ceil(maxSummaryLength * 1.5), // Give some buffer for tokens
        }, apiKeysForService);

        const summary = response.content.trim();
        
        if (onSummaryComplete) {
          onSummaryComplete(summary);
        }

        return summary;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to create summary";
        setSummaryError(errorMessage);
        
        if (onSummaryError) {
          onSummaryError(error instanceof Error ? error : new Error(errorMessage));
        }
        
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [
      model,
      maxSummaryLength,
      apiKeys,
      normalizeMessages,
      createSummaryPrompt,
      formatMessagesForSummary,
      onSummaryStart,
      onSummaryComplete,
      onSummaryError,
    ]
  );

  const updateSummary = useCallback(
    async (currentSummary: string, newMessages: Message[] | ChatMessage[]): Promise<string> => {
      if (!currentSummary.trim()) {
        throw new Error("Current summary is required for update");
      }
      
      if (!newMessages || newMessages.length === 0) {
        throw new Error("No new messages provided for summary update");
      }

      setIsGenerating(true);
      setSummaryError(null);
      
      if (onSummaryStart) {
        onSummaryStart();
      }

      try {
        const normalizedMessages = normalizeMessages(newMessages);
        const systemPrompt = createSummaryPrompt('update', currentSummary);
        const formattedMessages = formatMessagesForSummary(normalizedMessages);

        const summaryMessages: ChatMessage[] = [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: formattedMessages,
          },
        ];

        // Prepare API keys for the chat service
        const apiKeysForService = Object.entries(apiKeys).reduce(
          (acc, [provider, keyEntry]) => {
            acc[provider as keyof typeof apiKeys] = keyEntry?.key || null;
            return acc;
          },
          {} as Record<keyof typeof apiKeys, string | null>
        );

        const response = await chatService.generateChatCompletion({
          model,
          messages: summaryMessages,
          temperature: 0.3, // Lower temperature for more consistent summaries
          maxTokens: Math.ceil(maxSummaryLength * 1.5), // Give some buffer for tokens
        }, apiKeysForService);

        const updatedSummary = response.content.trim();
        
        if (onSummaryComplete) {
          onSummaryComplete(updatedSummary);
        }

        return updatedSummary;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to update summary";
        setSummaryError(errorMessage);
        
        if (onSummaryError) {
          onSummaryError(error instanceof Error ? error : new Error(errorMessage));
        }
        
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [
      model,
      maxSummaryLength,
      apiKeys,
      normalizeMessages,
      createSummaryPrompt,
      formatMessagesForSummary,
      onSummaryStart,
      onSummaryComplete,
      onSummaryError,
    ]
  );

  return {
    createSummary,
    updateSummary,
    isGenerating,
    summaryError,
    clearSummaryError,
  };
} 