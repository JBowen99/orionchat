import { useParams, useLoaderData, type LoaderFunctionArgs, Link, type ClientLoaderFunctionArgs, isRouteErrorResponse, useRouteError } from "react-router";
import { createClient } from "~/lib/server";
import { useUser } from "~/contexts/user-context";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { AlertTriangle, LogIn, MessageCircle, User, Bot, Home } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { MarkdownRenderer } from "~/components/markdown-renderer";
import type { Tables } from "database.types";

type SharedChat = Tables<"shared_chats">;

interface SharedMessage {
  id: string;
  role: string;
  content: string;
  type: string;
  created_at: string;
  metadata?: any;
}

interface SharedChatData {
  sharedChat: SharedChat;
  messages: SharedMessage[];
  isExpired: boolean;
}

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const { chatid } = params;
  
  if (!chatid) {
    throw new Response("Chat ID is required", { status: 400 });
  }

  const { supabase } = createClient(request);

  // Fetch shared chat data
  const { data: sharedChat, error } = await supabase
    .from("shared_chats")
    .select("*")
    .eq("id", chatid)
    .single();

  if (error || !sharedChat) {
    throw new Response("Shared chat not found", { status: 404 });
  }

  // Check if expired
  const isExpired = sharedChat.expires_at && new Date(sharedChat.expires_at) < new Date();

  if (isExpired) {
    return {
      sharedChat,
      messages: [],
      isExpired: true,
    };
  }

  // Extract messages from snapshot
  const messages = (sharedChat.messages_snapshot as SharedMessage[]) || [];

  return {
    sharedChat,
    messages,
    isExpired: false,
  };
};

// Error boundary component
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">
              {error.status === 404 ? "Chat Not Found" : "Something went wrong"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {error.status === 404 
                ? "The shared conversation you're looking for doesn't exist or has been removed."
                : "There was an error loading this shared conversation. Please try again later."
              }
            </p>
            <Button asChild>
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md mx-auto">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Unexpected Error</h3>
          <p className="text-muted-foreground mb-4">
            An unexpected error occurred. Please try again later.
          </p>
          <Button asChild>
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Simple chat bubble components for shared chat
function SimpleChatBubbleUser({ message }: { message: SharedMessage }) {
  return (
    <div className="flex gap-3 justify-end">
      <div className="flex gap-3 max-w-[80%] flex-row-reverse">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-1">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="rounded-lg p-3 bg-blue-500 text-white">
            <div className="whitespace-pre-wrap text-sm">
              {message.content || "No content"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SimpleChatBubbleAssistant({ message }: { message: SharedMessage }) {
  const metadata = message.metadata as { model?: string; error?: string } | null;
  const model = metadata?.model || "AI Assistant";
  const isError = message.type === "error" || !!metadata?.error;

  return (
    <div className="flex gap-3 justify-start">
      <div className="flex gap-3 max-w-[80%] flex-row">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-1">
            <Bot className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex flex-col">
            <div className={`rounded-lg p-3 ${
              isError 
                ? "bg-red-50 border border-red-200 text-red-800" 
                : "bg-gray-100 text-gray-900"
            }`}>
              {isError ? (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">There was an error generating this response</span>
                </div>
              ) : message.content ? (
                <MarkdownRenderer 
                  content={message.content} 
                  className="text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                />
              ) : (
                <span className="text-sm italic">No content</span>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {model}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SharedChatPage() {
  const { sharedChat, messages, isExpired } = useLoaderData<typeof loader>() as SharedChatData;
  const { user, loading: userLoading } = useUser();

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Link Expired</h3>
            <p className="text-muted-foreground mb-4">
              This shared conversation has expired and is no longer available.
            </p>
            <Button asChild>
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Sticky Header */}
      <div className="flex-shrink-0 border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-semibold">{sharedChat.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Shared conversation • {messages.length} messages
                </p>
              </div>
            </div>
            <Badge variant="secondary">
              Shared
            </Badge>
          </div>
        </div>
      </div>

      {/* Scrollable Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No messages</h3>
                <p className="text-muted-foreground">
                  This shared conversation doesn't contain any messages.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id}>
                  {message.role === "user" ? (
                    <SimpleChatBubbleUser message={message} />
                  ) : (
                    <SimpleChatBubbleAssistant message={message} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="flex-shrink-0 border-t bg-card">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {userLoading ? (
              <div className="flex gap-4">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-40" />
              </div>
            ) : user ? (
              <>
                <Button asChild size="lg" className="flex-1 sm:flex-initial">
                  <Link to="/chat">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Continue the conversation
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="flex-1 sm:flex-initial">
                  <Link to="/chat">
                    Go to your chats
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg" className="flex-1 sm:flex-initial">
                  <Link to="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login to continue the conversation
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="flex-1 sm:flex-initial">
                  <Link to="/sign-up">
                    Sign up for free
                  </Link>
                </Button>
              </>
            )}
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {user 
                ? "You can copy this conversation to your account and continue chatting."
                : "Create an account to continue this conversation and save your chat history."
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
