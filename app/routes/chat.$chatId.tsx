import { useParams } from "react-router";
import { useEffect, useRef } from "react";
import { useChatMessageContext } from "~/contexts/chat-message-context";
import { useChatContext } from "~/contexts/chat-list-context";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { MessageSquare, User, Bot, AlertTriangle } from "lucide-react";
import { ChatBubbleUser } from "~/components/chat-bubble-user";
import { ChatBubbleResponse } from "~/components/chat-bubble-response";

function ChatArea() {
  const { messages, loading, syncing } = useChatMessageContext();
  const { chats, loading: chatsLoading } = useChatContext();
  const { chatId } = useParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Check if chat exists
  const chatExists = chatId && chats.some((chat) => chat.id === chatId);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    // Check if user is near the bottom before auto-scrolling
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages]);

  // Always scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [loading, messages.length]);

  if (loading || chatsLoading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show error if chat doesn't exist after loading is complete
  if (!chatsLoading && !chatExists) {
    return (
      <div className="flex-1 flex h-full items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Chat Not Found</h3>
            <p className="text-muted-foreground">
              This chat doesn't exist or has been deleted.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No messages yet</h3>
            <p className="text-muted-foreground">
              Start a conversation by sending a message below.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 pb-32">
      <div className="space-y-6 max-w-4xl mx-auto">
        {messages.map((message) => (
          <div key={message.id}>
            {message.role === "user" ? (
              <ChatBubbleUser message={message} />
            ) : (
              <ChatBubbleResponse message={message} />
            )}
          </div>
        ))}
        {syncing && (
          <div className="flex justify-center">
            <div className="text-sm text-muted-foreground">Syncing...</div>
          </div>
        )}
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { chatId } = useParams();

  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Invalid Chat</h3>
            <p className="text-muted-foreground">
              No chat ID provided in the URL.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ChatArea />;
}
