import { useState } from "react";
import { useChat } from "~/hooks/use-chat";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Loader2 } from "lucide-react";

export function ChatExample() {
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState(
    "gemini-2.5-flash-preview-05-20"
  );
  const [useStreaming, setUseStreaming] = useState(false);

  const { messages, isLoading, error, sendMessage, clearMessages, clearError } =
    useChat({
      model: selectedModel,
      temperature: 0.7,
      maxTokens: 4096,
      onResponse: (response) => {
        console.log("Chat response:", response);
      },
      onError: (error) => {
        console.error("Chat error:", error);
      },
      onStreamingChunk: (chunk) => {
        console.log("Streaming chunk:", chunk);
      },
    });

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const messageContent = input;
    setInput("");

    try {
      if (useStreaming) {
        await sendMessage(messageContent, { role: "user" });
      } else {
        await sendMessage(messageContent, { role: "user" });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Chat Service Example</CardTitle>
        <div className="flex gap-4 items-center">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="gemini-2.5-flash-preview-05-20">
              Gemini 2.5 Flash
            </option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="claude-3-5-sonnet-20241022">
              Claude 3.5 Sonnet
            </option>
            <option value="deepseek-chat">DeepSeek Chat</option>
          </select>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useStreaming}
              onChange={(e) => setUseStreaming(e.target.checked)}
            />
            Stream responses
          </label>
          <Button onClick={clearMessages} variant="outline" size="sm">
            Clear Chat
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-96 w-full border rounded-md p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : message.role === "system"
                      ? "bg-gray-500 text-white"
                      : "bg-gray-200 text-gray-900"
                  }`}
                >
                  <div className="text-xs opacity-70 mb-1 capitalize">
                    {message.role}
                  </div>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-900 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-red-700">{error}</span>
              <Button onClick={clearError} variant="ghost" size="sm">
                ×
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
          >
            Send
          </Button>
        </div>

        <div className="text-sm text-gray-600">
          <p>
            This example demonstrates the chat service with API keys context.
          </p>
          <p>
            Make sure you have API keys configured in Settings before testing.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
