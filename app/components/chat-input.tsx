import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  ArrowUp,
  Globe,
  Paperclip,
  SendIcon,
  Loader2,
  ArrowDown,
} from "lucide-react";
import { Textarea } from "./ui/textarea";
import ModelSelector from "./model-selector";
import { useChatMessageContext } from "~/contexts/chat-message-context";
import { useApiKeys } from "~/contexts/api-keys-context";
import { chatService } from "~/services/chat.service";
import type { ChatMessage } from "~/services/chat.service";
import { getModelById, DEFAULT_MODEL_ID } from "~/lib/models";
import { v4 as uuidv4 } from "uuid";

interface ChatInputProps {
  disabled?: boolean;
  placeholder?: string;
  showScrollButton?: boolean;
  onScrollToBottom?: () => void;
}

export default function ChatInput({
  disabled = false,
  placeholder = "Type your message...",
  showScrollButton = false,
  onScrollToBottom,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL_ID);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { addMessage, chatId, messages, updateMessage } =
    useChatMessageContext();
  const { apiKeys } = useApiKeys();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || !chatId || !selectedModel) return;

    const messageContent = input.trim();
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      // Create user message
      const userMessageId = uuidv4();
      const userMessage = {
        id: userMessageId,
        chat_id: chatId,
        role: "user" as const,
        content: messageContent,
        type: "text",
        created_at: new Date().toISOString(),
        parent_message_id: null,
        metadata: null,
      };

      // Add user message to context (this will cache and save to Supabase)
      await addMessage(userMessage);

      // Prepare API keys for the service
      const apiKeysForService = Object.entries(apiKeys).reduce(
        (acc, [provider, keyEntry]) => {
          acc[provider as keyof typeof apiKeys] = keyEntry?.key || null;
          return acc;
        },
        {} as Record<keyof typeof apiKeys, string | null>
      );

      // Get model configuration
      const modelConfig = getModelById(selectedModel);
      if (!modelConfig) {
        throw new Error(`Model ${selectedModel} not found`);
      }

      // Check if we have the required API key
      const requiredApiKey = apiKeysForService[modelConfig.provider];
      if (!requiredApiKey) {
        throw new Error(
          `No API key found for ${modelConfig.provider}. Please add an API key in Settings.`
        );
      }

      // Prepare conversation history - convert database messages to chat format
      const conversationHistory: ChatMessage[] = [
        ...messages.map((msg) => ({
          role: msg.role as "system" | "user" | "assistant",
          content: msg.content || "",
        })),
        { role: "user" as const, content: messageContent },
      ];

      // Create loading message placeholder
      const assistantMessageId = uuidv4();
      const loadingMessage = {
        id: assistantMessageId,
        chat_id: chatId,
        role: "assistant" as const,
        content: "",
        type: "text",
        created_at: new Date().toISOString(),
        parent_message_id: userMessageId,
        metadata: { loading: true },
      };

      // Add loading message
      await addMessage(loadingMessage);
      setStreamingMessageId(assistantMessageId);

      // Call the streaming chat service
      const streamingResponse = chatService.generateStreamingChatCompletion(
        {
          model: selectedModel,
          messages: conversationHistory,
          temperature: 0.7,
          maxTokens: 4096,
          stream: true,
        },
        apiKeysForService
      );

      let fullContent = "";
      let finalMetadata = null;
      let isFirstChunk = true;

      for await (const chunk of streamingResponse) {
        if (chunk.delta) {
          fullContent += chunk.delta;

          // On first chunk, remove loading state and start streaming
          if (isFirstChunk) {
            await updateMessage(assistantMessageId, {
              content: fullContent,
              metadata: { streaming: true },
            });
            isFirstChunk = false;
          } else {
            // Update the message with streaming content
            await updateMessage(assistantMessageId, {
              content: fullContent,
              metadata: { streaming: true },
            });
          }
        }

        if (chunk.finished) {
          finalMetadata = chunk.metadata;

          // Final update to mark streaming as complete
          await updateMessage(assistantMessageId, {
            content: chunk.content,
            metadata: finalMetadata
              ? JSON.parse(JSON.stringify(finalMetadata))
              : null,
          });
          break;
        }
      }

      setStreamingMessageId(null);
    } catch (err) {
      console.error("Error sending message:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message";
      setError(errorMessage);

      // If we have a streaming message, update it with error
      if (streamingMessageId) {
        await updateMessage(streamingMessageId, {
          content: `Error: ${errorMessage}`,
          metadata: { error: true },
        });
        setStreamingMessageId(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    input,
    isLoading,
    chatId,
    selectedModel,
    addMessage,
    updateMessage,
    apiKeys,
    messages,
    streamingMessageId,
  ]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  const canSend = input.trim() && !isLoading && chatId && selectedModel;

  if (!chatId) {
    return (
      <div className="chat-input-area flex flex-col items-center pt-2 px-2 justify-center w-1/2 rounded-t-xl">
        <div className="text-sm text-muted-foreground text-center">
          No chat selected
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Scroll to bottom button */}
      {showScrollButton && onScrollToBottom && (
        <div className="chat-input-area rounded-xl mb-2 motion-opacity-in-0 motion-translate-y-in-100 motion-blur-in-md">
          <Button
            variant="secondary"
            size="sm"
            onClick={onScrollToBottom}
            className="h-8 px-3"
          >
            <span className="text-xs text-muted-foreground">
              Scroll to bottom
            </span>
          </Button>
        </div>
      )}

      <div className="chat-input-area flex flex-col items-center pt-2 px-2 justify-center w-1/2 rounded-t-xl">
        <div className="chat-input-area flex flex-col w-full py-2 px-2 rounded-t-lg gap-2">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-2 flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40"
                onClick={() => setError(null)}
              >
                ×
              </Button>
            </div>
          )}

          <div className="flex flex-row items-center justify-center w-full gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              disabled={disabled || isLoading}
              className="scrollbar-hide resize-none min-h-[2.5rem] max-h-52 py-2 px-3 text-sm md:text-base focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:border-border"
            />
          </div>

          <div className="flex flex-row items-center justify-start w-full gap-2">
            <ModelSelector
              value={selectedModel}
              onValueChange={setSelectedModel}
            />

            <Button
              variant="ghost"
              className="w-7 h-7 text-muted-foreground"
              disabled
            >
              <Globe />
            </Button>

            <Button
              variant="ghost"
              className="w-7 h-7 text-muted-foreground"
              disabled
            >
              <Paperclip />
            </Button>

            <Button
              size="icon"
              className="w-8 h-8 ml-auto bg-primary hover:bg-primary/90"
              onClick={handleSendMessage}
              disabled={!canSend}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
