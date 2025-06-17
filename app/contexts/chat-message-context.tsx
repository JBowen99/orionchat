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

// Use the full Supabase Message type
export type Message = Tables<"messages">;

interface ChatMessageContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  refreshMessages: () => Promise<void>;
  addMessage: (message: Message) => Promise<void>;
  updateMessage: (
    messageId: string,
    updates: Partial<Message>
  ) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  chatId: string | null;
  loading: boolean;
  syncing: boolean;
}

const ChatMessageContext = createContext<ChatMessageContextType | undefined>(
  undefined
);

interface ChatMessageProviderProps {
  children: ReactNode;
  chatId: string | null;
}

export const ChatMessageProvider = ({
  children,
  chatId,
}: ChatMessageProviderProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [supabase] = useState(() => createClient());

  const refreshMessages = async () => {
    if (!chatId) return;

    setSyncing(true);

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Supabase fetch error:", error);
        return;
      }

      if (data) {
        setMessages(data);
        // Update Dexie cache with fresh data
        await db.transaction("rw", db.messages, async () => {
          // Remove existing messages for this chat
          await db.messages.where("chat_id").equals(chatId).delete();
          // Add fresh messages
          await db.messages.bulkAdd(data);
        });
      }
    } catch (error) {
      console.error("Error refreshing messages:", error);
    } finally {
      setSyncing(false);
    }
  };

  const addMessage = async (message: Message) => {
    try {
      // Optimistically add to UI
      setMessages((prev) => [...prev, message]);

      // Add to cache
      await db.messages.add(message);

      // Sync to Supabase
      const { error } = await supabase.from("messages").insert(message);

      if (error) {
        console.error("Error adding message to Supabase:", error);
        // Revert optimistic update on error
        setMessages((prev) => prev.filter((m) => m.id !== message.id));
        await db.messages.delete(message.id);
        throw error;
      }
    } catch (error) {
      console.error("Error adding message:", error);
      throw error;
    }
  };

  const updateMessage = async (
    messageId: string,
    updates: Partial<Message>
  ) => {
    try {
      // Optimistically update UI
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg))
      );

      // Update cache
      await db.messages.update(messageId, updates);

      // Sync to Supabase
      const { error } = await supabase
        .from("messages")
        .update(updates)
        .eq("id", messageId);

      if (error) {
        console.error("Error updating message in Supabase:", error);
        // Revert optimistic update and refresh from cache
        await refreshMessages();
        throw error;
      }
    } catch (error) {
      console.error("Error updating message:", error);
      throw error;
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      // Optimistically remove from UI
      const messageToDelete = messages.find((m) => m.id === messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));

      // Remove from cache
      await db.messages.delete(messageId);

      // Sync to Supabase
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) {
        console.error("Error deleting message from Supabase:", error);
        // Revert optimistic update
        if (messageToDelete) {
          setMessages((prev) =>
            [...prev, messageToDelete].sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            )
          );
          await db.messages.add(messageToDelete);
        }
        throw error;
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      throw error;
    }
  };

  useEffect(() => {
    const loadMessages = async () => {
      if (!chatId) {
        setMessages([]);
        setLoading(false);
        return;
      }

      try {
        // First, load from Dexie cache for instant feedback
        const cachedMessages = await db.getChatMessages(chatId);

        if (cachedMessages.length > 0) {
          setMessages(cachedMessages);
          setLoading(false); // Set loading to false immediately with cached data
        }

        // Then sync with Supabase in the background
        await refreshMessages();
      } catch (error) {
        console.error("Error loading messages:", error);
      } finally {
        setLoading(false); // Ensure loading is false even if cache was empty
      }
    };

    loadMessages();
  }, [chatId]);

  const value: ChatMessageContextType = {
    messages,
    setMessages,
    refreshMessages,
    addMessage,
    updateMessage,
    deleteMessage,
    chatId,
    loading,
    syncing,
  };

  return (
    <ChatMessageContext.Provider value={value}>
      {children}
    </ChatMessageContext.Provider>
  );
};

export const useChatMessageContext = (): ChatMessageContextType => {
  const context = useContext(ChatMessageContext);
  if (!context) {
    throw new Error(
      "useChatMessageContext must be used within a ChatMessageProvider"
    );
  }
  return context;
};
