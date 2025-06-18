import { useState, useCallback } from "react";
import { useUser } from "~/contexts/user-context";
import { useChatContext } from "~/contexts/chat-list-context";
import { createClient } from "~/lib/client";
import { db } from "~/dexie/db";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router";
import type { Tables } from "database.types";

type SharedChat = Tables<"shared_chats">;
type Message = Tables<"messages">;

export interface SharedMessage {
  id: string;
  role: string;
  content: string;
  type: string;
  created_at: string;
  metadata?: any;
}

export interface UseCopySharedChatOptions {
  onCopyStart?: () => void;
  onCopyComplete?: (newChatId: string) => void;
  onCopyError?: (error: Error) => void;
}

export interface UseCopySharedChatReturn {
  copySharedChat: (sharedChat: SharedChat, messages: SharedMessage[]) => Promise<string>;
  isCopying: boolean;
  copyError: string | null;
  clearCopyError: () => void;
}

export function useCopySharedChat(options: UseCopySharedChatOptions = {}): UseCopySharedChatReturn {
  const [isCopying, setIsCopying] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  
  const { user } = useUser();
  const { refreshChats } = useChatContext();
  const navigate = useNavigate();
  const supabase = createClient();

  const {
    onCopyStart,
    onCopyComplete,
    onCopyError,
  } = options;

  const clearCopyError = useCallback(() => {
    setCopyError(null);
  }, []);

  const copySharedChat = useCallback(
    async (sharedChat: SharedChat, messages: SharedMessage[]): Promise<string> => {
      if (!user) {
        throw new Error("User must be logged in to copy a shared chat");
      }

      if (!messages || messages.length === 0) {
        throw new Error("No messages available to copy");
      }

      setIsCopying(true);
      setCopyError(null);

      try {
        if (onCopyStart) {
          onCopyStart();
        }

        // === COPY LOGIC: Create new chat for the current user ===
        const { data: newChat, error: chatError } = await supabase
          .from("chats")
          .insert({
            title: sharedChat.title,
            user_id: user.id,
            shared: false, // Make sure the copied chat is private
          })
          .select()
          .single();

        if (chatError) {
          console.error("Error creating new chat:", chatError);
          throw new Error("Failed to create new chat");
        }

        // === COPY LOGIC: Transform shared messages to regular messages ===
        const newMessages: Message[] = messages.map((msg, index) => ({
          id: uuidv4(), // Generate new ID
          chat_id: newChat.id,
          role: msg.role,
          content: msg.content,
          type: msg.type,
          created_at: new Date(Date.now() + index).toISOString(), // Ensure proper ordering
          parent_message_id: null, // Reset parent relationships
          metadata: msg.metadata,
        }));

        // === COPY LOGIC: Insert messages into the new chat ===
        const { error: messagesError } = await supabase
          .from("messages")
          .insert(newMessages);

        if (messagesError) {
          console.error("Error copying messages:", messagesError);
          // Clean up the created chat if message copying fails
          await supabase.from("chats").delete().eq("id", newChat.id);
          throw new Error("Failed to copy messages to new chat");
        }

        // === COPY LOGIC: Cache the new chat and messages in Dexie ===
        try {
          await db.chats.add(newChat);
          await db.messages.bulkAdd(newMessages);
        } catch (dexieError) {
          console.warn("Warning: Failed to cache copied chat in Dexie:", dexieError);
          // Don't fail the entire operation if Dexie fails
        }

        // === COPY LOGIC: Refresh the chat list to show the new chat in sidebar ===
        try {
          await refreshChats();
        } catch (refreshError) {
          console.warn("Warning: Failed to refresh chat list:", refreshError);
          // Don't fail the entire operation if refresh fails
        }

        // === COPY LOGIC: Navigate to the new chat ===
        navigate(`/chat/${newChat.id}`);

        if (onCopyComplete) {
          onCopyComplete(newChat.id);
        }

        return newChat.id;

      } catch (error) {
        console.error("Error copying shared chat:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to copy shared chat";
        setCopyError(errorMessage);
        
        if (onCopyError) {
          onCopyError(error instanceof Error ? error : new Error(errorMessage));
        }
        
        throw error;
      } finally {
        setIsCopying(false);
      }
    },
    [user, supabase, refreshChats, navigate, onCopyStart, onCopyComplete, onCopyError]
  );

  return {
    copySharedChat,
    isCopying,
    copyError,
    clearCopyError,
  };
} 