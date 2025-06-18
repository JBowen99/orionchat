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
  FileText,
  Clock,
  Brain,
  Layers,
} from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import ModelSelector from "./model-selector";
import { useChatMessageContext } from "~/contexts/chat-message-context";
import { useSettings } from "~/contexts/settings-context";
import { getModelById, DEFAULT_MODEL_ID } from "~/lib/models";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router";
import { createClient } from "~/lib/client";
import { useUser } from "~/contexts/user-context";
import { useChatContext } from "~/contexts/chat-list-context";
import { useChat } from "~/hooks/use-chat";
import { useModel } from "~/routes/chat";
import { OpenRouterIcon } from "./openrouter-icon";

interface ChatInputProps {
  disabled?: boolean;
  placeholder?: string;
  showScrollButton?: boolean;
  onScrollToBottom?: () => void;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

export default function ChatInput({
  disabled = false,
  placeholder = "Type your message...",
  showScrollButton = false,
  onScrollToBottom,
  selectedModel: propSelectedModel,
  onModelChange,
}: ChatInputProps) {
  // Try to use ModelContext first, fall back to props, then to internal state
  let selectedModel: string;
  let setSelectedModel: (model: string) => void;

  try {
    const modelContext = useModel();
    selectedModel = modelContext.selectedModel;
    setSelectedModel = modelContext.setSelectedModel;
  } catch {
    // Fall back to props or internal state if context is not available
    const [internalSelectedModel, setInternalSelectedModel] = useState<string>(
      propSelectedModel || DEFAULT_MODEL_ID
    );
    selectedModel = propSelectedModel || internalSelectedModel;
    setSelectedModel = onModelChange || setInternalSelectedModel;
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const supabase = createClient();
  const { user } = useUser();
  const { preferences } = useSettings();

  const { chatId } = useChatMessageContext();
  const { refreshChats } = useChatContext();

  // Use the useChat hook with persistence enabled
  const {
    isLoading,
    error,
    sendMessage,
    clearError,
    // === SUMMARIZATION FEATURES ===
    chatSummary,
    isUpdatingSummary,
    summaryError,
    clearSummaryError,
  } = useChat({
    model: selectedModel,
    usePersistedMessages: true,
    enableSystemPrompts: true,
    temperature: 0.7,
    maxTokens: 4096,
    // === SUMMARIZATION CONFIGURATION ===
    enableSummarization: true,
    summaryThreshold: 8, // Start summarizing after 8 messages for testing
    onSummaryUpdate: (summary: string) => {
      console.log("✅ 📄 Conversation summary updated:", {
        length: summary.length,
        chatId: chatId,
        selectedModel: selectedModel,
        preview: summary.substring(0, 100) + "...",
      });
    },
    onSummaryError: (error: Error) => {
      console.error("❌ Summary generation failed:", error.message);
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
    onResponse: (response) => {
      console.log("🔥 Chat response received:", {
        model: response.model,
        selectedModel: selectedModel,
        contentLength: response.content.length,
        chatId: chatId,
        summarizationEnabled: true,
        currentSummary: chatSummary?.substring(0, 50) + "..." || "No summary",
      });
    },
  });

  // === DEBUG: Log current state ===
  console.log("🎯 ChatInput Debug State:", {
    selectedModel,
    chatId,
    isLoading,
    isUpdatingSummary,
    hasChatSummary: !!chatSummary,
    chatSummaryLength: chatSummary?.length || 0,
    summaryError,
    enableSummarization: true,
    summaryThreshold: 8,
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

  // Get context management icon based on the selected method
  const getContextIcon = () => {
    switch (preferences.context_management_method) {
      case "full":
        return <FileText className="w-4 h-4" />;
      case "recent_messages":
        return <Clock className="w-4 h-4" />;
      case "model_summary":
        return <Brain className="w-4 h-4" />;
      case "smart_summary":
        return <Layers className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getContextTooltip = () => {
    switch (preferences.context_management_method) {
      case "full":
        return "Full conversation context";
      case "recent_messages":
        return "Recent messages only";
      case "model_summary":
        return "AI-generated summary";
      case "smart_summary":
        return "Smart summary + recent";
      default:
        return "Full conversation context";
    }
  };

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

      <div className="chat-input-area flex flex-col items-center pt-2 px-2 justify-center w-3/4 max-w-4xl rounded-t-xl">
        <div className="chat-input-area flex flex-col w-full py-2 px-2 rounded-t-lg gap-2">
          <div className="flex flex-row items-center justify-center w-full">
            <Textarea
              ref={textareaRef}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              disabled={disabled || isLoading}
              className="scrollbar-hide resize-none min-h-[2.5rem] max-h-52 py-2 px-3 text-sm md:text-base focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:border-0"
            />
          </div>

          <div className="flex flex-row items-center justify-start w-full gap-2">
            <ModelSelector
              value={selectedModel}
              onValueChange={setSelectedModel}
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-7 h-7 text-muted-foreground"
                >
                  {getContextIcon()}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{getContextTooltip()}</p>
                {chatSummary && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Summary: {chatSummary.length} chars
                  </p>
                )}
              </TooltipContent>
            </Tooltip>

            {/* Summarization Status Indicator */}
            {isUpdatingSummary && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-7 h-7 text-blue-500"
                    disabled
                  >
                    <Brain className="w-4 h-4 animate-pulse" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Generating conversation summary...</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Summary Error Indicator */}
            {summaryError && !isUpdatingSummary && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-7 h-7 text-orange-500"
                    onClick={clearSummaryError}
                  >
                    <Brain className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Summary generation failed</p>
                  <p className="text-xs text-muted-foreground">
                    Click to dismiss
                  </p>
                </TooltipContent>
              </Tooltip>
            )}

            {preferences.use_openrouter && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <OpenRouterIcon className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Using OpenRouter</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/*
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
            */}

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
