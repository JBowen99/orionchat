import { Button } from "~/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";
import {
  Copy,
  RotateCcw,
  Share,
  Split,
  XCircle,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import type { Tables } from "database.types";
import { toast } from "sonner";
import { MarkdownRenderer } from "~/components/markdown-renderer";
import { useChatMessageContext } from "~/contexts/chat-message-context";

interface ChatBubbleResponseProps {
  message: Tables<"messages">;
  isGenerating?: boolean;
}

export function ChatBubbleResponse({
  message,
  isGenerating = false,
}: ChatBubbleResponseProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isBranching, setIsBranching] = useState(false);
  const { retryResponse, branchConversation } = useChatMessageContext();

  // Extract model and streaming info from metadata
  const metadata = message.metadata as {
    model?: string;
    error?: string;
    errorType?: string;
    errorCode?: string;
    timestamp?: string;
    originalError?: string;
    streaming?: boolean;
    loading?: boolean;
  } | null;
  const model = metadata?.model || "Claude 3.5 Sonnet";
  const isError = message.type === "error" || !!metadata?.error;
  const isStreaming = metadata?.streaming === true;
  const isLoading = metadata?.loading === true;
  const errorMessage = metadata?.error || message.content;
  const errorType = metadata?.errorType;
  const errorCode = metadata?.errorCode;
  const errorTimestamp = metadata?.timestamp;
  const originalError = metadata?.originalError;

  const handleCopy = () => {
    const contentToCopy =
      isError && errorMessage ? errorMessage : message.content;
    if (contentToCopy) {
      navigator.clipboard.writeText(contentToCopy);
      toast.success("Copied to clipboard");
    }
  };

  const handleCopyError = () => {
    if (originalError) {
      navigator.clipboard.writeText(originalError);
      toast.success("Technical details copied to clipboard");
    }
  };

  const handleRetry = async () => {
    if (isRetrying) return;

    setIsRetrying(true);
    try {
      await retryResponse(message.id);
    } catch (error) {
      console.error("Failed to retry response:", error);
      toast.error("Failed to retry response. Please try again.");
    } finally {
      setIsRetrying(false);
    }
  };

  const handleBranch = async () => {
    if (isBranching) return;

    setIsBranching(true);
    try {
      await branchConversation(message.id);
      toast.success("Conversation branched successfully");
    } catch (error) {
      console.error("Failed to branch conversation:", error);
      toast.error("Failed to branch conversation. Please try again.");
    } finally {
      setIsBranching(false);
    }
  };

  const handleEdit = () => {
    // TODO: Implement edit functionality
    console.log("Edit message:", message.id);
  };

  const renderContent = () => {
    if (isError) {
      return (
        <>
          <Alert variant="destructive" className="mb-3">
            <XCircle className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              Error
              {errorCode && (
                <span className="text-xs font-mono bg-destructive/20 px-1.5 py-0.5 rounded">
                  {errorCode}
                </span>
              )}
            </AlertTitle>
            <AlertDescription>
              There was an error generating a response, please try again.
            </AlertDescription>
          </Alert>

          {/* Error details section */}
          {metadata?.error && (
            <div className="mt-3 pt-2 border-t border-red-300 dark:border-red-700">
              {originalError &&
              originalError !==
                message.content?.replace(/❌ \*\*Error\*\*: /, "").trim() &&
              originalError.length > 0 ? (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs hover:bg-destructive/10 w-full justify-start"
                    >
                      <ChevronRight className="w-3 h-3 mr-1 transition-transform duration-200 data-[state=open]:rotate-90" />
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      View technical details
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="bg-destructive/5 p-3 rounded text-xs font-mono text-destructive whitespace-pre-wrap border border-destructive/20 max-h-32 overflow-y-auto relative group max-w-full break-words">
                      <div className="pr-8 break-all">{originalError}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleCopyError}
                        title="Copy technical details"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}
            </div>
          )}
        </>
      );
    }

    // Show loading spinner
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Thinking...</span>
        </div>
      );
    }

    if (message.content) {
      return (
        <MarkdownRenderer
          content={message.content}
          className="text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
        />
      );
    }

    return <div className="italic text-sm">No content</div>;
  };

  return (
    <div className="flex gap-3 justify-start">
      <div className="flex gap-3 max-w-[80%] flex-row">
        <div
          className="flex flex-col"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            className={`rounded-lg p-3 relative group ${
              isError
                ? "bg-destructive/5 border border-destructive/20"
                : "response-chat-bubble"
            }`}
          >
            {renderContent()}
          </div>
          {/* Hover actions row - don't show during loading or streaming */}
          {!isStreaming && !isLoading && (
            <div
              className={`flex items-center text-muted-foreground gap-2 pt-2  ${
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
                  <p>Copy response</p>
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
                    <Share className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Share response</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleRetry}
                    disabled={isRetrying}
                  >
                    {isRetrying ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isRetrying ? "Retrying..." : "Retry response"}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleBranch}
                    disabled={isBranching}
                  >
                    {isBranching ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Split className="h-3 w-3 rotate-180" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isBranching ? "Branching..." : "Branch conversation"}</p>
                </TooltipContent>
              </Tooltip>

              <span className="text-xs">{isError ? "Error" : model}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
