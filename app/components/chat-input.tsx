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
import { useNavigate } from "react-router";
import { createClient } from "~/lib/client";
import { useUser } from "~/contexts/user-context";
import { useChatContext } from "~/contexts/chat-list-context";

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
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL_ID);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const supabase = createClient();
  const { user } = useUser();

  const { addMessage, chatId, messages, updateMessage } =
    useChatMessageContext();
  const { apiKeys } = useApiKeys();
  const { refreshChats } = useChatContext();

  // Auto-resize textarea on input
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  };

  const handleSendMessage = useCallback(async () => {
    const input = textareaRef.current?.value.trim() || "";
    if (!input || isLoading || !selectedModel) return;

    const messageContent = input;
    // Clear the textarea
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
    setIsLoading(true);

    try {
      let currentChatId = chatId;

      // If no chatId, create a new chat first
      if (!currentChatId) {
        if (!user) {
          // Create error message for sign-in requirement
          const errorMessageId = uuidv4();
          const errorMessage = {
            id: errorMessageId,
            chat_id: "temp", // Temporary ID since we don't have a chat yet
            role: "assistant" as const,
            content: "Please sign in to start a chat",
            type: "error",
            created_at: new Date().toISOString(),
            parent_message_id: null,
            metadata: { error: "Authentication required" },
          };
          await addMessage(errorMessage);
          setIsLoading(false);
          return;
        }

        const { data: newChat, error: chatError } = await supabase
          .from("chats")
          .insert({
            title:
              messageContent.length > 50
                ? messageContent.slice(0, 50) + "..."
                : messageContent,
            user_id: user.id,
          })
          .select()
          .single();

        if (chatError || !newChat) {
          console.error("Error creating new chat:", chatError);
          // Create error message for chat creation failure
          const errorMessageId = uuidv4();
          const errorMessage = {
            id: errorMessageId,
            chat_id: "temp",
            role: "assistant" as const,
            content: "Failed to create new chat. Please try again.",
            type: "error",
            created_at: new Date().toISOString(),
            parent_message_id: null,
            metadata: { error: "Chat creation failed" },
          };
          await addMessage(errorMessage);
          setIsLoading(false);
          return;
        }

        currentChatId = newChat.id;
        // Refresh chats
        refreshChats();

        // Navigate to the new chat
        navigate(`/chat/${currentChatId}`);

        // Wait for navigation and context to update
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Send the message after navigation is complete
        await sendMessageToChat(newChat.id, messageContent);
        return;
      }

      // If we already have a chatId, send the message directly
      if (currentChatId) {
        await sendMessageToChat(currentChatId, messageContent);
      } else {
        // Create error message for no chat available
        const errorMessageId = uuidv4();
        const errorMessage = {
          id: errorMessageId,
          chat_id: chatId || "temp",
          role: "assistant" as const,
          content: "No chat available. Please try refreshing the page.",
          type: "error",
          created_at: new Date().toISOString(),
          parent_message_id: null,
          metadata: { error: "No chat available" },
        };
        await addMessage(errorMessage);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message";

      // Create error message in chat
      const errorMessageId = uuidv4();
      const errorMessageObj = {
        id: errorMessageId,
        chat_id: chatId || "temp",
        role: "assistant" as const,
        content: errorMessage,
        type: "error",
        created_at: new Date().toISOString(),
        parent_message_id: null,
        metadata: { error: errorMessage },
      };
      await addMessage(errorMessageObj);
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading,
    chatId,
    selectedModel,
    navigate,
    supabase,
    user,
    refreshChats,
    addMessage,
  ]);

  const sendMessageToChat = useCallback(
    async (currentChatId: string, messageContent: string) => {
      let userMessageId: string | null = null;

      try {
        // Create user message
        userMessageId = uuidv4();
        const userMessage = {
          id: userMessageId,
          chat_id: currentChatId,
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
          chat_id: currentChatId,
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
        console.error("Error in sendMessageToChat:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";

        // Create error message in chat
        const errorMessageId = uuidv4();
        const errorMessageObj = {
          id: errorMessageId,
          chat_id: currentChatId,
          role: "assistant" as const,
          content: errorMessage,
          type: "error",
          created_at: new Date().toISOString(),
          parent_message_id: userMessageId,
          metadata: {
            error: errorMessage,
            originalError: err instanceof Error ? err.stack : String(err),
          },
        };

        // If we have a streaming message, update it with error, otherwise create new error message
        if (streamingMessageId) {
          try {
            await updateMessage(streamingMessageId, {
              content: errorMessage,
              type: "error",
              metadata: {
                error: errorMessage,
                originalError: err instanceof Error ? err.stack : String(err),
              },
            });
          } catch (updateErr) {
            console.error("Error updating message with error:", updateErr);
            // If update fails, create a new error message
            await addMessage(errorMessageObj);
          }
          setStreamingMessageId(null);
        } else {
          await addMessage(errorMessageObj);
        }
        throw err; // Re-throw to be handled by the calling function
      }
    },
    [
      addMessage,
      updateMessage,
      apiKeys,
      messages,
      selectedModel,
      setStreamingMessageId,
      streamingMessageId,
    ]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  const canSend = !isLoading && selectedModel;

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
          <div className="flex flex-row items-center justify-center w-full gap-2">
            <Textarea
              ref={textareaRef}
              onChange={handleInputChange}
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
              className="w-8 h-8 ml-auto bg-primary hover:bg-primary/90 "
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
