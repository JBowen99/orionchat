import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSub,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  User,
  Copy,
  RotateCcw,
  Edit3,
  Loader2,
  X,
  Check,
  ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useRetryMessage } from "~/hooks/use-retry-message";
import { useChatMessageContext } from "~/contexts/chat-message-context";
import { useChat } from "~/hooks/use-chat";
import { useApiKeys } from "~/contexts/api-keys-context";
import { getModelById, getModelsByProvider } from "~/lib/models";
import type { Tables } from "database.types";

interface ChatBubbleUserProps {
  message: Tables<"messages">;
}

export function ChatBubbleUser({ message }: ChatBubbleUserProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || "");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    updateMessage,
    deleteMessage,
    messages,
    refreshMessages,
    chatId,
    addMessage,
  } = useChatMessageContext();
  const { apiKeys } = useApiKeys();

  // Use the retry hook
  const { retryMessage, isRetrying } = useRetryMessage({
    onRetryComplete: () => {},
    onRetryError: (error) => {
      console.error("Failed to retry message:", error);
      toast.error("Failed to retry message. Please try again.");
    },
  });

  // Use chat hook for sending new messages during edit
  const { sendMessages } = useChat({
    usePersistedMessages: true,
    enableSystemPrompts: true,
    onError: (error) => {
      console.error("Chat error during edit:", error);
      toast.error("Failed to generate response. Please try again.");
    },
  });

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Place cursor at end
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      toast.success("Copied to clipboard");
    }
  };

  const handleRetryWithModel = async (modelId?: string) => {
    if (isRetrying) return;

    try {
      await retryMessage(message.id, { model: modelId });
      toast.success(
        modelId
          ? `Retrying with ${getCurrentModelName(modelId)}`
          : "Retrying with same model"
      );
    } catch (error) {
      console.error("Retry failed:", error);
    }
  };

  const getCurrentModel = (): string | undefined => {
    const metadata = message.metadata as { model?: string } | null;
    return metadata?.model;
  };

  const getCurrentModelName = (modelId?: string): string => {
    const targetModelId = modelId || getCurrentModel();
    if (!targetModelId) return "Unknown Model";

    const model = getModelById(targetModelId);
    return model?.name || targetModelId;
  };

  const getAvailableProviders = () => {
    const providers = [
      { key: "google", label: "Google", models: getModelsByProvider("google") },
      { key: "openai", label: "OpenAI", models: getModelsByProvider("openai") },
      {
        key: "anthropic",
        label: "Anthropic",
        models: getModelsByProvider("anthropic"),
      },
      {
        key: "deepseek",
        label: "DeepSeek",
        models: getModelsByProvider("deepseek"),
      },
    ];

    // Filter providers that have configured API keys and available models
    return providers.filter((provider) => {
      const hasApiKey = apiKeys[provider.key as keyof typeof apiKeys]?.key;
      return hasApiKey && provider.models.length > 0;
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content || "");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content || "");
  };

  const handleSubmitEdit = async () => {
    if (isSubmittingEdit) return;

    const trimmedContent = editContent.trim();
    if (!trimmedContent) {
      toast.error("Message cannot be empty");
      return;
    }

    if (trimmedContent === message.content) {
      // No changes made
      setIsEditing(false);
      return;
    }

    if (!chatId) {
      toast.error("No chat context available");
      return;
    }

    // Immediately exit edit mode and show loading
    setIsEditing(false);
    setIsSubmittingEdit(true);

    try {
      // Find the index of the current message
      const currentIndex = messages.findIndex((m) => m.id === message.id);
      if (currentIndex === -1) {
        throw new Error("Message not found in conversation");
      }

      // Delete all messages after this one (assistant responses and subsequent messages)
      const messagesToDelete = messages.slice(currentIndex + 1);
      for (const msgToDelete of messagesToDelete) {
        await deleteMessage(msgToDelete.id);
      }

      // Update the current message with new content
      await updateMessage(message.id, {
        content: trimmedContent,
      });

      // Build conversation history up to and including the edited message
      const conversationHistory = messages
        .slice(0, currentIndex)
        .map((msg) => ({
          role: msg.role as "system" | "user" | "assistant",
          content: msg.content || "",
        }))
        .concat([
          {
            role: "user" as const,
            content: trimmedContent,
          },
        ]);

      toast.success("Message updated");

      // Send the conversation with the edited message to generate new response
      await sendMessages(conversationHistory, { stream: true, chatId });
    } catch (error) {
      console.error("Failed to edit message:", error);
      toast.error("Failed to edit message. Please try again.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  return (
    <div className="flex gap-3 justify-end">
      <div
        className={`flex gap-3 ${
          isEditing ? "w-full max-w-none" : "max-w-[80%]"
        } flex-row-reverse`}
      >
        <div
          className={`flex flex-col ${isEditing ? "w-full" : ""}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            className={`rounded-lg p-3 user-chat-bubble relative group ${
              isEditing ? "shadow-inner" : ""
            }`}
          >
            {isEditing ? (
              <div className="relative w-full">
                <Textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="resize-none border-none p-0 shadow-none focus-visible:ring-0 bg-transparent text-sm w-full overflow-hidden min-h-[2.5rem] py-2 px-3 flex items-center"
                  placeholder="Edit your message..."
                  rows={1}
                  style={{ height: "auto" }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = target.scrollHeight + "px";
                  }}
                />
              </div>
            ) : message.content ? (
              <div className="whitespace-pre-wrap text-sm">
                {message.content}
              </div>
            ) : (
              <div className="italic text-sm">No content</div>
            )}
          </div>
          {isEditing && (
            <div className="flex items-center justify-end mt-2">
              <span className="text-xs text-muted-foreground">
                enter to send | esc to cancel
              </span>
            </div>
          )}
          {/* Hover actions row - only show when not editing */}
          {!isEditing && (
            <div
              className={`flex items-center gap-2 pt-2 justify-end ${
                isHovered ? "opacity-100" : "opacity-0"
              } transition-all duration-200`}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleCopy}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy message</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={isRetrying}
                      >
                        {isRetrying ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Retry with:</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      <DropdownMenuItem onClick={() => handleRetryWithModel()}>
                        <span className="font-medium">Same model</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {getCurrentModelName()}
                        </span>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      {getAvailableProviders().map((provider) => (
                        <DropdownMenuSub key={provider.key}>
                          <DropdownMenuSubTrigger>
                            <span>{provider.label}</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {provider.models.slice(0, 5).map((model) => (
                              <DropdownMenuItem
                                key={model.id}
                                onClick={() => handleRetryWithModel(model.id)}
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm">{model.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {model.description}
                                  </span>
                                </div>
                              </DropdownMenuItem>
                            ))}
                            {provider.models.length > 5 && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleRetryWithModel(provider.models[0].id)
                                }
                              >
                                <span className="text-xs text-muted-foreground">
                                  +{provider.models.length - 5} more models...
                                </span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isRetrying ? "Retrying..." : "Retry from here"}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleEdit}
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit message</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
