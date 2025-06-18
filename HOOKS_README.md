# Chat Hooks Usage Guide

This guide explains how to use the three specialized chat hooks in the application.

## 📚 Hook Overview

| Hook                    | Purpose                           | Use Case                                        |
| ----------------------- | --------------------------------- | ----------------------------------------------- |
| `useChat`               | Core chat functionality           | Send messages, streaming, system prompts        |
| `useRetryMessage`       | Retry failed/unwanted responses   | Message action buttons, error recovery          |
| `useBranchConversation` | Create conversation branches      | Alternative conversation paths                  |
| `useShareChat`          | Share conversations publicly      | Create shareable links with optional expiration |
| `useCopySharedChat`     | Copy shared chats to user account | Import shared conversations as new chats        |

---

## 💬 `useChat` - Core Chat Functionality

**Purpose:** Main hook for sending messages and handling chat responses.

### Basic Usage

```typescript
import { useChat } from "~/hooks/use-chat";

function ChatComponent() {
  const { sendMessage, messages, isLoading, error } = useChat({
    model: "gpt-4",
    usePersistedMessages: true,
    enableSystemPrompts: true,
  });

  const handleSend = async () => {
    await sendMessage("Hello, how are you?");
  };

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.content}>{msg.content}</div>
      ))}
      <button onClick={handleSend} disabled={isLoading}>
        {isLoading ? "Sending..." : "Send"}
      </button>
    </div>
  );
}
```

### Advanced Usage with Callbacks

```typescript
const { sendMessage, sendMessages } = useChat({
  model: "claude-3-sonnet",
  temperature: 0.7,
  usePersistedMessages: true,
  enableSystemPrompts: true,
  onResponse: (response) => {
    console.log("Response received:", response.content);
  },
  onStreamingChunk: (chunk) => {
    console.log("Streaming chunk:", chunk.delta);
  },
  onError: (error) => {
    console.error("Chat error:", error.message);
  },
});

// Send a complete conversation
await sendMessages(
  [
    { role: "user", content: "What's the weather like?" },
    {
      role: "assistant",
      content: "I'd be happy to help, but I need your location.",
    },
    { role: "user", content: "I'm in San Francisco" },
  ],
  { stream: true }
);
```

### Options

| Option                 | Type    | Default                            | Description               |
| ---------------------- | ------- | ---------------------------------- | ------------------------- |
| `model`                | string  | `"gemini-2.5-flash-preview-05-20"` | AI model to use           |
| `temperature`          | number  | `0.7`                              | Response creativity (0-1) |
| `maxTokens`            | number  | `4096`                             | Maximum response length   |
| `usePersistedMessages` | boolean | `false`                            | Save to database          |
| `enableSystemPrompts`  | boolean | `false`                            | Include user context      |

### Return Values

| Property            | Type            | Description                                |
| ------------------- | --------------- | ------------------------------------------ |
| `messages`          | `ChatMessage[]` | Current conversation                       |
| `sendMessage`       | function        | Send a single message                      |
| `sendMessages`      | function        | Send multiple messages                     |
| `isLoading`         | boolean         | Is request in progress                     |
| `error`             | string \| null  | Last error message                         |
| `clearMessages`     | function        | Clear conversation                         |
| `persistedMessages` | `Message[]`     | Database messages (if persistence enabled) |
| `chatId`            | string \| null  | Current chat ID (if persistence enabled)   |

---

## 🔄 `useRetryMessage` - Retry Functionality

**Purpose:** Retry AI responses while maintaining conversation context and system prompts.

### Basic Usage

```typescript
import { useRetryMessage } from "~/hooks/use-retry-message";

function MessageActions({ messageId }) {
  const { retryMessage, isRetrying, retryError } = useRetryMessage({
    model: "gpt-4",
    onRetryComplete: () => {
      console.log("Retry successful!");
    },
  });

  const handleRetry = async () => {
    try {
      await retryMessage(messageId);
    } catch (error) {
      console.error("Retry failed:", error);
    }
  };

  return (
    <div>
      <button onClick={handleRetry} disabled={isRetrying}>
        {isRetrying ? "Retrying..." : "Retry"}
      </button>
      {retryError && <div className="error">{retryError}</div>}
    </div>
  );
}
```

### Advanced Usage with Custom Parameters

```typescript
const { retryMessage, isRetrying } = useRetryMessage({
  model: "claude-3-sonnet",
  temperature: 0.9, // Higher creativity for retry
  maxTokens: 8192,
  onRetryStart: () => {
    setShowRetryIndicator(true);
  },
  onRetryComplete: () => {
    setShowRetryIndicator(false);
  },
  onRetryError: (error) => {
    showErrorToast(`Retry failed: ${error.message}`);
  },
});
```

### Key Features

- ✅ **Uses `useChat` internally** - Ensures consistency with regular messages
- ✅ **Preserves context** - Maintains conversation history up to retry point
- ✅ **System prompts** - Same user settings as original message
- ✅ **Database cleanup** - Removes failed messages before retry
- ✅ **Error handling** - Specific retry error states

