import type { ActionFunctionArgs } from "react-router";
import { chatService, type ChatRequest } from "~/services/chat.service";
import type { Provider } from "~/contexts/api-keys-context";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.model || !body.messages || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: model and messages",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate messages format
    for (const message of body.messages) {
      if (!message.role || !message.content) {
        return new Response(
          JSON.stringify({
            error:
              "Invalid message format. Each message must have role and content",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      if (!["system", "user", "assistant"].includes(message.role)) {
        return new Response(
          JSON.stringify({
            error: "Invalid message role. Must be system, user, or assistant",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Extract API keys from request body
    const apiKeys = body.apiKeys as Record<Provider, string | null>;
    if (!apiKeys) {
      return new Response(JSON.stringify({ error: "API keys are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const chatRequest: ChatRequest = {
      model: body.model,
      messages: body.messages,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      stream: body.stream || false,
    };

    // Handle streaming vs non-streaming requests
    if (chatRequest.stream) {
      // For streaming, we need to use Server-Sent Events
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const streamingResponse =
              chatService.generateStreamingChatCompletion(chatRequest, apiKeys);

            for await (const chunk of streamingResponse) {
              const data = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(encoder.encode(data));

              if (chunk.finished) {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                break;
              }
            }
          } catch (error) {
            const errorData = {
              error: error instanceof Error ? error.message : "Unknown error",
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`)
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    } else {
      // Non-streaming response
      const response = await chatService.generateChatCompletion(
        chatRequest,
        apiKeys
      );

      return new Response(JSON.stringify(response), {
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Chat API error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `Chat completion failed: ${errorMessage}` }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Handle preflight requests for CORS
export async function loader() {
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
}
