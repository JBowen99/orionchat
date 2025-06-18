import React, { useState } from "react";
import { MarkdownRenderer } from "./markdown-renderer";
import { Button } from "./ui/button";
import {
  Copy,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  XCircle,
  AlertTriangle,
  RotateCcw,
  GitBranch,
  Edit,
  Loader2,
  Split,
  Share,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { toast } from "sonner";
import { useRetryMessage } from "~/hooks/use-retry-message";
import { useBranchConversation } from "~/hooks/use-branch-conversation";
import { useShareChat } from "~/hooks/use-share-chat";
import { ShareExpirationModal } from "./share-expiration-modal";
import type { Tables } from "database.types";

interface ChatBubbleResponseProps {
  message: Tables<"messages">;
  isGenerating?: boolean;
}

export function ChatBubbleResponse({
  message,
  isGenerating = false,
}: ChatBubbleResponseProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedExpiration, setSelectedExpiration] = useState("7");

  // Use the retry hook instead of context function
  const { retryMessage, isRetrying } = useRetryMessage({
    onRetryComplete: () => {},
    onRetryError: (error) => {
      console.error("Failed to retry response:", error);
      toast.error("Failed to retry response. Please try again.");
    },
  });

  // Use the branch hook instead of context function
  const { branchConversation, isBranching } = useBranchConversation({
    onBranchComplete: (newChatId) => {
      toast.success("Created branch conversation");
    },
    onBranchError: (error) => {
      console.error("Failed to branch conversation:", error);
      toast.error("Failed to branch conversation. Please try again.");
    },
  });

  // Use the share hook
  const { shareChat, isSharing } = useShareChat({
    onShareComplete: (sharedChatId, shareUrl) => {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard!");
      setShowShareModal(false);
    },
    onShareError: (error) => {
      console.error("Failed to share conversation:", error);
      toast.error("Failed to share conversation. Please try again.");
    },
  });

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

    try {
      await retryMessage(message.id);
    } catch (error) {
      // Error handling is done by the hook's onRetryError callback
      console.error("Retry failed:", error);
    }
  };

  const handleBranch = async () => {
    if (isBranching) return;

    try {
      await branchConversation(message.id);
    } catch (error) {
      // Error handling is done by the hook's onBranchError callback
      console.error("Branch failed:", error);
    }
  };

  const handleEdit = () => {
    // TODO: Implement edit functionality
    console.log("Edit message:", message.id);
  };

  const handleShareClick = () => {
    setShowShareModal(true);
  };

  const handleShareConfirm = async () => {
    try {
      const expiresInDays =
        selectedExpiration === "never"
          ? undefined
          : parseInt(selectedExpiration);
      await shareChat({ expiresInDays });
    } catch (error) {
      // Error handling is done by the hook's onShareError callback
      console.error("Share failed:", error);
    }
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
                <TooltipContent>Copy</TooltipContent>
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
                  {isRetrying ? "Retrying..." : "Retry"}
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
                  {isBranching ? "Branching..." : "Branch"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleShareClick}
                    disabled={isSharing}
                  >
                    {isSharing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Share className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isSharing ? "Sharing..." : "Share This Conversation"}
                </TooltipContent>
              </Tooltip>

              <span className="text-xs text-muted-foreground/60 ml-2">
                {model}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <ShareExpirationModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        selectedExpiration={selectedExpiration}
        onExpirationChange={setSelectedExpiration}
        onConfirm={handleShareConfirm}
        isSharing={isSharing}
      />
    </div>
  );
}
