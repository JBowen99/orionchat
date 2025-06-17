import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useParams } from "react-router";
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
  selectedChatId?: string;
  loading: boolean;
  syncing: boolean; // Add syncing state to show background sync status
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const { id: selectedChatId } = useParams();
  const [supabase] = useState(() => createClient());

  const refreshChats = async () => {
    setSyncing(true);

    try {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase fetch error:", error);
        return;
      }

      if (data) {
        setChats(data);
        // Update Dexie cache with fresh data
        await db.chats.clear();
        await db.chats.bulkAdd(data);
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

  useEffect(() => {
    const loadChats = async () => {
      try {
        // First, load from Dexie cache for instant feedback
        const cachedChats = await db.chats
          .orderBy("created_at")
          .reverse()
          .toArray();

        if (cachedChats.length > 0) {
          setChats(cachedChats);
          setLoading(false); // Set loading to false immediately with cached data
        }

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
