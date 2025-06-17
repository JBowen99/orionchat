import { Outlet, useLocation } from "react-router";
import ChatInput from "~/components/chat-input";
import ChatSidebar from "~/components/chat-sidebar";
import FloatingButtons from "~/components/floating-buttons";
import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar";
import { ChatProvider } from "~/contexts/chat-list-context";
import { Card, CardContent } from "~/components/ui/card";
import { useState } from "react";
import { useRef } from "react";
import { useEffect } from "react";
import { useUser } from "~/contexts/user-context";
import { Button } from "~/components/ui/button";
import WelcomeMessage from "~/components/welcome-message";

export default function Index() {
  const location = useLocation();
  const isHomePage = location.pathname === "/chat" || location.pathname === "/";

  const inputRef = useRef<HTMLDivElement>(null);
  const [inputHeight, setInputHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      if (inputRef.current) {
        setInputHeight(inputRef.current.offsetHeight);
      }
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    if (inputRef.current) observer.observe(inputRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <SidebarProvider>
        <ChatSidebar />
        <FloatingButtons />
        <SidebarInset>
          <div className="flex flex-col h-screen w-full relative">
            {/* Chat Area */}
            {isHomePage ? <WelcomeMessage /> : <Outlet />}

            <div
              ref={inputRef}
              className="absolute bottom-0 left-0 right-0 flex flex-row items-center justify-center"
            >
              {/* Chat Input */}
              <ChatInput />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
