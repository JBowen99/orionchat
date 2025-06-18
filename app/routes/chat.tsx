import { Outlet, useLocation, useParams } from "react-router";
import { type LoaderFunctionArgs, redirect } from "react-router";
import { createClient } from "~/lib/server";
import ChatInput from "~/components/chat-input";
import ChatSidebar from "~/components/chat-sidebar";
import FloatingButtons from "~/components/floating-buttons";
import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar";
import { ChatProvider } from "~/contexts/chat-list-context";
import { ChatMessageProvider } from "~/contexts/chat-message-context";
import { Card, CardContent } from "~/components/ui/card";
import { useState, createContext, useContext } from "react";
import { useRef } from "react";
import { useEffect } from "react";
import { useUser } from "~/contexts/user-context";
import { Button } from "~/components/ui/button";
import WelcomeMessage from "~/components/welcome-message";
import { DEFAULT_MODEL_ID } from "~/lib/models";

// Model Context for sharing selected model
const ModelContext = createContext<{
  selectedModel: string;
  setSelectedModel: (model: string) => void;
} | null>(null);

export const useModel = () => {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error("useModel must be used within ModelContext");
  }
  return context;
};

function ChatContent() {
  const location = useLocation();
  const isHomePage = location.pathname === "/chat" || location.pathname === "/";
  const [showScrollButton, setShowScrollButton] = useState(false);
  const chatAreaRef = useRef<HTMLDivElement>(null);

  // Extract chatId from the current path
  const pathParts = location.pathname.split("/");
  const chatId = pathParts.length > 2 ? pathParts[2] : null;

  console.log("🎯 Chat Route Debug:", {
    isHomePage,
    chatId,
    pathname: location.pathname,
  });

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
    <div className="flex flex-col h-screen w-full relative chat-background overflow-x-hidden">
      {/* Chat Area */}
      <div
        ref={chatAreaRef}
        className="flex-1 overflow-y-scroll overflow-x-hidden scrollbar-hide"
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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { supabase } = createClient(request);

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return redirect("/login");
  }

  return data;
};

export default function Index() {
  const location = useLocation();
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL_ID);

  // Extract chatId from the current path
  const pathParts = location.pathname.split("/");
  const chatId = pathParts.length > 2 ? pathParts[2] : null;

  console.log("🎯 Chat Route - Extracted chatId:", {
    pathname: location.pathname,
    pathParts,
    chatId,
    chatIdType: typeof chatId,
  });

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <SidebarProvider>
        <ModelContext.Provider value={{ selectedModel, setSelectedModel }}>
          <ChatProvider selectedChatId={chatId || undefined}>
            <ChatMessageProvider chatId={chatId}>
              <ChatSidebar />
              <FloatingButtons />
              <SidebarInset>
                <ChatContent />
              </SidebarInset>
            </ChatMessageProvider>
          </ChatProvider>
        </ModelContext.Provider>
      </SidebarProvider>
    </div>
  );
}
