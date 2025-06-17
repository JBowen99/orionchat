import { Link, useParams } from "react-router";
import { type Chat } from "~/contexts/chat-list-context";
import { cn } from "~/lib/utils";
import { Pin } from "lucide-react";

export default function ChatListItem({ chat }: { chat: Chat }) {
  const { chatId } = useParams();
  const isActive = chatId === chat.id;

  return (
    <Link
      to={`/chat/${chat.id}`}
      className={cn(
        "relative flex items-center justify-between p-2 rounded-lg hover:bg-sidebar-accent transition-all duration-200 cursor-pointer group",
        isActive && "bg-sidebar-accent"
      )}
    >
      <div className="truncate flex-1 mr-2">{chat.title}</div>
    </Link>
  );
}
