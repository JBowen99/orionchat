import { Link, useParams, useLocation } from "react-router";
import { type Chat } from "~/contexts/chat-list-context";
import { useChatContext } from "~/contexts/chat-list-context";
import { cn } from "~/lib/utils";
import {
  Pin,
  Split,
  MoreHorizontal,
  Trash2,
  Share2,
  Share,
  Edit,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";
import { Button } from "../ui/button";
import { useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { useShareChat } from "~/hooks/use-share-chat";
import { ShareExpirationModal } from "../share-expiration-modal";
import { toast } from "sonner";

export default function ChatListItem({ chat }: { chat: Chat }) {
  const { chatId } = useParams();
  const { togglePin, deleteChat, renameChat, chats } = useChatContext();
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = chatId === chat.id;

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedExpiration, setSelectedExpiration] = useState("7");

  // Rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(chat.title);

  // Find parent chat if it exists
  const parentChat = chat.parent_chat_id
    ? chats.find((c) => c.id === chat.parent_chat_id)
    : null;

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

  const handlePinClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await togglePin(chat.id);
  };

  const handleShareClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteChat(chat.id);

    // If we're currently viewing the deleted chat, navigate to /chat
    if (location.pathname === `/chat/${chat.id}`) {
      navigate("/chat");
    }
  };

  const handleRenameClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRenaming(true);
    setRenameValue(chat.title);
  };

  const handleRenameSubmit = async () => {
    if (renameValue.trim() && renameValue !== chat.title) {
      await renameChat(chat.id, renameValue.trim());
      toast.success("Chat renamed successfully!");
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setIsRenaming(false);
    setRenameValue(chat.title);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      handleRenameCancel();
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleBranchClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (chat.parent_chat_id) {
      navigate(`/chat/${chat.parent_chat_id}`);
    }
  };

  // Update rename value when chat title changes
  useEffect(() => {
    setRenameValue(chat.title);
  }, [chat.title]);

  return (
    <>
      <Link
        to={`/chat/${chat.id}`}
        className={cn(
          "relative flex flex-row gap-2 items-center justify-between p-2 rounded-lg hover:bg-sidebar-accent transition-all duration-200 cursor-pointer group/chat-item",
          isActive && "bg-sidebar-accent"
        )}
      >
        {chat.parent_chat_id ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBranchClick}
                className="h-6 w-6 p-0 hover:bg-sidebar-accent-hover transition-colors"
              >
                <Split className="w-4 h-4 text-muted-foreground rotate-180" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Branched from: {parentChat?.title || "Unknown chat"}</p>
            </TooltipContent>
          </Tooltip>
        ) : null}

        {isRenaming ? (
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameSubmit}
            className="flex-1 bg-transparent border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
        ) : (
          <div className="truncate flex-1">{chat.title}</div>
        )}

        {/* Hover buttons */}
        <div
          className="absolute right-2 flex items-center gap-1 opacity-0 group-hover/chat-item:opacity-100 
        group-hover/chat-item:motion-opacity-in-0 group-hover/chat-item:motion-translate-x-in-50 group-hover/chat-item:motion-blur-in-md motion-duration-[0.25s] z-10 rounded"
        >
          <div className="flex flex-row bg-gradient-to-r from-sidebar-accent/0 to-sidebar-accent/100 to-25% pl-8 items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={handlePinClick}
                  className={cn(
                    "h-8 w-8 p-0 transition-colors",
                    chat.pinned && "text-destructive"
                  )}
                >
                  <Pin
                    className="w-4 h-4"
                    color={
                      chat.pinned
                        ? "var(--destructive)"
                        : "var(--sidebar-accent-foreground)"
                    }
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{chat.pinned ? "Unpin chat" : "Pin chat"}</p>
              </TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      onClick={handleMenuClick}
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-sidebar-accent-hover transition-colors"
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>More options</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShareClick}>
                  <Share className="w-4 h-4" />
                  Share chat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRenameClick}>
                  <Edit className="w-4 h-4" />
                  Rename chat
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Link>

      {/* Share Modal */}
      <ShareExpirationModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        selectedExpiration={selectedExpiration}
        onExpirationChange={setSelectedExpiration}
        onConfirm={handleShareConfirm}
        isSharing={isSharing}
      />
    </>
  );
}
