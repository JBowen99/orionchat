import type { UserSettings } from "~/contexts/user-context";
import type { ChatMessage } from "~/services/chat.service";
import type { ModelConfig } from "./models";

export interface SystemPromptContext {
  userSettings?: UserSettings;
  modelConfig?: ModelConfig;
  projectContext?: {
    name: string;
    description?: string;
    guidelines?: string[];
  };
  conversationContext?: {
    messages: ChatMessage[];
    branchingPoint?: string;
  };
  toolsContext?: {
    availableTools: string[];
    toolDescriptions?: Record<string, string>;
  };
  customInstructions?: string;
}

export interface SystemPromptOptions {
  includePersonality?: boolean;
  includeMemory?: boolean;
  includeProjectContext?: boolean;
  includeToolsInfo?: boolean;
  includeFormatting?: boolean;
  includeModelInfo?: boolean;
  includeDateTime?: boolean;
  maxLength?: number;
}

class SystemPromptBuilder {
  private defaultOptions: SystemPromptOptions = {
    includePersonality: true,
    includeMemory: false, // TODO: Enable when memory system is implemented
    includeProjectContext: true,
    includeToolsInfo: false, // TODO: Enable when tools are implemented
    includeFormatting: true,
    includeModelInfo: true,
    includeDateTime: true,
    maxLength: 4000,
  };

  /**
   * Build a comprehensive system prompt from context
   */
  buildSystemPrompt(
    context: SystemPromptContext,
    options: Partial<SystemPromptOptions> = {}
  ): string {
    const promptOptions = { ...this.defaultOptions, ...options };
    const sections: string[] = [];

    // Base assistant identity with model info
    sections.push(this.buildBaseIdentity(context.modelConfig, promptOptions.includeModelInfo));

    // Current date and time
    if (promptOptions.includeDateTime) {
      sections.push(this.buildDateTimeSection());
    }

    // User personality and preferences
    if (promptOptions.includePersonality && context.userSettings) {
      const personalitySection = this.buildPersonalitySection(context.userSettings);
      if (personalitySection) sections.push(personalitySection);
    }

    // Project-specific context
    if (promptOptions.includeProjectContext && context.projectContext) {
      const projectSection = this.buildProjectSection(context.projectContext);
      if (projectSection) sections.push(projectSection);
    }

    // Tools and capabilities
    if (promptOptions.includeToolsInfo && context.toolsContext) {
      const toolsSection = this.buildToolsSection(context.toolsContext);
      if (toolsSection) sections.push(toolsSection);
    }

    // Memory and conversation context
    if (promptOptions.includeMemory && context.conversationContext) {
      const memorySection = this.buildMemorySection(context.conversationContext);
      if (memorySection) sections.push(memorySection);
    }

    // Formatting and behavior guidelines
    if (promptOptions.includeFormatting) {
      sections.push(this.buildFormattingSection());
    }

    // Custom instructions
    if (context.customInstructions) {
      sections.push(this.buildCustomSection(context.customInstructions));
    }

    // Combine all sections
    let systemPrompt = sections.join("\n\n");

    // Truncate if necessary
    if (promptOptions.maxLength && systemPrompt.length > promptOptions.maxLength) {
      systemPrompt = this.truncatePrompt(systemPrompt, promptOptions.maxLength);
    }

    return systemPrompt;
  }

  /**
   * Build base assistant identity with optional model information
   */
  private buildBaseIdentity(modelConfig?: ModelConfig, includeModelInfo: boolean = true): string {
    let identity = "You are Orion, a helpful and intelligent AI assistant.";
    
    if (includeModelInfo && modelConfig) {
      identity += ` You are powered by the ${modelConfig.name} model.`;
      identity += " Your role is to assist and engage in conversation while being helpful, respectful, and engaging.";
      
      // Add model-specific guidance
      if (modelConfig.id.startsWith('o1') || modelConfig.id.startsWith('o3') || modelConfig.id.startsWith('o4')) {
        identity += " You are a reasoning model, so take time to think through problems step by step.";
      }
      
      identity += `\n\nIf you are specifically asked about the model you are using, you may mention that you use the ${modelConfig.name} model. If you are not asked specifically about the model you are using, you do not need to mention it.`;
    } else {
      identity += " You are designed to be conversational, knowledgeable, and adaptable to the user's needs and preferences.";
    }

    return identity;
  }

