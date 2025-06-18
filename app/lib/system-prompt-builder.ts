import type { UserPreferences } from "~/contexts/settings-context";
import type { ChatMessage } from "~/services/chat.service";
import type { ModelConfig } from "./models";

export interface SystemPromptContext {
  userSettings?: UserPreferences;
  modelConfig?: ModelConfig;
  customInstructions?: string;
  // === CONVERSATION CONTEXT MANAGEMENT ===
  conversationSummary?: string; // Summary of earlier conversation history
  recentMessages?: ChatMessage[]; // Recent messages to include in full
  useConversationSummary?: boolean; // Whether to use summary-based context
  maxRecentMessages?: number; // How many recent messages to include when using summary (default: 10)
  // TODO: Add additional context management here
  // projectContext?: ProjectContext;
}

class SystemPromptBuilder {
  /**
   * Build system prompt from context
   */
  buildSystemPrompt(context: SystemPromptContext = {}): string {
    const sections: string[] = [];

    // Base identity
    sections.push(this.buildBaseIdentity(context.modelConfig));

    // Current date/time
    sections.push(this.buildDateTimeSection());

    // User context
    if (context.userSettings) {
      const userSection = this.buildUserSection(context.userSettings);
      if (userSection) sections.push(userSection);
    }

    // Response guidelines
    sections.push(this.buildFormattingSection());

    // Custom instructions
    if (context.customInstructions) {
      sections.push(`## Custom Instructions\n${context.customInstructions}`);
    }

    // === CONVERSATION CONTEXT ===
    const conversationSection = this.buildConversationSection(context);
    if (conversationSection) {
      sections.push(conversationSection);
    }

    // TODO: Add additional context management sections here
    // - Project context
    // - Tools context

    return sections.join("\n\n");
  }

  private buildBaseIdentity(modelConfig?: ModelConfig): string {
    let identity = "You are Orion, a helpful and intelligent AI assistant.";
    
    if (modelConfig) {
      identity += ` You are powered by the ${modelConfig.name} model.`;
      
      // Add reasoning guidance for o1/o3/o4 models
      if (modelConfig.id.startsWith('o1') || modelConfig.id.startsWith('o3') || modelConfig.id.startsWith('o4')) {
        identity += " Take time to think through problems step by step.";
      }
    }

    return identity;
  }

  private buildDateTimeSection(): string {
    const now = new Date();
    const timeString = now.toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: 'numeric', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });

    return `## Current Context\nCurrent date and time: ${timeString}`;
  }

  private buildUserSection(userSettings: UserPreferences): string {
    const parts: string[] = [];

    if (userSettings.name) {
      parts.push(`User's name: ${userSettings.name}`);
    }

    if (userSettings.additional_info) {
      parts.push(`Additional context: ${userSettings.additional_info}`);
    }

    if (userSettings.traits?.length) {
      parts.push(`Preferred AI personality: ${userSettings.traits.join(", ")}`);
    }

    return parts.length > 0 ? `## User Context\n${parts.join("\n")}` : "";
  }

  private buildFormattingSection(): string {
    return `## Response Guidelines
- Respond in Markdown format
- Use clear, well-structured responses
- Format code blocks with proper syntax highlighting
- Use LaTeX for math: \\(inline\\) or $$display$$
- Be concise but thorough`;
  }

  private buildConversationSection(context: SystemPromptContext): string {
    if (!context.useConversationSummary && !context.recentMessages?.length) {
      return "";
    }

    const parts: string[] = [];
    const maxRecentMessages = context.maxRecentMessages || 10;

    // Add conversation summary if available
    if (context.useConversationSummary && context.conversationSummary) {
      parts.push(`### Previous Conversation Summary
${context.conversationSummary}`);
    }

    // Add recent messages if available
    if (context.recentMessages?.length) {
      const messagesToShow = context.useConversationSummary 
        ? context.recentMessages.slice(-maxRecentMessages) // Show last N messages when using summary
        : context.recentMessages; // Show all messages when not using summary

      if (messagesToShow.length > 0) {
        const messagesText = messagesToShow
          .filter(msg => msg.role !== 'system') // Exclude system messages from context
          .map(msg => {
            const speaker = msg.role === 'user' ? 'User' : 'Assistant';
            return `**${speaker}**: ${msg.content}`;
          })
          .join('\n\n');

        if (messagesText) {
          const sectionTitle = context.useConversationSummary && context.conversationSummary
            ? "### Recent Messages"
            : "### Conversation History";
          
          parts.push(`${sectionTitle}\n${messagesText}`);
        }
      }
    }

    return parts.length > 0 ? `## Conversation Context\n${parts.join('\n\n')}` : "";
  }

  /**
   * Get default system prompt
   */
  getDefaultSystemPrompt(): string {
    return this.buildSystemPrompt({});
  }

  /**
   * Build context-aware system prompt with intelligent context management
   */
  buildContextAwareSystemPrompt(
    context: Omit<SystemPromptContext, 'useConversationSummary' | 'maxRecentMessages'> & {
      allMessages?: ChatMessage[];
      maxContextTokens?: number; // Rough token limit for context section
    }
  ): string {
    const { allMessages, maxContextTokens = 2000, ...baseContext } = context;
    
    if (!allMessages?.length) {
      return this.buildSystemPrompt(baseContext);
    }

    // Estimate if we should use summary-based context
    const shouldUseSummary = this.shouldUseSummaryContext(
      allMessages, 
      context.conversationSummary,
      maxContextTokens
    );

    const enhancedContext: SystemPromptContext = {
      ...baseContext,
      recentMessages: allMessages,
      useConversationSummary: shouldUseSummary,
      maxRecentMessages: shouldUseSummary ? 8 : undefined, // Fewer recent messages when using summary
    };

    return this.buildSystemPrompt(enhancedContext);
  }

  /**
   * Determine if we should use summary-based context management
   */
  private shouldUseSummaryContext(
    messages: ChatMessage[],
    summary?: string,
    maxTokens: number = 2000
  ): boolean {
    // If no summary available, use full context
    if (!summary) {
      return false;
    }

    // Rough token estimation (4 chars ≈ 1 token)
    const estimateTokens = (text: string) => Math.ceil(text.length / 4);
    
    // Calculate rough token count for all messages
    const allMessagesTokens = messages
      .filter(msg => msg.role !== 'system')
      .reduce((total, msg) => total + estimateTokens(msg.content), 0);

    // Use summary if full context would exceed token limit
    return allMessagesTokens > maxTokens;
  }
}

export const systemPromptBuilder = new SystemPromptBuilder(); 