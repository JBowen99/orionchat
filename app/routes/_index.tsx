import { Outlet, useLocation } from "react-router";
import ChatInput from "~/components/chat-input";
import ChatSidebar from "~/components/chat-sidebar";
import FloatingButtons from "~/components/floating-buttons";
import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar";
import { ChatProvider } from "~/contexts/chat-list-context";
import { Card, CardContent } from "~/components/ui/card";
import { MessageSquare, Sparkles } from "lucide-react";

function WelcomeMessage() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <Card className="max-w-lg mx-auto">
        <CardContent className="p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <MessageSquare className="h-16 w-16 text-primary" />
              <Sparkles className="h-6 w-6 text-yellow-500 absolute -top-1 -right-1" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-3">Welcome to YapChat</h2>
          <p className="text-muted-foreground mb-6">
            Select a chat from the sidebar to continue your conversation, or
            create a new chat to get started.
          </p>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Instant message loading from cache</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Background sync with Supabase</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Offline-first architecture</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Index() {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <SidebarProvider>
        <ChatProvider>
          <ChatSidebar />
          <FloatingButtons />
          <SidebarInset>
            <div className="flex flex-col h-screen w-full relative bg-chat-background">
              {/* Chat Area */}
              {isHomePage ? <WelcomeMessage /> : <Outlet />}

              <div className="absolute bottom-0 left-0 right-0 flex flex-row items-center justify-center">
                {/* Chat Input */}
                <ChatInput />
              </div>
            </div>
          </SidebarInset>
        </ChatProvider>
      </SidebarProvider>
    </div>
  );
}
