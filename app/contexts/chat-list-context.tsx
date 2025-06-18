import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "~/lib/client";
import { db } from "~/dexie/db";
import type { Tables } from "database.types";

// Use the full Supabase Chat type instead of custom interface
export type Chat = Tables<"chats">;

interface ChatContextType {
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  refreshChats: () => Promise<void>;
  togglePin: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  renameChat: (chatId: string, newTitle: string) => Promise<void>;
  updateChatSummary: (chatId: string, summary: string) => Promise<void>;
  getCurrentChat: () => Chat | undefined;
  selectedChatId?: string;
  loading: boolean;
  syncing: boolean; // Add syncing state to show background sync status
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({
  children,
  selectedChatId,
}: {
  children: ReactNode;
  selectedChatId?: string;
}) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [supabase] = useState(() => createClient());

  // === DEBUG: Log selectedChatId source ===
  console.log("🎯 ChatProvider Debug - selectedChatId from prop:", {
    selectedChatId,
    selectedChatIdType: typeof selectedChatId,
    selectedChatIdLength: selectedChatId?.length || 0,
    urlPath: typeof window !== "undefined" ? window.location.pathname : "SSR",
    urlParams: typeof window !== "undefined" ? window.location.search : "SSR",
  });

  const refreshChats = async () => {
    setSyncing(true);

    try {
      console.log(
        "🔄 ChatListContext.refreshChats - Fetching from Supabase..."
      );

      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase fetch error:", error);
        return;
      }

      if (data) {
        console.log("📊 ChatListContext.refreshChats - Data fetched:", {
          totalChats: data.length,
          chatsWithSummary: data.filter((chat) => chat.chat_summary).length,
          sampleChat: data[0]
            ? {
                id: data[0].id,
                title: data[0].title,
                hasSummary: !!data[0].chat_summary,
                summaryLength: data[0].chat_summary?.length || 0,
                summaryPreview: data[0].chat_summary
                  ? data[0].chat_summary.substring(0, 50) + "..."
                  : null,
              }
            : null,
          allChatSummaries: data.map((chat) => ({
            id: chat.id,
            title: chat.title.substring(0, 30) + "...",
            hasSummary: !!chat.chat_summary,
            summaryLength: chat.chat_summary?.length || 0,
          })),
        });

        setChats(data);

        console.log(
          "💾 ChatListContext.refreshChats - Updating Dexie cache..."
        );
        // Update Dexie cache with fresh data
        await db.chats.clear();
        await db.chats.bulkAdd(data);

        console.log("✅ ChatListContext.refreshChats - Completed successfully");
      }
    } catch (error) {
      console.error("Error refreshing chats:", error);
    } finally {
      setSyncing(false);
    }
  };

  const togglePin = async (chatId: string) => {
    try {
      // Find the chat in current state
      const chat = chats.find((c) => c.id === chatId);
      if (!chat) return;

      const newPinnedState = !chat.pinned;

      // Optimistically update local state
      setChats((prevChats) =>
        prevChats.map((c) =>
          c.id === chatId ? { ...c, pinned: newPinnedState } : c
        )
      );

      // Update Supabase
      const { error } = await supabase
        .from("chats")
        .update({ pinned: newPinnedState })
        .eq("id", chatId);

      if (error) {
        console.error("Error toggling pin:", error);
        // Revert optimistic update on error
        setChats((prevChats) =>
          prevChats.map((c) =>
            c.id === chatId ? { ...c, pinned: chat.pinned } : c
          )
        );
        return;
      }

      // Update Dexie cache
      await db.chats.update(chatId, { pinned: newPinnedState });
    } catch (error) {
      console.error("Error toggling pin:", error);
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      // Optimistically remove from local state
      setChats((prevChats) => prevChats.filter((c) => c.id !== chatId));

      // Delete from Supabase
      const { error } = await supabase.from("chats").delete().eq("id", chatId);

      if (error) {
        console.error("Error deleting chat:", error);
        // Revert optimistic update on error by refreshing
        await refreshChats();
        return;
      }

      // Delete from Dexie cache
      await db.chats.delete(chatId);
    } catch (error) {
      console.error("Error deleting chat:", error);
      // Revert optimistic update on error by refreshing
      await refreshChats();
    }
  };

  const renameChat = async (chatId: string, newTitle: string) => {
    try {
      // Find the chat in current state
      const chat = chats.find((c) => c.id === chatId);
      if (!chat) return;

      const oldTitle = chat.title;

      // Optimistically update local state
      setChats((prevChats) =>
        prevChats.map((c) => (c.id === chatId ? { ...c, title: newTitle } : c))
      );

      // Update Supabase
      const { error } = await supabase
        .from("chats")
        .update({ title: newTitle })
        .eq("id", chatId);

      if (error) {
        console.error("Error renaming chat:", error);
        // Revert optimistic update on error
        setChats((prevChats) =>
          prevChats.map((c) =>
            c.id === chatId ? { ...c, title: oldTitle } : c
          )
        );
        return;
      }

      // Update Dexie cache
      await db.chats.update(chatId, { title: newTitle });
    } catch (error) {
      console.error("Error renaming chat:", error);
    }
  };

  useEffect(() => {
    const loadChats = async () => {
      try {
        console.log("🚀 ChatListContext.loadChats - Loading from cache...");

        // First, load from Dexie cache for instant feedback
        const cachedChats = await db.chats
          .orderBy("created_at")
          .reverse()
          .toArray();

        if (cachedChats.length > 0) {
          console.log("📱 ChatListContext.loadChats - Cache data loaded:", {
            totalChats: cachedChats.length,
            chatsWithSummary: cachedChats.filter((chat) => chat.chat_summary)
              .length,
            sampleCachedChat: cachedChats[0]
              ? {
                  id: cachedChats[0].id,
                  title: cachedChats[0].title,
                  hasSummary: !!cachedChats[0].chat_summary,
                  summaryLength: cachedChats[0].chat_summary?.length || 0,
                  summaryPreview: cachedChats[0].chat_summary
                    ? cachedChats[0].chat_summary.substring(0, 50) + "..."
                    : null,
                }
              : null,
          });

          setChats(cachedChats);
          setLoading(false); // Set loading to false immediately with cached data
        } else {
          console.log("📱 ChatListContext.loadChats - No cached data found");
        }

        console.log(
          "🔄 ChatListContext.loadChats - Starting background sync..."
        );
        // Then sync with Supabase in the background
        await refreshChats();
      } catch (error) {
        console.error("Error loading chats:", error);
      } finally {
        setLoading(false); // Ensure loading is false even if cache was empty
      }
    };

    loadChats();
  }, []);

  const value: ChatContextType = {
    chats,
    setChats,
    refreshChats,
    togglePin,
    deleteChat,
    renameChat,
    updateChatSummary: async (chatId, summary) => {
      console.log("🎯 ChatListContext.updateChatSummary called:", {
        chatId,
        summaryLength: summary.length,
        summaryPreview: summary.substring(0, 100) + "...",
        chatsCount: chats.length,
        targetChatExists: chats.some((c) => c.id === chatId),
      });

      try {
        // Find the chat in current state
        const chat = chats.find((c) => c.id === chatId);
        if (!chat) {
          console.error("❌ Chat not found in local state:", chatId);
          return;
        }

        console.log("💾 Updating local state optimistically...");

        // Optimistically update local state
        setChats((prevChats) =>
          prevChats.map((c) =>
            c.id === chatId ? { ...c, chat_summary: summary } : c
          )
        );

        console.log("🔄 Updating Supabase...");

        // Update Supabase
        const { error } = await supabase
          .from("chats")
          .update({ chat_summary: summary })
          .eq("id", chatId);

        if (error) {
          console.error("❌ Error updating chat summary in Supabase:", error);
          // Revert optimistic update on error
          setChats((prevChats) =>
            prevChats.map((c) =>
              c.id === chatId ? { ...c, chat_summary: chat.chat_summary } : c
            )
          );
          return;
        }

        console.log("✅ Supabase updated successfully");
        console.log("💾 Updating Dexie cache...");

        // Update Dexie cache
        await db.chats.update(chatId, { chat_summary: summary });

        console.log(
          "✅ ChatListContext.updateChatSummary completed successfully"
        );
      } catch (error) {
        console.error("❌ Error in updateChatSummary:", error);
      }
    },
    getCurrentChat: () => {
      const currentChat = chats.find((c) => c.id === selectedChatId);
      console.log("🔍 ChatListContext.getCurrentChat:", {
        selectedChatId,
        foundChat: !!currentChat,
        chatSummary: currentChat?.chat_summary || null,
        chatSummaryLength: currentChat?.chat_summary?.length || 0,
        totalChats: chats.length,
        searchingFor: selectedChatId,
        availableChatIds: chats.map((c) => c.id),
        exactMatches: chats.filter((c) => c.id === selectedChatId).length,
        chatIdComparison: chats.map((c) => ({
          id: c.id,
          matches: c.id === selectedChatId,
          idLength: c.id.length,
          targetIdLength: selectedChatId?.length || 0,
        })),
      });
      return currentChat;
    },
    selectedChatId,
    loading,
    syncing,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
};
