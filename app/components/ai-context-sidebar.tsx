import { Button } from "./ui/button";
import {
  X,
  Copy,
  Check,
  Brain,
  MessageSquare,
  User,
  Settings,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useSettings } from "~/contexts/settings-context";
import { useChatMessageContext } from "~/contexts/chat-message-context";
import { useChat } from "~/hooks/use-chat";
import { useChatContext } from "~/contexts/chat-list-context";
import { systemPromptBuilder } from "~/lib/system-prompt-builder";
import { getModelById } from "~/lib/models";
import { useState, useMemo, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useModel } from "~/routes/chat";

interface AiContextSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentModel?: string;
}

export default function AiContextSidebar({
  isOpen,
  onToggle,
  currentModel: propCurrentModel,
}: AiContextSidebarProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const { preferences } = useSettings();
  const { messages, chatId } = useChatMessageContext();
  const { getCurrentChat, chats } = useChatContext();

  // Get current model from context or use prop as fallback
  let currentModel: string;
  try {
    const modelContext = useModel();
    currentModel = modelContext.selectedModel;
  } catch {
    currentModel = propCurrentModel || "gemini-2.5-flash-preview-05-20";
  }

  // Get current chat data including summary
  const currentChat = getCurrentChat();
  const chatSummary = currentChat?.chat_summary || null;

  // Get summarization status from useChat hook (for loading states only)
  const { isUpdatingSummary } = useChat({
    usePersistedMessages: true,
    enableSummarization: true,
  });

  // Generate current system prompt
  const currentSystemPrompt = useMemo(() => {
    return systemPromptBuilder.buildContextAwareSystemPrompt({
      userSettings: preferences,
      modelConfig: getModelById(currentModel),
      conversationSummary: chatSummary || undefined,
      allMessages: messages.map((msg) => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content || "",
      })),
    });
  }, [preferences, currentModel, chatSummary, messages]);

  // Message statistics
  const messageStats = useMemo(() => {
    const userMessages = messages.filter((m) => m.role === "user").length;
    const assistantMessages = messages.filter(
      (m) => m.role === "assistant"
    ).length;
    const totalLength = messages.reduce(
      (sum, m) => sum + (m.content?.length || 0),
      0
    );

    return {
      total: messages.length,
      user: userMessages,
      assistant: assistantMessages,
      totalChars: totalLength,
      avgLength:
        messages.length > 0 ? Math.round(totalLength / messages.length) : 0,
    };
  }, [messages]);

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const copyFullContext = async () => {
    const fullContext = `AI CONTEXT EXPORT
==================

SYSTEM PROMPT:
${currentSystemPrompt}

USER TRAITS:
${preferences.traits?.join(", ") || "None set"}

USER INFO:
Name: ${preferences.name || "Not set"}
Additional Info: ${preferences.additional_info || "None"}

MESSAGE STATISTICS:
Total Messages: ${messageStats.total}
User Messages: ${messageStats.user}
Assistant Messages: ${messageStats.assistant}
Total Characters: ${messageStats.totalChars}
Average Message Length: ${messageStats.avgLength}

CONVERSATION SUMMARY:
${chatSummary || "No summary available"}

CHAT ID: ${chatId || "No active chat"}
MODEL: ${currentModel}
GENERATED: ${new Date().toISOString()}
`;

    await copyToClipboard(fullContext, "full");
  };

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-80 bg-sidebar text-sidebar-foreground border-l border-sidebar-border transition-transform duration-200 ease-in-out hidden md:flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex flex-col gap-2 p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <span className="font-medium">AI Context</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            This is what the AI understands about this chat
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="flex flex-col gap-4">
            {/* System Prompt Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <h3 className="font-medium text-sm">System Prompt</h3>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() =>
                        copyToClipboard(currentSystemPrompt, "system")
                      }
                    >
                      {copiedSection === "system" ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy system prompt</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md max-h-32 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-mono text-xs">
                  {currentSystemPrompt || "No system prompt generated"}
                </pre>
              </div>
              <div className="text-xs text-muted-foreground">
                Length: {currentSystemPrompt.length} characters
              </div>
            </div>

            {/* User Traits Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <h3 className="font-medium text-sm">User Profile</h3>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() =>
                        copyToClipboard(
                          `Name: ${preferences.name || "Not set"}\nTraits: ${
                            preferences.traits?.join(", ") || "None"
                          }\nInfo: ${preferences.additional_info || "None"}`,
                          "user"
                        )
                      }
                    >
                      {copiedSection === "user" ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy user profile</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md space-y-1">
                <div>
                  <strong>Name:</strong> {preferences.name || "Not set"}
                </div>
                <div>
                  <strong>Traits:</strong>{" "}
                  {preferences.traits?.join(", ") || "None set"}
                </div>
                {preferences.additional_info && (
                  <div>
                    <strong>Additional Info:</strong>{" "}
                    {preferences.additional_info}
                  </div>
                )}
              </div>
            </div>

            {/* Messages Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <h3 className="font-medium text-sm">Messages</h3>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() =>
                        copyToClipboard(
                          `Total: ${messageStats.total}\nUser: ${messageStats.user}\nAssistant: ${messageStats.assistant}\nTotal Characters: ${messageStats.totalChars}\nAverage Length: ${messageStats.avgLength}`,
                          "messages"
                        )
                      }
                    >
                      {copiedSection === "messages" ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy message statistics</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md space-y-1">
                <div>
                  <strong>Total Messages:</strong> {messageStats.total}
                </div>
                <div>
                  <strong>User Messages:</strong> {messageStats.user}
                </div>
                <div>
                  <strong>Assistant Messages:</strong> {messageStats.assistant}
                </div>
                <div>
                  <strong>Total Characters:</strong>{" "}
                  {messageStats.totalChars.toLocaleString()}
                </div>
                <div>
                  <strong>Avg Message Length:</strong> {messageStats.avgLength}{" "}
                  chars
                </div>
              </div>
            </div>

            {/* Summary Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  <h3 className="font-medium text-sm">Conversation Summary</h3>
                  {isUpdatingSummary && (
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() =>
                        copyToClipboard(
                          chatSummary || "No summary available",
                          "summary"
                        )
                      }
                      disabled={!chatSummary}
                    >
                      {copiedSection === "summary" ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy conversation summary</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md max-h-32 overflow-y-auto">
                {isUpdatingSummary ? (
                  <div className="flex items-center gap-2 text-blue-500">
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    Generating summary...
                  </div>
                ) : (
                  chatSummary || "No summary available"
                )}
              </div>
              {chatSummary && (
                <div className="text-xs text-muted-foreground">
                  Length: {chatSummary.length} characters
                </div>
              )}
            </div>

            {/* Context Info */}
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Context Info</h3>
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md space-y-1">
                <div>
                  <strong>Chat ID:</strong> {chatId || "No active chat"}
                </div>
                <div>
                  <strong>Model:</strong> {currentModel}
                </div>
                <div>
                  <strong>Context Method:</strong>{" "}
                  {chatSummary ? "Smart Summary + Recent" : "Full History"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <Button className="w-full mb-2" onClick={copyFullContext}>
            {copiedSection === "full" ? (
              <Tooltip>
                <TooltipTrigger>
                  <span>Copied!</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Full context copied to clipboard</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              "Copy Full Context"
            )}
          </Button>
        </div>
      </div>

      {/* Mobile sheet - similar to desktop but with sheet styling */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={onToggle} />

          {/* Sheet */}
          <div className="absolute inset-y-0 right-0 w-80 max-w-[85vw] bg-sidebar text-sidebar-foreground border-l border-sidebar-border flex flex-col">
            {/* Header */}
            <div className="flex flex-col gap-2 p-4 border-b border-sidebar-border">
              <div className="flex items-center justify-between">
                <span className="font-medium">AI Context</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">
                This is what the AI understands about this chat
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              <div className="flex flex-col gap-4">
                {/* System Prompt Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      <h3 className="font-medium text-sm">System Prompt</h3>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() =>
                            copyToClipboard(currentSystemPrompt, "system")
                          }
                        >
                          {copiedSection === "system" ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy system prompt</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md max-h-32 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-mono text-xs">
                      {currentSystemPrompt || "No system prompt generated"}
                    </pre>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Length: {currentSystemPrompt.length} characters
                  </div>
                </div>

                {/* User Traits Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <h3 className="font-medium text-sm">User Profile</h3>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() =>
                            copyToClipboard(
                              `Name: ${
                                preferences.name || "Not set"
                              }\nTraits: ${
                                preferences.traits?.join(", ") || "None"
                              }\nInfo: ${
                                preferences.additional_info || "None"
                              }`,
                              "user"
                            )
                          }
                        >
                          {copiedSection === "user" ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy user profile</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md space-y-1">
                    <div>
                      <strong>Name:</strong> {preferences.name || "Not set"}
                    </div>
                    <div>
                      <strong>Traits:</strong>{" "}
                      {preferences.traits?.join(", ") || "None set"}
                    </div>
                    {preferences.additional_info && (
                      <div>
                        <strong>Additional Info:</strong>{" "}
                        {preferences.additional_info}
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      <h3 className="font-medium text-sm">Messages</h3>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() =>
                            copyToClipboard(
                              `Total: ${messageStats.total}\nUser: ${messageStats.user}\nAssistant: ${messageStats.assistant}\nTotal Characters: ${messageStats.totalChars}\nAverage Length: ${messageStats.avgLength}`,
                              "messages"
                            )
                          }
                        >
                          {copiedSection === "messages" ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy message statistics</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md space-y-1">
                    <div>
                      <strong>Total Messages:</strong> {messageStats.total}
                    </div>
                    <div>
                      <strong>User Messages:</strong> {messageStats.user}
                    </div>
                    <div>
                      <strong>Assistant Messages:</strong>{" "}
                      {messageStats.assistant}
                    </div>
                    <div>
                      <strong>Total Characters:</strong>{" "}
                      {messageStats.totalChars.toLocaleString()}
                    </div>
                    <div>
                      <strong>Avg Message Length:</strong>{" "}
                      {messageStats.avgLength} chars
                    </div>
                  </div>
                </div>

                {/* Summary Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      <h3 className="font-medium text-sm">
                        Conversation Summary
                      </h3>
                      {isUpdatingSummary && (
                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() =>
                            copyToClipboard(
                              chatSummary || "No summary available",
                              "summary"
                            )
                          }
                          disabled={!chatSummary}
                        >
                          {copiedSection === "summary" ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy conversation summary</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md max-h-32 overflow-y-auto">
                    {isUpdatingSummary ? (
                      <div className="flex items-center gap-2 text-blue-500">
                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        Generating summary...
                      </div>
                    ) : (
                      chatSummary || "No summary available"
                    )}
                  </div>
                  {chatSummary && (
                    <div className="text-xs text-muted-foreground">
                      Length: {chatSummary.length} characters
                    </div>
                  )}
                </div>

                {/* Context Info */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">Context Info</h3>
                  <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md space-y-1">
                    <div>
                      <strong>Chat ID:</strong> {chatId || "No active chat"}
                    </div>
                    <div>
                      <strong>Model:</strong> {currentModel}
                    </div>
                    <div>
                      <strong>Context Method:</strong>{" "}
                      {chatSummary ? "Smart Summary + Recent" : "Full History"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-sidebar-border">
              <Button className="w-full" onClick={copyFullContext}>
                {copiedSection === "full" ? (
                  <Tooltip>
                    <TooltipTrigger>
                      <span>Copied!</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Full context copied to clipboard</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  "Copy Full Context"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
