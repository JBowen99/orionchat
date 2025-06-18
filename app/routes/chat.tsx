import { Outlet, useLocation, useParams } from "react-router";
import ChatInput from "~/components/chat-input";
import ChatSidebar from "~/components/chat-sidebar";
import FloatingButtons from "~/components/floating-buttons";
import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar";
import { ChatProvider } from "~/contexts/chat-list-context";
import { ChatMessageProvider } from "~/contexts/chat-message-context";
import { Card, CardContent } from "~/components/ui/card";
import { useState } from "react";
import { useRef } from "react";
import { useEffect } from "react";
import { useUser } from "~/contexts/user-context";
import { Button } from "~/components/ui/button";
import WelcomeMessage from "~/components/welcome-message";
import AiContextSidebar from "~/components/ai-context-sidebar";

function ChatContent() {
  const location = useLocation();
  const isHomePage = location.pathname === "/chat" || location.pathname === "/";
  const [showScrollButton, setShowScrollButton] = useState(false);
  const chatAreaRef = useRef<HTMLDivElement>(null);

  // Extract chatId from the current path
  const pathParts = location.pathname.split("/");
  const chatId = pathParts.length > 2 ? pathParts[2] : null;

  // Handle scroll detection
  useEffect(() => {
    const chatArea = chatAreaRef.current;
    if (!chatArea) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatArea;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const hasScrolledUpFromBottom = distanceFromBottom > clientHeight; // Full screen height from bottom

      setShowScrollButton(!isAtBottom && hasScrolledUpFromBottom);
    };

    chatArea.addEventListener("scroll", handleScroll);
    return () => chatArea.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToBottom = () => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTo({
        top: chatAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="flex flex-col h-screen w-full relative chat-background">
      {/* Chat Area */}
      <div
        ref={chatAreaRef}
        className="flex-1 overflow-y-scroll scrollbar-hide"
      >
        {isHomePage ? (
          <div className="flex flex-col items-center justify-center h-full">
            <WelcomeMessage />
          </div>
        ) : (
          <Outlet />
        )}
      </div>

      {/* Chat Input - always show */}
      <div className="absolute bottom-0 w-full flex flex-row justify-center">
        <ChatInput
          showScrollButton={showScrollButton}
          onScrollToBottom={scrollToBottom}
        />
      </div>
    </div>
  );
}

export default function Index() {
  const location = useLocation();

  // Extract chatId from the current path
  const pathParts = location.pathname.split("/");
  const chatId = pathParts.length > 2 ? pathParts[2] : null;

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <SidebarProvider>
        <ChatMessageProvider chatId={chatId}>
          <ChatSidebar />
          <FloatingButtons />
          <SidebarInset>
            <ChatContent />
          </SidebarInset>
        </ChatMessageProvider>
      </SidebarProvider>
    </div>
  );
}