  /**
   * Build current date and time section
   */
  private buildDateTimeSection(): string {
    const now = new Date();
    const timeString = now.toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });

    return `## Current Context\nThe current date and time including timezone is ${timeString}.`;
  }

  /**
   * Build personality section from user settings
   */
  private buildPersonalitySection(userSettings: UserSettings): string {
    const sections: string[] = [];

    // User name and basic info for context
    if (userSettings.name) {
      sections.push(`The user's name is ${userSettings.name}.`);
    }

    if (userSettings.occupation) {
      sections.push(`They work as a ${userSettings.occupation}.`);
    }

    // Additional user information for context
    if (userSettings.additional_info) {
      sections.push(`Additional context about the user: ${userSettings.additional_info}`);
    }

    // Assistant personality traits (what the user wants the AI to be like)
    if (userSettings.traits && userSettings.traits.length > 0) {
      sections.push(`Your personality should be: ${userSettings.traits.join(", ")}.`);
    }

    // Preferred communication style based on user context
    sections.push(this.buildCommunicationStyle(userSettings));

    return sections.length > 0 
      ? `## User Context & Assistant Personality\n${sections.join(" ")}`
      : "";
  }

  /**
   * Build communication style based on user preferences and context
   */
  private buildCommunicationStyle(userSettings: UserSettings): string {
    const styles: string[] = [];

    // Adapt communication style based on user's occupation/context
    if (userSettings.occupation) {
      const occupation = userSettings.occupation.toLowerCase();
      if (occupation.includes("developer") || occupation.includes("engineer")) {
        styles.push("technical and precise");
      } else if (occupation.includes("designer") || occupation.includes("creative")) {
        styles.push("creative and visual");
      } else if (occupation.includes("business") || occupation.includes("manager")) {
        styles.push("professional and strategic");
      } else if (occupation.includes("student") || occupation.includes("academic")) {
        styles.push("educational and explanatory");
      }
    }

    return styles.length > 0 
      ? `Communicate in a style that is ${styles.join(", ")}.`
      : "Maintain a helpful, friendly, and adaptable communication style.";
  }

  /**
   * Build project-specific context section
   */
  private buildProjectSection(projectContext: SystemPromptContext["projectContext"]): string {
    if (!projectContext) return "";

    const sections: string[] = [];

    sections.push(`## Project Context\nYou are currently working within the "${projectContext.name}" project.`);

    if (projectContext.description) {
      sections.push(`Project description: ${projectContext.description}`);
    }

    if (projectContext.guidelines && projectContext.guidelines.length > 0) {
      sections.push(`Project guidelines:\n${projectContext.guidelines.map(g => `- ${g}`).join("\n")}`);
    }

    return sections.join("\n");
  }

  /**
   * Build tools and capabilities section
   */
  private buildToolsSection(toolsContext: SystemPromptContext["toolsContext"]): string {
    if (!toolsContext || !toolsContext.availableTools.length) return "";

    const sections: string[] = [];
    sections.push("## Available Tools");
    sections.push("You have access to the following tools:");

    toolsContext.availableTools.forEach(tool => {
      const description = toolsContext.toolDescriptions?.[tool] || "No description available";
      sections.push(`- ${tool}: ${description}`);
    });

    sections.push("Use these tools when appropriate to enhance your responses.");

    return sections.join("\n");
  }

  /**
   * Build memory and conversation context section
   */
  private buildMemorySection(conversationContext: SystemPromptContext["conversationContext"]): string {
    if (!conversationContext) return "";

    // TODO: Implement memory and conversation context processing
    // This would include:
    // - Recent conversation summary
    // - Important facts mentioned
    // - User preferences discovered in conversation
    // - Branching context if applicable

    const sections: string[] = [];
    sections.push("## Conversation Context");

    // Placeholder for conversation summary
    if (conversationContext.messages.length > 0) {
      sections.push("This is a continuation of an ongoing conversation.");
      
      // TODO: Add conversation summary logic
      // const summary = this.summarizeConversation(conversationContext.messages);
      // sections.push(`Previous context: ${summary}`);
    }

    if (conversationContext.branchingPoint) {
      sections.push(`This conversation branched from message: ${conversationContext.branchingPoint}`);
    }

    return sections.join("\n");
  }

  /**
   * Build formatting and behavior guidelines
   */
  private buildFormattingSection(): string {
    return `## Response Guidelines
- Always respond in Markdown format unless specifically asked to use a different format
- Use clear, well-structured responses with appropriate headings and formatting
- Format code blocks with appropriate syntax highlighting and language tags
- Ensure code is properly formatted using Prettier with a print width of 80 characters
- Be concise but thorough in explanations
- Ask clarifying questions when needed
- Provide examples when helpful

## Mathematical Expressions
- Always use LaTeX for mathematical expressions
- Inline math must be wrapped in escaped parentheses: \\(content\\)
- Do not use single dollar signs for inline math
- Display math must be wrapped in double dollar signs: $$content$$
- Do not use the backslash character to escape parenthesis. Use the actual parentheses instead`;
  }

  /**
   * Build custom instructions section
   */
  private buildCustomSection(customInstructions: string): string {
    return `## Custom Instructions\n${customInstructions}`;
  }

  /**
   * Truncate system prompt while preserving important sections
   */
  private truncatePrompt(prompt: string, maxLength: number): string {
    if (prompt.length <= maxLength) return prompt;

    // Try to preserve the most important sections
    const sections = prompt.split("\n\n");
    let truncated = "";
    
    for (const section of sections) {
      if (truncated.length + section.length + 2 <= maxLength) {
        truncated += (truncated ? "\n\n" : "") + section;
      } else {
        // Add truncation notice
        const remaining = maxLength - truncated.length - 20;
        if (remaining > 0) {
          truncated += "\n\n[Additional context truncated...]";
        }
        break;
      }
    }

    return truncated;
  }

  /**
   * Summarize conversation for context
   * TODO: Implement conversation summarization
   */
  private summarizeConversation(messages: ChatMessage[]): string {
    // Placeholder for conversation summarization
    // This would analyze the conversation and extract key points
    
    if (messages.length === 0) return "";
    
    const recentMessages = messages.slice(-5); // Get last 5 messages
    const topics = this.extractTopics(recentMessages);
    
    return topics.length > 0 
      ? `Recent topics discussed: ${topics.join(", ")}`
      : "Continuing previous conversation";
  }

  /**
   * Extract topics from messages
   * TODO: Implement topic extraction
   */
  private extractTopics(messages: ChatMessage[]): string[] {
    // Placeholder for topic extraction
    // This would use NLP or keyword extraction to identify topics
    
    return [];
  }

  /**
   * Get default system prompt for when no context is available
   */
  getDefaultSystemPrompt(): string {
    return this.buildSystemPrompt({});
  }

  /**
   * Validate system prompt length and content
   */
  validateSystemPrompt(prompt: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!prompt || prompt.trim().length === 0) {
      issues.push("System prompt is empty");
    }

    if (prompt.length > 4000) {
      issues.push("System prompt is too long (>4000 characters)");
    }

    // TODO: Add more validation rules
    // - Check for potentially harmful instructions
    // - Validate formatting
    // - Check for conflicting instructions

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}

// Export singleton instance
export const systemPromptBuilder = new SystemPromptBuilder(); 