---

## 🌿 `useBranchConversation` - Branch Functionality

**Purpose:** Create new conversation branches from any point in the chat history.

### Basic Usage

```typescript
import { useBranchConversation } from "~/hooks/use-branch-conversation";

function MessageActions({ messageId }) {
  const { branchConversation, isBranching } = useBranchConversation({
    onBranchComplete: (newChatId) => {
      console.log(`Created new chat: ${newChatId}`);
    },
  });

  const handleBranch = async () => {
    try {
      const newChatId = await branchConversation(messageId);
      // User is automatically navigated to the new chat
    } catch (error) {
      console.error("Branch failed:", error);
    }
  };

  return (
    <button onClick={handleBranch} disabled={isBranching}>
      {isBranching ? "Branching..." : "Branch"}
    </button>
  );
}
```

### Advanced Usage with Callbacks

```typescript
const { branchConversation, isBranching, branchError } = useBranchConversation({
  onBranchStart: () => {
    setShowBranchDialog(false);
    setShowProgressIndicator(true);
  },
  onBranchComplete: (newChatId) => {
    setShowProgressIndicator(false);
    showSuccessToast("Conversation branched successfully");
    // Navigation happens automatically
  },
  onBranchError: (error) => {
    setShowProgressIndicator(false);
    showErrorToast(`Failed to branch: ${error.message}`);
  },
});
```

### What Happens During Branching

1. **Creates new chat** - With descriptive title from first user message
2. **Copies messages** - All messages up to and including the branch point
3. **Sets parent relationship** - Links new chat to original for tracking
4. **Updates database** - Saves to Supabase and caches in Dexie
5. **Refreshes UI** - Updates chat sidebar
6. **Navigates** - Automatically goes to new chat

---

## 🔗 `useShareChat` - Share Functionality

**Purpose:** Create shareable public links for conversations with optional expiration.

### Basic Usage

```typescript
import { useShareChat } from "~/hooks/use-share-chat";

function ShareButton() {
  const { shareChat, isSharing } = useShareChat({
    onShareComplete: (sharedChatId, shareUrl) => {
      navigator.clipboard.writeText(shareUrl);
      showSuccessToast("Share link copied to clipboard!");
    },
  });

  const handleShare = async () => {
    try {
      const { shareUrl } = await shareChat();
      console.log("Share URL:", shareUrl);
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  return (
    <button onClick={handleShare} disabled={isSharing}>
      {isSharing ? "Sharing..." : "Share"}
    </button>
  );
}
```

### Advanced Usage with Expiration

```typescript
const { shareChat, isSharing, shareError } = useShareChat({
  onShareStart: () => {
    setShowShareDialog(false);
    setShowProgressIndicator(true);
  },
  onShareComplete: (sharedChatId, shareUrl) => {
    setShowProgressIndicator(false);
    setShareUrl(shareUrl);
    showSuccessToast("Chat shared successfully");
  },
  onShareError: (error) => {
    setShowProgressIndicator(false);
    showErrorToast(`Failed to share: ${error.message}`);
  },
});

// Share with 7-day expiration
const handleShareWithExpiration = async () => {
  try {
    const { shareUrl } = await shareChat({ expiresInDays: 7 });
    // Share URL will expire in 7 days
  } catch (error) {
    console.error("Share failed:", error);
  }
};

// Share without expiration (permanent)
const handleSharePermanent = async () => {
  try {
    const { shareUrl } = await shareChat();
    // Share URL will never expire
  } catch (error) {
    console.error("Share failed:", error);
  }
};
```

### What Happens During Sharing

1. **Fetches chat title** - Gets current chat title from database
2. **Creates messages snapshot** - Captures all messages in current state
3. **Calculates expiration** - Sets expiration date if specified
4. **Creates shared chat** - Stores in `shared_chats` table with snapshot
5. **Caches locally** - Updates Dexie cache for offline access
6. **Generates URL** - Creates shareable link to `/shared/{id}`

### Share Options

| Option          | Type   | Default     | Description                         |
| --------------- | ------ | ----------- | ----------------------------------- |
| `expiresInDays` | number | `undefined` | Days until share expires (optional) |

### Return Values

| Property          | Type           | Description                                 |
| ----------------- | -------------- | ------------------------------------------- |
| `shareChat`       | function       | Create shared chat with optional expiration |
| `isSharing`       | boolean        | Is share operation in progress              |
| `shareError`      | string \| null | Last share error message                    |
| `clearShareError` | function       | Clear error state                           |

---

## 📋 `useCopySharedChat` - Copy Shared Conversations

**Purpose:** Copy a shared conversation to the current user's account as a new private chat.

### Basic Usage

```typescript
import { useCopySharedChat } from "~/hooks/use-copy-shared-chat";

function SharedChatPage() {
  const { copySharedChat, isCopying, copyError } = useCopySharedChat();

  const handleCopyChat = async () => {
    try {
      const newChatId = await copySharedChat(sharedChat, messages);
      console.log("Chat copied successfully:", newChatId);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  return (
    <button onClick={handleCopyChat} disabled={isCopying}>
      {isCopying ? "Copying..." : "Copy to my chats"}
    </button>
  );
}
```

