import { useState, useCallback } from "react";
import { useChatMessageContext } from "~/contexts/chat-message-context";
import { useChatContext } from "~/contexts/chat-list-context";
import { useUser } from "~/contexts/user-context";
import { useNavigate } from "react-router";
import { createClient } from "~/lib/client";
import { db } from "~/dexie/db";
import { v4 as uuidv4 } from "uuid";
import type { Message } from "~/contexts/chat-message-context";

export interface UseBranchConversationOptions {
  onBranchStart?: () => void;
  onBranchComplete?: (newChatId: string) => void;
  onBranchError?: (error: Error) => void;
}

export interface UseBranchConversationReturn {
  branchConversation: (messageId: string) => Promise<string>;
  isBranching: boolean;
  branchError: string | null;
  clearBranchError: () => void;
}

export function useBranchConversation(options: UseBranchConversationOptions = {}): UseBranchConversationReturn {
  const [isBranching, setIsBranching] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  
  const { messages, chatId } = useChatMessageContext();
  const { refreshChats } = useChatContext();
  const { user } = useUser();
  const navigate = useNavigate();
  const supabase = createClient();

  const {
    onBranchStart,
    onBranchComplete,
    onBranchError,
  } = options;

  const clearBranchError = useCallback(() => {
    setBranchError(null);
  }, []);

  const branchConversation = useCallback(
    async (targetMessageId: string): Promise<string> => {
      if (!chatId || !user) {
        throw new Error("Chat ID or user not available for branching");
      }

      if (!messages || messages.length === 0) {
        throw new Error("No messages available to branch from");
      }

      setIsBranching(true);
      setBranchError(null);

      try {
        if (onBranchStart) {
          onBranchStart();
        }

        // === BRANCH LOGIC: Find the target message index ===
        const targetIndex = messages.findIndex((m) => m.id === targetMessageId);
        if (targetIndex === -1) {
          throw new Error("Target message not found in conversation");
        }

        // === BRANCH LOGIC: Get messages up to and including the target message ===
        const messagesToCopy = messages.slice(0, targetIndex + 1);

        if (messagesToCopy.length === 0) {
          throw new Error("No messages to branch from");
        }

        // === BRANCH LOGIC: Create a new chat title based on the target message or first user message ===
        let chatTitle = "New conversation";
        const firstUserMessage = messagesToCopy.find((m) => m.role === "user");
        if (firstUserMessage?.content) {
          chatTitle =
            firstUserMessage.content.length > 50
              ? firstUserMessage.content.slice(0, 50) + "..."
              : firstUserMessage.content;
        }

        // === BRANCH LOGIC: Create new chat with parent_chat_id set to current chat ===
        const { data: newChat, error: chatError } = await supabase
          .from("chats")
          .insert({
            title: chatTitle,
            user_id: user.id,
            parent_chat_id: chatId, // Set parent to current chat for branching relationship
          })
          .select()
          .single();

        if (chatError) {
          console.error("Error creating new chat:", chatError);
          throw new Error("Failed to create new chat");
        }

        // === BRANCH LOGIC: Copy messages to the new chat ===
        const newMessages: Message[] = messagesToCopy.map((msg, index) => ({
          ...msg,
          id: uuidv4(), // Generate new ID
          chat_id: newChat.id,
          parent_message_id: index > 0 ? null : null, // Reset parent relationships for simplicity
          created_at: new Date(Date.now() + index).toISOString(), // Ensure proper ordering
        }));

        // === BRANCH LOGIC: Insert messages into the new chat ===
        const { error: messagesError } = await supabase
          .from("messages")
          .insert(newMessages);

        if (messagesError) {
          console.error("Error copying messages:", messagesError);
          // Clean up the created chat if message copying fails
          await supabase.from("chats").delete().eq("id", newChat.id);
          throw new Error("Failed to copy messages to new chat");
        }

        // === BRANCH LOGIC: Cache the new messages in Dexie ===
        try {
          await db.messages.bulkAdd(newMessages);
        } catch (dexieError) {
          console.warn("Warning: Failed to cache messages in Dexie:", dexieError);
          // Don't fail the entire operation if Dexie fails
        }

        // === BRANCH LOGIC: Refresh the chat list to show the new chat in sidebar ===
        try {
          await refreshChats();
        } catch (refreshError) {
          console.warn("Warning: Failed to refresh chat list:", refreshError);
          // Don't fail the entire operation if refresh fails
        }

        // === BRANCH LOGIC: Navigate to the new chat ===
        navigate(`/chat/${newChat.id}`);

        if (onBranchComplete) {
          onBranchComplete(newChat.id);
        }

        return newChat.id;

      } catch (error) {
        console.error("Error branching conversation:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to branch conversation";
        setBranchError(errorMessage);
        
        if (onBranchError) {
          onBranchError(error instanceof Error ? error : new Error(errorMessage));
        }
        
        throw error;
      } finally {
        setIsBranching(false);
      }
    },
    [
      chatId,
      user,
      messages,
      supabase,
      refreshChats,
      navigate,
      onBranchStart,
      onBranchComplete,
      onBranchError,
    ]
  );

  return {
    branchConversation,
    isBranching,
    branchError,
    clearBranchError,
  };
} 