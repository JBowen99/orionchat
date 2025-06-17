import { useEffect, useState } from "react";
import { db } from "~/dexie/db";
import type { Tables } from "database.types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Button } from "~/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  ChevronDown,
  RefreshCw,
  Database,
  MessageSquare,
  Users,
  Folder,
  Settings,
  User,
} from "lucide-react";

type Chat = Tables<"chats">;
type Message = Tables<"messages">;
type Hat = Tables<"hats">;
type Project = Tables<"projects">;
type SharedChat = Tables<"shared_chats">;
type UserProfile = Tables<"user_profiles">;
type UserSetting = Tables<"user_settings">;

interface CacheStats {
  chats: Chat[];
  messages: Message[];
  hats: Hat[];
  projects: Project[];
  sharedChats: SharedChat[];
  userProfiles: UserProfile[];
  userSettings: UserSetting[];
}

export default function DebugPage() {
  const [cacheData, setCacheData] = useState<CacheStats>({
    chats: [],
    messages: [],
    hats: [],
    projects: [],
    sharedChats: [],
    userProfiles: [],
    userSettings: [],
  });
  const [loading, setLoading] = useState(true);
  const [expandedChats, setExpandedChats] = useState<Set<string>>(new Set());

  const loadCacheData = async () => {
    setLoading(true);
    try {
      const [
        chats,
        messages,
        hats,
        projects,
        sharedChats,
        userProfiles,
        userSettings,
      ] = await Promise.all([
        db.chats.orderBy("created_at").reverse().toArray(),
        db.messages.orderBy("created_at").toArray(),
        db.hats.orderBy("created_at").reverse().toArray(),
        db.projects.orderBy("created_at").reverse().toArray(),
        db.shared_chats.orderBy("created_at").reverse().toArray(),
        db.user_profiles.orderBy("created_at").reverse().toArray(),
        db.user_settings.orderBy("created_at").reverse().toArray(),
      ]);

      setCacheData({
        chats,
        messages,
        hats,
        projects,
        sharedChats,
        userProfiles,
        userSettings,
      });
    } catch (error) {
      console.error("Error loading cache data:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    if (confirm("Are you sure you want to clear all cached data?")) {
      try {
        await Promise.all([
          db.chats.clear(),
          db.messages.clear(),
          db.hats.clear(),
          db.projects.clear(),
          db.shared_chats.clear(),
          db.user_profiles.clear(),
          db.user_settings.clear(),
        ]);
        await loadCacheData();
      } catch (error) {
        console.error("Error clearing cache:", error);
      }
    }
  };

  const toggleChatExpansion = (chatId: string) => {
    const newExpanded = new Set(expandedChats);
    if (newExpanded.has(chatId)) {
      newExpanded.delete(chatId);
    } else {
      newExpanded.add(chatId);
    }
    setExpandedChats(newExpanded);
  };

  const getChatMessages = (chatId: string) => {
    return cacheData.messages.filter((message) => message.chat_id === chatId);
  };

  useEffect(() => {
    loadCacheData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading cache data...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            Dexie Cache Debug
          </h1>
          <p className="text-muted-foreground mt-2">
            View and manage your local IndexedDB cache data
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadCacheData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={clearCache} variant="destructive">
            Clear Cache
          </Button>
        </div>
      </div>

      {/* Cache Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{cacheData.chats.length}</div>
            <div className="text-sm text-muted-foreground">Chats</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">
              {cacheData.messages.length}
            </div>
            <div className="text-sm text-muted-foreground">Messages</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-bold">{cacheData.hats.length}</div>
            <div className="text-sm text-muted-foreground">Hats</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Folder className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <div className="text-2xl font-bold">
              {cacheData.projects.length}
            </div>
            <div className="text-sm text-muted-foreground">Projects</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-6 w-6 mx-auto mb-2 text-red-500" />
            <div className="text-2xl font-bold">
              {cacheData.sharedChats.length}
            </div>
            <div className="text-sm text-muted-foreground">Shared</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <User className="h-6 w-6 mx-auto mb-2 text-cyan-500" />
            <div className="text-2xl font-bold">
              {cacheData.userProfiles.length}
            </div>
            <div className="text-sm text-muted-foreground">Profiles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Settings className="h-6 w-6 mx-auto mb-2 text-gray-500" />
            <div className="text-2xl font-bold">
              {cacheData.userSettings.length}
            </div>
            <div className="text-sm text-muted-foreground">Settings</div>
          </CardContent>
        </Card>
      </div>

      {/* Chats with Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chats & Messages ({cacheData.chats.length})
          </CardTitle>
          <CardDescription>
            Cached chats from Dexie with their associated messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cacheData.chats.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No chats in cache
            </p>
          ) : (
            cacheData.chats.map((chat) => {
              const chatMessages = getChatMessages(chat.id);
              const isExpanded = expandedChats.has(chat.id);

              return (
                <Collapsible key={chat.id}>
                  <div className="border rounded-lg p-4">
                    <CollapsibleTrigger
                      className="w-full text-left"
                      onClick={() => toggleChatExpansion(chat.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{chat.title}</h3>
                            {chat.pinned && (
                              <Badge variant="secondary">Pinned</Badge>
                            )}
                            {chat.shared && (
                              <Badge variant="outline">Shared</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>ID: {chat.id.slice(0, 8)}...</span>
                            <span>Messages: {chatMessages.length}</span>
                            <span>
                              Created:{" "}
                              {new Date(chat.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            isExpanded ? "transform rotate-180" : ""
                          }`}
                        />
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <Separator className="my-4" />
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">
                          Messages ({chatMessages.length})
                        </h4>
                        {chatMessages.length === 0 ? (
                          <p className="text-muted-foreground text-sm">
                            No messages in this chat
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {chatMessages.map((message) => (
                              <div
                                key={message.id}
                                className="border-l-2 border-muted pl-3 py-2"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    variant={
                                      message.role === "user"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {message.role}
                                  </Badge>
                                  <Badge variant="outline">
                                    {message.type}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(
                                      message.created_at
                                    ).toLocaleTimeString()}
                                  </span>
                                </div>
                                {message.content && (
                                  <p className="text-sm text-muted-foreground line-clamp-3">
                                    {message.content.slice(0, 200)}
                                    {message.content.length > 200 && "..."}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Other cached data sections can be added here if needed */}
      {cacheData.hats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              AI Hats ({cacheData.hats.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cacheData.hats.map((hat) => (
                <div key={hat.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium">{hat.name}</h3>
                    {hat.is_default && <Badge variant="default">Default</Badge>}
                  </div>
                  {hat.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {hat.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {hat.traits.map((trait, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
