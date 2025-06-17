import type { MessageMetadata } from "~/services/chat.service";
import type { DispatchResponse } from "./dispatcher";

export interface ProcessedMessage {
  content: string;
  metadata: MessageMetadata;
  attachments?: Array<{
    type: "image" | "file";
    url: string;
    name: string;
    size?: number;
  }>;
}

export interface MessageProcessingOptions {
  enableMarkdown?: boolean;
  enableCodeHighlighting?: boolean;
  enableImageGeneration?: boolean;
  enableFileAttachments?: boolean;
  maxContentLength?: number;
}

class MessageHandler {
  private defaultOptions: MessageProcessingOptions = {
    enableMarkdown: true,
    enableCodeHighlighting: true,
    enableImageGeneration: false, // TODO: Enable when image generation is implemented
    enableFileAttachments: false, // TODO: Enable when file attachments are implemented
    maxContentLength: 10000,
  };

  /**
   * Main method to process and format AI model responses
   */
  async processResponse(
    response: DispatchResponse,
    options: Partial<MessageProcessingOptions> = {}
  ): Promise<ProcessedMessage> {
    const processingOptions = { ...this.defaultOptions, ...options };

    try {
      // Clean and format the response content
      let processedContent = this.cleanContent(response.content);

      // Apply content processing based on options
      if (processingOptions.enableMarkdown) {
        processedContent = this.processMarkdown(processedContent);
      }

      if (processingOptions.enableCodeHighlighting) {
        processedContent = this.processCodeBlocks(processedContent);
      }

      // Truncate content if it exceeds max length
      if (processingOptions.maxContentLength && processedContent.length > processingOptions.maxContentLength) {
        processedContent = this.truncateContent(processedContent, processingOptions.maxContentLength);
      }

      // Process any tool outputs or attachments
      const attachments = await this.processAttachments(response, processingOptions);

      // Build comprehensive metadata
      const metadata = this.buildMetadata(response, processingOptions);

      return {
        content: processedContent,
        metadata,
        attachments,
      };
    } catch (error) {
      console.error("Error processing message response:", error);
      
      // Return a safe fallback response
      return {
        content: response.content || "Error processing response",
        metadata: {
          model: response.model,
          error: error instanceof Error ? error.message : "Unknown processing error",
          ...response.metadata,
        },
      };
    }
  }

  /**
   * Clean and sanitize response content
   */
  private cleanContent(content: string): string {
    if (!content) return "";

    // Remove any potentially harmful content
    let cleaned = content.trim();

    // Remove excessive whitespace
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
    cleaned = cleaned.replace(/[ \t]{2,}/g, " ");

    // TODO: Add more content cleaning rules as needed
    // - Remove or escape HTML tags if not wanted
    // - Handle special characters
    // - Process mentions or links

    return cleaned;
  }

  /**
   * Process markdown formatting
   */
  private processMarkdown(content: string): string {
    // TODO: Implement markdown processing
    // For now, just return the content as-is
    // In the future, this could:
    // - Validate markdown syntax
    // - Convert to HTML if needed
    // - Process custom markdown extensions
    
    return content;
  }

  /**
   * Process code blocks for syntax highlighting
   */
  private processCodeBlocks(content: string): string {
    // TODO: Implement code block processing
    // For now, just return the content as-is
    // In the future, this could:
    // - Extract code blocks
    // - Add syntax highlighting metadata
    // - Validate code syntax
    // - Add copy-to-clipboard functionality
    
    return content;
  }

  /**
   * Truncate content while preserving structure
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;

    // Try to truncate at a natural break point
    const truncated = content.substring(0, maxLength);
    const lastNewline = truncated.lastIndexOf("\n");
    const lastSpace = truncated.lastIndexOf(" ");
    
    // Use the last newline or space as break point, or just cut at maxLength
    const breakPoint = lastNewline > maxLength * 0.8 ? lastNewline : 
                      lastSpace > maxLength * 0.8 ? lastSpace : maxLength;

    return content.substring(0, breakPoint) + "\n\n[Content truncated...]";
  }

  /**
   * Process attachments and tool outputs
   */
  private async processAttachments(
    response: DispatchResponse,
    options: MessageProcessingOptions
  ): Promise<ProcessedMessage["attachments"]> {
    const attachments: ProcessedMessage["attachments"] = [];

    // TODO: Implement attachment processing
    // This would handle:
    // - Image generation outputs
    // - File attachments
    // - Tool execution results
    // - Media content

    // Placeholder for image generation
    if (options.enableImageGeneration) {
      // Check if response contains image generation requests
      // Process and add image attachments
    }

    // Placeholder for file attachments
    if (options.enableFileAttachments) {
      // Process file attachments from response
      // Validate file types and sizes
      // Generate download URLs
    }

    return attachments.length > 0 ? attachments : undefined;
  }

  /**
   * Build comprehensive metadata for the processed message
   */
  private buildMetadata(
    response: DispatchResponse,
    options: MessageProcessingOptions
  ): MessageMetadata {
    const metadata: MessageMetadata = {
      model: response.model,
      ...response.metadata,
    };

    // Add usage information if available
    if (response.usage) {
      metadata.tokens = {
        input: response.usage.inputTokens,
        output: response.usage.outputTokens,
      };
    }

    // Add processing information
    metadata.processed_at = new Date().toISOString();
    metadata.processing_options = {
      markdown: options.enableMarkdown,
      code_highlighting: options.enableCodeHighlighting,
      image_generation: options.enableImageGeneration,
      file_attachments: options.enableFileAttachments,
    };

    // TODO: Add more metadata as needed
    // - Response time
    // - Content analysis results
    // - Quality scores
    // - Safety checks

    return metadata;
  }

  /**
   * Validate response content for safety and quality
   * TODO: Implement content validation
   */
  private validateContent(content: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Placeholder for content validation
    // This could check for:
    // - Inappropriate content
    // - Malformed responses
    // - Security issues
    // - Quality metrics

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Extract and process tool calls from response
   * TODO: Implement tool call processing
   */
  private processToolCalls(content: string): any[] {
    // Placeholder for tool call processing
    // This would:
    // - Parse tool call syntax
    // - Validate tool parameters
    // - Execute tools if needed
    // - Format tool results

    return [];
  }

  /**
   * Process streaming responses
   * TODO: Implement streaming support
   */
  async processStreamingResponse(
    responseStream: AsyncIterable<Partial<DispatchResponse>>,
    options: Partial<MessageProcessingOptions> = {}
  ): Promise<AsyncIterable<Partial<ProcessedMessage>>> {
    // Placeholder for streaming response processing
    // This would handle real-time processing of streaming responses
    
    async function* processStream() {
      for await (const chunk of responseStream) {
        // Process each chunk and yield processed result
        yield {
          content: chunk.content || "",
          metadata: chunk.metadata || {},
        };
      }
    }

    return processStream();
  }
}

// Export singleton instance
export const messageHandler = new MessageHandler(); 