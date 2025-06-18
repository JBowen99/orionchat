import { useState, useCallback } from "react";
import { useChatMessageContext } from "~/contexts/chat-message-context";
import { useUser } from "~/contexts/user-context";
import { createClient } from "~/lib/client";
import { db } from "~/dexie/db";
import { v4 as uuidv4 } from "uuid";
import type { Message } from "~/contexts/chat-message-context";

export interface UseShareChatOptions {
  onShareStart?: () => void;
  onShareComplete?: (sharedChatId: string, shareUrl: string) => void;
  onShareError?: (error: Error) => void;
}

export interface UseShareChatReturn {
  shareChat: (options?: { expiresInDays?: number }) => Promise<{ sharedChatId: string; shareUrl: string }>;
  isSharing: boolean;
  shareError: string | null;
  clearShareError: () => void;
}

export function useShareChat(options: UseShareChatOptions = {}): UseShareChatReturn {
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  
  const { messages, chatId } = useChatMessageContext();
  const { user } = useUser();
  const supabase = createClient();

  const {
    onShareStart,
    onShareComplete,
    onShareError,
  } = options;

  const clearShareError = useCallback(() => {
    setShareError(null);
  }, []);

  const shareChat = useCallback(
    async (shareOptions: { expiresInDays?: number } = {}): Promise<{ sharedChatId: string; shareUrl: string }> => {
      if (!chatId || !user) {
        throw new Error("Chat ID or user not available for sharing");
      }

      if (!messages || messages.length === 0) {
        throw new Error("No messages available to share");
      }

      setIsSharing(true);
      setShareError(null);

      try {
        if (onShareStart) {
          onShareStart();
        }

        // === SHARE LOGIC: Get chat title from database ===
        const { data: chatData, error: chatFetchError } = await supabase
          .from("chats")
          .select("title")
          .eq("id", chatId)
          .single();

        if (chatFetchError) {
          console.error("Error fetching chat title:", chatFetchError);
          throw new Error("Failed to fetch chat information");
        }

        const chatTitle = chatData.title || "Shared conversation";

        // === SHARE LOGIC: Calculate expiration date if specified ===
        let expiresAt: string | undefined;
        if (shareOptions.expiresInDays && shareOptions.expiresInDays > 0) {
          const expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + shareOptions.expiresInDays);
          expiresAt = expirationDate.toISOString();
        }

        // === SHARE LOGIC: Prepare messages snapshot for shared chat ===
        const messagesSnapshot = messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          type: msg.type,
          created_at: msg.created_at,
          metadata: msg.metadata,
        }));

        // === SHARE LOGIC: Create shared chat entry ===
        const { data: sharedChat, error: shareError } = await supabase
          .from("shared_chats")
          .insert({
            id: uuidv4(),
            original_chat_id: chatId,
            owner_user_id: user.id,
            title: chatTitle,
            messages_snapshot: messagesSnapshot,
            expires_at: expiresAt || null,
          })
          .select()
          .single();

        if (shareError) {
          console.error("Error creating shared chat:", shareError);
          throw new Error("Failed to create shared chat");
        }

        // === SHARE LOGIC: Cache the shared chat in Dexie ===
        try {
          await db.shared_chats.add(sharedChat);
        } catch (dexieError) {
          console.warn("Warning: Failed to cache shared chat in Dexie:", dexieError);
          // Don't fail the entire operation if Dexie fails
        }

        // === SHARE LOGIC: Generate share URL ===
        const shareUrl = `${window.location.origin}/shared/${sharedChat.id}`;

        const result = {
          sharedChatId: sharedChat.id,
          shareUrl,
        };

        if (onShareComplete) {
          onShareComplete(sharedChat.id, shareUrl);
        }

        return result;

      } catch (error) {
        console.error("Error sharing chat:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to share chat";
        setShareError(errorMessage);
        
        if (onShareError) {
          onShareError(error instanceof Error ? error : new Error(errorMessage));
        }
        
        throw error;
      } finally {
        setIsSharing(false);
      }
    },
    [
      chatId,
      user,
      messages,
      supabase,
      onShareStart,
      onShareComplete,
      onShareError,
    ]
  );

  return {
    shareChat,
    isSharing,
    shareError,
    clearShareError,
  };
} 