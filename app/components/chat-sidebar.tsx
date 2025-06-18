import {
  PlusIcon,
  Search,
  SettingsIcon,
  SidebarIcon,
  Sun,
  Pin,
  User,
  LogOut,
  Settings,
  ImagePlus,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarFooter,
  SidebarTrigger,
} from "./ui/sidebar";
import { useChatContext } from "~/contexts/chat-list-context";
import { useUser } from "~/contexts/user-context";
import ChatListItem from "./sidebar/chat-list-item";
import { ThemeToggle } from "./ui/theme-toggle";
import { Input } from "./ui/input";
import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { createClient } from "~/lib/client";
import type { Chat } from "~/contexts/chat-list-context";

// Helper functions for date categorization
const isToday = (date: string): boolean => {
  const today = new Date();
  const chatDate = new Date(date);
  return (
    chatDate.getDate() === today.getDate() &&
    chatDate.getMonth() === today.getMonth() &&
    chatDate.getFullYear() === today.getFullYear()
  );
};

const isPast7Days = (date: string): boolean => {
  const now = new Date();
  const chatDate = new Date(date);
  const diffTime = Math.abs(now.getTime() - chatDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 7 && !isToday(date);
};

interface ChatCategory {
  title: string;
  chats: Chat[];
  icon?: React.ReactNode;
}

export default function ChatSidebar() {
  const { chats, refreshChats } = useChatContext();
  const { user, loading: userLoading, signOut } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingChat, setCreatingChat] = useState(false);
  const navigate = useNavigate();
  const supabase = createClient();

  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Categorize chats
  const categorizedChats = useMemo((): ChatCategory[] => {
    const pinnedChats = filteredChats.filter((chat) => chat.pinned);
    const unpinnedChats = filteredChats.filter((chat) => !chat.pinned);

    const todayChats = unpinnedChats.filter((chat) => isToday(chat.updated_at));
    const past7DaysChats = unpinnedChats.filter((chat) =>
      isPast7Days(chat.updated_at)
    );
    const olderChats = unpinnedChats.filter(
      (chat) => !isToday(chat.updated_at) && !isPast7Days(chat.updated_at)
    );

    const categories: ChatCategory[] = [];

    if (pinnedChats.length > 0) {
      categories.push({
        title: "Pinned",
        chats: pinnedChats.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ),
        icon: <Pin className="w-4 h-4" />,
      });
    }

    if (todayChats.length > 0) {
      categories.push({
        title: "Today",
        chats: todayChats.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ),
      });
    }

    if (past7DaysChats.length > 0) {
      categories.push({
        title: "Past 7 Days",
        chats: past7DaysChats.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ),
      });
    }

    if (olderChats.length > 0) {
      categories.push({
        title: "Older",
        chats: olderChats.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ),
      });
    }

    return categories;
  }, [filteredChats]);

  /*
  const handleNewChat = async () => {
    setCreatingChat(true);
    try {
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: newChat, error } = await supabase
        .from("chats")
        .insert({
          title: "New Chat",
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating new chat:", error);
        return;
      }

      if (newChat) {
        // Refresh the chat list to include the new chat
        await refreshChats();
        // Navigate to the new chat
        navigate(`/chat/${newChat.id}`);
      }
    } catch (error) {
      console.error("Error creating new chat:", error);
    } finally {
      setCreatingChat(false);
    }
  };
  */
  const handleNewChat = () => {
    navigate("/chat");
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex flex-row items-center justify-between pt-2">
          <Link to="/chat" className="text-xl pt-2 font-bold">
            <img
              src="/fulllogo2.svg"
              alt="logo"
              className="hidden dark:block h-6"
            />
            <img
              src="/fulllogo.svg"
              alt="logo"
              className="block dark:hidden h-6"
            />
          </Link>
          <div className="flex flex-row items-center justify-center gap-2">
            <div className="transition-transform duration-200 ease-in-out hover:scale-105">
              <SidebarTrigger />
            </div>
            <div className="transition-transform duration-200 ease-in-out hover:scale-105">
              <ThemeToggle />
            </div>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-8 w-8 transition-all duration-200 ease-in-out hover:scale-105"
            >
              <Link to="/settings/customization">
                <Settings className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 px-2 pt-2">
          <div className="flex flex-row items-center justify-center gap-2 w-full ">
            <Button
              variant="ghost"
              className="flex-grow h-8 new-chat-button"
              onClick={handleNewChat}
              disabled={creatingChat}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              {creatingChat ? "Creating..." : "New Chat"}
            </Button>
            <Button
              variant="ghost"
              className="flex-shrink-0 h-8 new-chat-button"
              onClick={handleNewChat}
              disabled={creatingChat}
            >
              <ImagePlus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative flex flex-row items-center justify-center">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-10 text-sm md:text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="scrollbar-hide">
        {categorizedChats.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-4 px-4">
            {searchQuery ? "No chats found" : "No chats yet"}
          </div>
        ) : (
          categorizedChats.map((category) => (
            <SidebarGroup key={category.title} className="gap-2 px-2">
              <SidebarGroupLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {category.icon}
                {category.title} ({category.chats.length})
              </SidebarGroupLabel>
              <div className="space-y-1">
                {category.chats.map((chat) => (
                  <ChatListItem key={chat.id} chat={chat} />
                ))}
              </div>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col border-t w-full p-2">
          {userLoading ? (
            <div className="flex items-center gap-2 p-2">
              <div className="w-6 h-6 bg-muted rounded-full animate-pulse" />
              <div className="w-20 h-4 bg-muted rounded animate-pulse" />
            </div>
          ) : user ? (
            <Link to="/settings/customization">
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <User className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                </div>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-2 p-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/login")}
                className="w-full"
              >
                Sign In
              </Button>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
