import { useParams } from "react-router";
import {
  ChatMessageProvider,
  useChatMessageContext,
} from "~/contexts/chat-message-context";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { MessageSquare, User, Bot } from "lucide-react";
import { ChatBubbleUser } from "~/components/chat-bubble-user";
import { ChatBubbleResponse } from "~/components/chat-bubble-response";

function ChatArea() {
  const { messages, loading, syncing } = useChatMessageContext();

  if (loading) {
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
    <div className="flex-1 overflow-y-auto p-6">
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

  return (
    <ChatMessageProvider chatId={chatId}>
      <div className="flex flex-col h-full">
        <ChatArea />
      </div>
    </ChatMessageProvider>
  );
}