### Advanced Usage with Callbacks

```typescript
const { copySharedChat, isCopying, copyError, clearCopyError } =
  useCopySharedChat({
    onCopyStart: () => {
      console.log("Starting to copy shared chat...");
    },
    onCopyComplete: (newChatId) => {
      console.log("Chat copied successfully:", newChatId);
      toast.success("Conversation copied to your chats!");
    },
    onCopyError: (error) => {
      console.error("Copy failed:", error);
      toast.error("Failed to copy conversation");
    },
  });

// Clear any previous errors
useEffect(() => {
  clearCopyError();
}, []);
```

### Hook Parameters

- **`sharedChat`** - The shared chat object from the database
- **`messages`** - Array of messages from the shared chat

### Return Values

- **`copySharedChat(sharedChat, messages)`** - Function to copy the shared chat
- **`isCopying`** - Boolean indicating if copy operation is in progress
- **`copyError`** - Error message if copy fails
- **`clearCopyError()`** - Function to clear error state

### Features

- ✅ Creates a new private chat for the current user
- ✅ Copies all messages from the shared conversation
- ✅ Maintains message order and content
- ✅ Automatically navigates to the new chat
- ✅ Updates chat list in sidebar
- ✅ Caches new chat in local storage
- ✅ Error handling with cleanup on failure
- ✅ Optimistic UI updates

### Error Handling

The hook includes comprehensive error handling:

- Validates user authentication
- Ensures messages exist before copying
- Cleans up created chat if message copying fails
- Provides detailed error messages
- Handles caching failures gracefully

---

## 🏗️ Common Usage Patterns

### Complete Chat Interface

```typescript
function ChatInterface() {
  // Core chat functionality
  const { sendMessage, messages, isLoading } = useChat({
    usePersistedMessages: true,
    enableSystemPrompts: true,
  });

  // Message actions
  const { retryMessage, isRetrying } = useRetryMessage();
  const { branchConversation, isBranching } = useBranchConversation();
  const { shareChat, isSharing } = useShareChat();

  return (
    <div>
      {messages.map((message) => (
        <MessageComponent
          key={message.id}
          message={message}
          onRetry={() => retryMessage(message.id)}
          onBranch={() => branchConversation(message.id)}
          onShare={() => shareChat()}
          isRetrying={isRetrying}
          isBranching={isBranching}
          isSharing={isSharing}
        />
      ))}
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
```

### Message Actions Component

```typescript
function MessageActions({ messageId, messageRole }) {
  const { retryMessage, isRetrying } = useRetryMessage();
  const { branchConversation, isBranching } = useBranchConversation();
  const { shareChat, isSharing } = useShareChat();

  // Only show actions for assistant messages
  if (messageRole !== "assistant") return null;

  return (
    <div className="message-actions">
      <button
        onClick={() => retryMessage(messageId)}
        disabled={isRetrying}
        title="Generate a different response"
      >
        🔄 Retry
      </button>

      <button
        onClick={() => branchConversation(messageId)}
        disabled={isBranching}
        title="Create a new conversation from this point"
      >
        🌿 Branch
      </button>

      <button
        onClick={() => shareChat()}
        disabled={isSharing}
        title="Share this conversation"
      >
        🔗 Share
      </button>
    </div>
  );
}
```

---

## 🔧 Best Practices

### 1. **Always Enable Features for Main Chat**

```typescript
// ✅ Good - Full featured chat
const { sendMessage } = useChat({
  usePersistedMessages: true,
  enableSystemPrompts: true,
});

// ❌ Avoid - Missing features
const { sendMessage } = useChat();
```

### 2. **Handle Loading States**

```typescript
const { isLoading } = useChat();
const { isRetrying } = useRetryMessage();
const { isBranching } = useBranchConversation();
const { isSharing } = useShareChat();

const isAnyActionPending = isLoading || isRetrying || isBranching || isSharing;
```

### 3. **Provide User Feedback**

```typescript
const { retryMessage } = useRetryMessage({
  onRetryStart: () => showToast("Retrying message..."),
  onRetryComplete: () => showToast("Retry successful!"),
  onRetryError: (error) => showToast(`Retry failed: ${error.message}`),
});
```

### 4. **Graceful Error Handling**

```typescript
const handleAction = async (actionFn) => {
  try {
    await actionFn();
  } catch (error) {
    // Log error but don't crash the app
    console.error("Action failed:", error);
    showErrorNotification(error.message);
  }
};
```

---

## 🚀 Quick Start

1. **Basic chat** - Use `useChat` with persistence and system prompts
2. **Add retry** - Use `useRetryMessage` for message actions
3. **Add branching** - Use `useBranchConversation` for alternative paths
4. **Add sharing** - Use `useShareChat` to create public links
5. **Compose together** - Combine all four for full functionality

Each hook is designed to work independently or together, giving you maximum flexibility in building your chat interface!
