import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { User, Copy, RotateCcw, Edit3 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
interface ChatBubbleUserProps {
  message: {
    id: string;
    content: string | null;
    type: string;
    created_at: string;
  };
}

export function ChatBubbleUser({ message }: ChatBubbleUserProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      toast.success("Copied to clipboard");
    }
  };

  const handleRetry = () => {
    // TODO: Implement retry functionality
    console.log("Retry message:", message.id);
  };

  const handleEdit = () => {
    // TODO: Implement edit functionality
    console.log("Edit message:", message.id);
  };

  return (
    <div className="flex gap-3 justify-end">
      <div className="flex gap-3 max-w-[80%] flex-row-reverse">
        <div
          className="flex flex-col"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="rounded-lg p-3 user-chat-bubble relative group">
            {message.content ? (
              <div className="whitespace-pre-wrap text-sm">
                {message.content}
              </div>
            ) : (
              <div className="italic text-sm">No content</div>
            )}
          </div>
          {/* Hover actions row */}
          <div
            className={`flex items-center gap-2 pt-2 justify-end ${
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
              onClick={handleRetry}
              title="Retry"
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
              <Edit3 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
