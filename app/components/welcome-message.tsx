import { useUser } from "~/contexts/user-context";
import { useState } from "react";
import { Button } from "~/components/ui/button";

export default function WelcomeMessage() {
  const { user } = useUser();
  const [category, setCategory] = useState<string>("create");

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

  return (
    <div className="flex-1 flex items-center justify-center">
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
                >
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
