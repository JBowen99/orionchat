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
import { useChat } from "~/hooks/use-chat";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const supabase = createClient();
  const { user } = useUser();

  const { chatId } = useChatMessageContext();
  const { refreshChats } = useChatContext();

  // Use the useChat hook with persistence enabled
  const { isLoading, error, sendMessage, clearError } = useChat({
    model: selectedModel,
    usePersistedMessages: true,
    enableSystemPrompts: true,
    temperature: 0.7,
    maxTokens: 4096,
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

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

    try {
      let currentChatId = chatId;

      // If no chatId, create a new chat first
      if (!currentChatId) {
        if (!user) {
          throw new Error("Please sign in to start a chat");
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
          throw new Error("Failed to create new chat. Please try again.");
        }

        currentChatId = newChat.id;
        // Refresh chats
        refreshChats();

        // Navigate to the new chat
        navigate(`/chat/${currentChatId}`);

        // Wait for navigation and context to update
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Clear any previous errors
      if (error) {
        clearError();
      }

      // Ensure we have a valid chatId before sending
      if (!currentChatId) {
        throw new Error(
          "No chat ID available after chat creation. Please try again."
        );
      }

      // Send the message using the hook
      await sendMessage(messageContent, {
        model: selectedModel,
        chatId: currentChatId,
      });
    } catch (err) {
      console.error("Error sending message:", err);

      // Restore the message content in the textarea if sending failed
      if (textareaRef.current && !textareaRef.current.value.trim()) {
        textareaRef.current.value = messageContent;
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height =
          textareaRef.current.scrollHeight + "px";
      }

      // Show specific error message based on error type
      if (err instanceof Error) {
        if (err.message.includes("chat ID")) {
          console.error("Chat creation issue:", err.message);
          // The useChat hook will handle the error display
        } else {
          console.error("Message sending failed:", err.message);
        }
      }
      // Error handling is now managed by the useChat hook
    }
  }, [
    isLoading,
    chatId,
    selectedModel,
    navigate,
    supabase,
    user,
    refreshChats,
    sendMessage,
    error,
    clearError,
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
              className="w-8 h-8 ml-auto bg-primary hover:bg-primary/80 "
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
