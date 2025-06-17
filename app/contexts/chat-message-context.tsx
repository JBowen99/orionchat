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
import { chatService } from "~/services/chat.service";
import type { ChatMessage } from "~/services/chat.service";
import { useApiKeys } from "~/contexts/api-keys-context";
import { getModelById } from "~/lib/models";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router";
import { useUser } from "~/contexts/user-context";
import { useChatContext } from "~/contexts/chat-list-context";

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
  retryResponse: (targetMessageId: string) => Promise<void>;
  branchConversation: (targetMessageId: string) => Promise<void>;
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
  const { apiKeys } = useApiKeys();
  const navigate = useNavigate();
  const { user } = useUser();
  const { refreshChats } = useChatContext();

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

  const retryResponse = async (targetMessageId: string) => {
    if (!chatId) return;

    try {
      // Find the target message
      const targetMessage = messages.find((m) => m.id === targetMessageId);
      if (!targetMessage) {
        throw new Error("Target message not found");
      }

      // Extract model from target message metadata
      const metadata = targetMessage.metadata as {
        model?: string;
        temperature?: number;
        maxTokens?: number;
      } | null;

      const model = metadata?.model;
      if (!model) {
        throw new Error("Cannot retry: No model information found in message");
      }

      // Get model configuration
      const modelConfig = getModelById(model);
      if (!modelConfig) {
        throw new Error(`Model ${model} not found`);
      }

      // Check if we have the required API key
      const apiKeysForService = Object.entries(apiKeys).reduce(
        (acc, [provider, keyEntry]) => {
          acc[provider as keyof typeof apiKeys] = keyEntry?.key || null;
          return acc;
        },
        {} as Record<keyof typeof apiKeys, string | null>
      );

      const requiredApiKey = apiKeysForService[modelConfig.provider];
      if (!requiredApiKey) {
        throw new Error(
          `No API key found for ${modelConfig.provider}. Please add an API key in Settings.`
        );
      }

      // Find the target message index
      const targetIndex = messages.findIndex((m) => m.id === targetMessageId);
      if (targetIndex === -1) {
        throw new Error("Target message not found in conversation");
      }

      // Delete all messages after the target message (including the target)
      const messagesToDelete = messages.slice(targetIndex);

      // Delete messages in reverse order (newest first) to maintain consistency
      for (let i = messagesToDelete.length - 1; i >= 0; i--) {
        const messageToDelete = messagesToDelete[i];
        await deleteMessage(messageToDelete.id);
      }

      // Get conversation history up to the parent message
      const conversationHistory: ChatMessage[] = messages
        .slice(0, targetIndex)
        .map((msg) => ({
          role: msg.role as "system" | "user" | "assistant",
          content: msg.content || "",
        }));

      // Find the last user message to retry
      let lastUserMessage: ChatMessage | null = null;
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        if (conversationHistory[i].role === "user") {
          lastUserMessage = conversationHistory[i];
          break;
        }
      }

      if (!lastUserMessage) {
        throw new Error("No user message found to retry");
      }

      // Create loading message placeholder
      const assistantMessageId = uuidv4();
      const loadingMessage: Message = {
        id: assistantMessageId,
        chat_id: chatId,
        role: "assistant",
        content: "",
        type: "text",
        created_at: new Date().toISOString(),
        parent_message_id: targetMessage.parent_message_id,
        metadata: { loading: true },
      };

      // Add loading message
      await addMessage(loadingMessage);

      // Call the streaming chat service to retry the response
      const streamingResponse = chatService.generateStreamingChatCompletion(
        {
          model: model,
          messages: [...conversationHistory, lastUserMessage],
          temperature: metadata?.temperature || 0.7,
          maxTokens: metadata?.maxTokens || 4096,
          stream: true,
        },
        apiKeysForService
      );

      let fullContent = "";
      let finalMetadata = null;
      let isFirstChunk = true;

      for await (const chunk of streamingResponse) {
        if (chunk.delta) {
          fullContent += chunk.delta;

          // On first chunk, remove loading state and start streaming
          if (isFirstChunk) {
            await updateMessage(assistantMessageId, {
              content: fullContent,
              metadata: { streaming: true, model },
            });
            isFirstChunk = false;
          } else {
            // Update the message with streaming content
            await updateMessage(assistantMessageId, {
              content: fullContent,
              metadata: { streaming: true, model },
            });
          }
        }

        if (chunk.finished) {
          finalMetadata = chunk.metadata;

          // Final update to mark streaming as complete
          await updateMessage(assistantMessageId, {
            content: chunk.content,
            metadata: finalMetadata
              ? { ...JSON.parse(JSON.stringify(finalMetadata)), model }
              : { model },
          });
          break;
        }
      }
    } catch (error) {
      console.error("Error retrying response:", error);

      // Create error message
      const errorMessageId = uuidv4();
      const errorMessage: Message = {
        id: errorMessageId,
        chat_id: chatId,
        role: "assistant",
        content:
          error instanceof Error ? error.message : "Failed to retry response",
        type: "error",
        created_at: new Date().toISOString(),
        parent_message_id: null,
        metadata: {
          error:
            error instanceof Error ? error.message : "Failed to retry response",
          originalError: error instanceof Error ? error.stack : String(error),
        },
      };

      await addMessage(errorMessage);
      throw error;
    }
  };

  const branchConversation = async (targetMessageId: string) => {
    if (!chatId || !user) {
      throw new Error("Chat ID or user not available");
    }

    try {
      // Find the target message index
      const targetIndex = messages.findIndex((m) => m.id === targetMessageId);
      if (targetIndex === -1) {
        throw new Error("Target message not found in conversation");
      }

      // Get messages up to and including the target message
      const messagesToCopy = messages.slice(0, targetIndex + 1);

      if (messagesToCopy.length === 0) {
        throw new Error("No messages to branch from");
      }

      // Create a new chat title based on the target message or first user message
      let chatTitle = "New conversation";
      const firstUserMessage = messagesToCopy.find((m) => m.role === "user");
      if (firstUserMessage?.content) {
        chatTitle =
          firstUserMessage.content.length > 50
            ? firstUserMessage.content.slice(0, 50) + "..."
            : firstUserMessage.content;
      }

      // Create new chat with parent_chat_id set to current chat
      const { data: newChat, error: chatError } = await supabase
        .from("chats")
        .insert({
          title: chatTitle,
          user_id: user.id,
          parent_chat_id: chatId, // Set parent to current chat
        })
        .select()
        .single();

      if (chatError) {
        console.error("Error creating new chat:", chatError);
        throw new Error("Failed to create new chat");
      }

      // Copy messages to the new chat
      const newMessages: Message[] = messagesToCopy.map((msg, index) => ({
        ...msg,
        id: uuidv4(), // Generate new ID
        chat_id: newChat.id,
        parent_message_id: index > 0 ? null : null, // Reset parent relationships for simplicity
        created_at: new Date(Date.now() + index).toISOString(), // Ensure proper ordering
      }));

      // Insert messages into the new chat
      const { error: messagesError } = await supabase
        .from("messages")
        .insert(newMessages);

      if (messagesError) {
        console.error("Error copying messages:", messagesError);
        // Clean up the created chat
        await supabase.from("chats").delete().eq("id", newChat.id);
        throw new Error("Failed to copy messages to new chat");
      }

      // Cache the new messages in Dexie
      await db.messages.bulkAdd(newMessages);

      // Refresh the chat list to show the new chat in sidebar
      await refreshChats();

      // Navigate to the new chat
      navigate(`/chat/${newChat.id}`);

      return newChat.id;
    } catch (error) {
      console.error("Error branching conversation:", error);
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
    retryResponse,
    branchConversation,
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
