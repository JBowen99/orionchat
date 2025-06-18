import type { Tables } from 'database.types'
import Dexie, { type Table } from 'dexie'


// Alias Supabase row types
type Chat = Tables<'chats'>
type Message = Tables<'messages'>
type Hat = Tables<'hats'>
type Project = Tables<'projects'>
type SharedChat = Tables<'shared_chats'>
type UserProfile = Tables<'user_profiles'>
type UserSetting = Tables<'user_settings'>

class AppDatabase extends Dexie {
  chats!: Table<Chat>
  messages!: Table<Message>
  hats!: Table<Hat>
  projects!: Table<Project>
  shared_chats!: Table<SharedChat>
  user_profiles!: Table<UserProfile>
  user_settings!: Table<UserSetting>

  constructor() {
    super('aiChatAppDB')

    this.version(1).stores({
      chats: 'id, user_id, created_at, updated_at, pinned, parent_chat_id, project_id, shared',
      messages: 'id, chat_id, created_at, parent_message_id, role, type',
      hats: 'id, user_id, is_default, created_at, updated_at',
      projects: 'id, user_id, created_at, updated_at',
      shared_chats: 'id, original_chat_id, owner_user_id, created_at, expires_at',
      user_profiles: 'id, created_at, updated_at',
      user_settings: 'id, user_id, created_at, updated_at',
    })

    // Note: Timestamps are handled by Supabase, so we don't need client-side timestamp hooks
  }

  // Utility methods for cache-first operations
  
  /**
   * Get user's chats from cache, ordered by most recent
   */
  async getUserChats(userId?: string): Promise<Chat[]> {
    if (!userId) return []
    
    return this.chats
      .where('user_id')
      .equals(userId)
      .reverse()
      .sortBy('created_at')
  }

  /**
   * Get messages for a specific chat from cache
   */
  async getChatMessages(chatId: string): Promise<Message[]> {
    return this.messages
      .where('chat_id')
      .equals(chatId)
      .sortBy('created_at')
  }

  /**
   * === PERFORMANCE OPTIMIZATION ===
   * Prefetch messages for multiple chats to enable instant switching
   */
  async prefetchChatMessages(chatIds: string[]): Promise<Record<string, Message[]>> {
    const result: Record<string, Message[]> = {};
    
    try {
      // Use a single IndexedDB query to fetch all messages for multiple chats
      const allMessages = await this.messages
        .where('chat_id')
        .anyOf(chatIds)
        .sortBy('created_at');

      // Group messages by chat_id
      for (const message of allMessages) {
        if (!result[message.chat_id]) {
          result[message.chat_id] = [];
        }
        result[message.chat_id].push(message);
      }
      
      return result;
    } catch (error) {
      console.warn('Prefetch failed:', error);
      return {};
    }
  }

  /**
   * Get user's hats from cache
   */
  async getUserHats(userId?: string): Promise<Hat[]> {
    if (!userId) return []
    
    return this.hats
      .where('user_id')
      .equals(userId)
      .reverse()
      .sortBy('created_at')
  }

  /**
   * Get user's projects from cache
   */
  async getUserProjects(userId?: string): Promise<Project[]> {
    if (!userId) return []
    
    return this.projects
      .where('user_id')
      .equals(userId)
      .reverse()
      .sortBy('created_at')
  }

  /**
   * Sync fresh data to cache, replacing existing data
   */
  async syncChats(chats: Chat[]): Promise<void> {
    await this.transaction('rw', this.chats, async () => {
      await this.chats.clear()
      await this.chats.bulkAdd(chats)
    })
  }

  async syncMessages(messages: Message[]): Promise<void> {
    await this.transaction('rw', this.messages, async () => {
      await this.messages.clear()
      await this.messages.bulkAdd(messages)
    })
  }

  async syncHats(hats: Hat[]): Promise<void> {
    await this.transaction('rw', this.hats, async () => {
      await this.hats.clear()
      await this.hats.bulkAdd(hats)
    })
  }

  async syncProjects(projects: Project[]): Promise<void> {
    await this.transaction('rw', this.projects, async () => {
      await this.projects.clear()
      await this.projects.bulkAdd(projects)
    })
  }
}

export const db = new AppDatabase()
