import { Button } from "~/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Copy,
  RotateCcw,
  Share,
  Split,
  XCircle,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import type { Tables } from "database.types";
import { toast } from "sonner";
import { MarkdownRenderer } from "~/components/markdown-renderer";

interface ChatBubbleResponseProps {
  message: Tables<"messages">;
  onRetry?: (parentMessageId: string) => void;
  isGenerating?: boolean;
}

export function ChatBubbleResponse({
  message,
  onRetry,
  isGenerating = false,
}: ChatBubbleResponseProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Extract model and error info from metadata
  const metadata = message.metadata as {
    model?: string;
    error?: string;
    errorType?: string;
    errorCode?: string;
    timestamp?: string;
    originalError?: string;
  } | null;
  const model = metadata?.model || "Claude 3.5 Sonnet";
  const isError = message.type === "error" || !!metadata?.error;
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

  const handleRegenerate = () => {
    // TODO: Implement regenerate functionality
    console.log("Regenerate message:", message.id);
  };

  const handleEdit = () => {
    // TODO: Implement edit functionality
    console.log("Edit message:", message.id);
  };

  const handleRetryMessage = () => {
    if (onRetry && message.parent_message_id) {
      onRetry(message.parent_message_id);
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
          {/* Hover actions row */}
          <div
            className={`flex items-center text-muted-foreground gap-2 pt-2  ${
              isHovered ? "opacity-100" : "opacity-0"
            } transition-all duration-200`}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleCopy}
              title="Copy"
            >
              <Copy className="h-3 w-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleEdit}
              title="Edit"
            >
              <Share className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleRegenerate}
              title="Regenerate"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleEdit}
              title="Edit"
            >
              <Split className="h-3 w-3 rotate-180" />
            </Button>
            <span className="text-xs">{isError ? "Error" : model}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
