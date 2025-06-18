import { useUser } from "~/contexts/user-context";
import { useState, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { useNavigate } from "react-router";
import { createClient } from "~/lib/client";
import { useChatContext } from "~/contexts/chat-list-context";
import { useChat } from "~/hooks/use-chat";
import { DEFAULT_MODEL_ID } from "~/lib/models";
import { Loader2 } from "lucide-react";

export default function WelcomeMessage() {
  const { user } = useUser();
  const [category, setCategory] = useState<string>("create");
  const navigate = useNavigate();
  const supabase = createClient();
  const { refreshChats } = useChatContext();

  // Use the useChat hook with persistence enabled
  const { isLoading, error, sendMessage, clearError } = useChat({
    model: DEFAULT_MODEL_ID,
    usePersistedMessages: true,
    enableSystemPrompts: true,
    temperature: 0.7,
    maxTokens: 4096,
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  const suggestedMessages = {
    create: [
      "Write a poem about a cat",
      "Help me outline a story about a cat",
      "Create a character profile for a cat",
      "Give me 5 creative writing prompts about a cat",
    ],
    explore: [
      "What is the weather in Tokyo?",
      "Tell me about Mount Fuji",
      "Find top-rated sushi restaurants in Tokyo",
      "What are the best places to visit in Tokyo?",
    ],
    code: [
      "Write a function to calculate the factorial of a number",
      "Build a React component for a todo list",
      "Explain the difference between var, let, and const",
      "What is the difference between a class and an object?",
    ],
    learn: [
      "What is quantum physics?",
      "Explain photosynthesis",
      "Teach me basic Spanish phrases",
      "What is the capital of France?",
    ],
  };

  const messages =
    suggestedMessages[category as keyof typeof suggestedMessages] ||
    suggestedMessages.create;

  const handleSuggestedMessageClick = useCallback(
    async (messageContent: string) => {
      if (!messageContent.trim() || isLoading) return;

      try {
        // Create a new chat first
        if (!user) {
          throw new Error("Please sign in to start a chat");
        }

        const { data: newChat, error: chatError } = await supabase
          .from("chats")
          .insert({
            title:
              messageContent.length > 50
                ? messageContent.slice(0, 50) + "..."
                : messageContent,
            user_id: user.id,
          })
          .select()
          .single();

        if (chatError || !newChat) {
          console.error("Error creating new chat:", chatError);
          throw new Error("Failed to create new chat. Please try again.");
        }

        const currentChatId = newChat.id;
        // Refresh chats
        refreshChats();

        // Navigate to the new chat
        navigate(`/chat/${currentChatId}`);

        // Wait for navigation and context to update
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Clear any previous errors
        if (error) {
          clearError();
        }

        // Send the message using the hook
        await sendMessage(messageContent, {
          model: DEFAULT_MODEL_ID,
          chatId: currentChatId,
        });
      } catch (err) {
        console.error("Error sending message:", err);
        // Error handling is managed by the useChat hook
      }
    },
    [
      isLoading,
      navigate,
      supabase,
      user,
      refreshChats,
      sendMessage,
      error,
      clearError,
    ]
  );

  return (
    <div className="flex-1 flex items-center justify-center motion-opacity-in-0 motion-duration-[1s]">
      <div className="max-w-lg mx-auto">
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">
            How can I help you today {user?.user_metadata.name}?
          </h2>
          <div className="flex flex-row items-center justify-center gap-4 mt-4 mb-4">
            {["create", "explore", "code", "learn"].map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? "default" : "outline"}
                className="px-6"
                onClick={() => setCategory(cat)}
              >
                {cat[0].toUpperCase() + cat.slice(1)}
              </Button>
            ))}
          </div>
          <div className="text-muted-foreground mb-6">
            <div className="flex flex-col items-center justify-start gap-2 w-full">
              {messages.map((message, index) => (
                <Button
                  variant="ghost"
                  className="px-6 border-b w-full"
                  key={`${category}-${index}`}
                  onClick={() => handleSuggestedMessageClick(message)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  <span className="mr-auto">{message}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
