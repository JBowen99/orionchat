import { useParams } from "react-router";
import { TabsContent } from "~/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import {
  Monitor,
  Moon,
  Sun,
  Key,
  Shield,
  Eye,
  EyeOff,
  Trash2,
  Save,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { Textarea } from "~/components/ui/textarea";
import { TraitInput } from "~/components/ui/trait-input";
import { useSettings } from "~/contexts/settings-context";
import { useTheme } from "~/contexts/theme-context";
import { useChatContext } from "~/contexts/chat-list-context";
import { useApiKeys } from "~/contexts/api-keys-context";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useState } from "react";
import {
  ALL_MODELS,
  MODELS_BY_PROVIDER,
  getModelsByProvider,
} from "~/lib/models";
import type { Provider } from "~/contexts/api-keys-context";
import { AddApiKeyModal } from "~/components/ui/add-api-key-modal";
import { ScrollArea } from "@radix-ui/react-scroll-area";

export default function SettingsCategory() {
  const { category } = useParams();
  const { preferences, updatePreferences, loading, syncing } = useSettings();
  const { baseTheme, themeMode, setBaseTheme, setThemeMode } = useTheme();
  const { chats } = useChatContext();
  const {
    apiKeys,
    hasKey,
    setApiKey,
    removeApiKey,
    loading: apiKeysLoading,
  } = useApiKeys();
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [showApiKeys, setShowApiKeys] = useState<Record<Provider, boolean>>({
    openai: false,
    anthropic: false,
    google: false,
    mistral: false,
    deepseek: false,
    custom: false,
  });
  const [showAddModal, setShowAddModal] = useState(false);

  const handlePreferenceChange = async (
    updates: Partial<typeof preferences>
  ) => {
    await updatePreferences(updates);
  };

  const handleSelectAll = () => {
    if (selectedChats.length === chats.length) {
      setSelectedChats([]);
    } else {
      setSelectedChats(chats.map((chat) => chat.id));
    }
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChats((prev) =>
      prev.includes(chatId)
        ? prev.filter((id) => id !== chatId)
        : [...prev, chatId]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleRemoveApiKey = async (provider: Provider) => {
    await removeApiKey(provider);
  };

  const toggleShowApiKey = (provider: Provider) => {
    setShowApiKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const getProviderDisplayName = (provider: Provider): string => {
    const names: Record<Provider, string> = {
      openai: "OpenAI",
      anthropic: "Anthropic",
      google: "Google AI",
      mistral: "Mistral AI",
      deepseek: "DeepSeek",
      custom: "Custom Provider",
    };
    return names[provider];
  };

  const getProviderDescription = (provider: Provider): string => {
    const descriptions: Record<Provider, string> = {
      openai: "GPT-4, GPT-3.5, and other OpenAI models",
      anthropic: "Claude models for advanced reasoning",
      google: "Gemini models for multimodal AI",
      mistral: "Open and commercial Mistral models",
      deepseek: "DeepSeek Chat and Reasoner models",
      custom: "Custom API endpoints and models",
    };
    return descriptions[provider];
  };

  const getProviderModels = (provider: Provider) => {
    return getModelsByProvider(provider);
  };

  // Get list of providers that have API keys configured
  const configuredProviders = Object.entries(apiKeys)
    .filter(([_, keyEntry]) => keyEntry !== null)
    .map(([provider, _]) => provider as Provider);

  const renderContent = () => {
    switch (category) {
      case "customization":
        return (
          <TabsContent value="customization" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customize Orion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label>What should Orion call you?</Label>
                <Input
                  placeholder="Your Name"
                  value={preferences.name || ""}
                  onChange={(e) =>
                    handlePreferenceChange({ name: e.target.value })
                  }
                />

                <Label>What traits should Orion have?</Label>
                <TraitInput
                  traits={preferences.traits || []}
                  onTraitsChange={(traits) =>
                    handlePreferenceChange({ traits })
                  }
                />

                <Label>Anything else Orion should know?</Label>
                <Textarea
                  placeholder="Interests, values, or preferences to keep in mind"
                  className="h-24"
                  value={preferences.additional_info || ""}
                  onChange={(e) =>
                    handlePreferenceChange({ additional_info: e.target.value })
                  }
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Context Management</CardTitle>
                <CardDescription>
                  Configure how conversation history is sent to AI models to
                  optimize performance and token usage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Context Management Method</Label>
                  <Select
                    value={preferences.context_management_method || "full"}
                    onValueChange={(value) =>
                      handlePreferenceChange({
                        context_management_method: value as
                          | "full"
                          | "recent_messages"
                          | "model_summary"
                          | "smart_summary",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select context method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">
                        <div className="flex flex-col">
                          <span className="font-medium">Full Conversation</span>
                          <span className="text-xs text-muted-foreground">
                            Send entire conversation history (current behavior)
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="recent_messages">
                        <div className="flex flex-col">
                          <span className="font-medium">Recent Messages</span>
                          <span className="text-xs text-muted-foreground">
                            Send first message + recent messages only
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="model_summary">
                        <div className="flex flex-col">
                          <span className="font-medium">Model Summary</span>
                          <span className="text-xs text-muted-foreground">
                            Use AI to summarize conversation history
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="smart_summary">
                        <div className="flex flex-col">
                          <span className="font-medium">Smart Summary</span>
                          <span className="text-xs text-muted-foreground">
                            First message + recent messages + AI summary
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Recent Messages Settings */}
                {preferences.context_management_method ===
                  "recent_messages" && (
                  <div className="space-y-2">
                    <Label>Number of Recent Messages</Label>
                    <Select
                      value={String(
                        preferences.context_recent_messages_count || 10
                      )}
                      onValueChange={(value) =>
                        handlePreferenceChange({
                          context_recent_messages_count: parseInt(value),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 messages</SelectItem>
                        <SelectItem value="10">10 messages</SelectItem>
                        <SelectItem value="15">15 messages</SelectItem>
                        <SelectItem value="20">20 messages</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Includes the first message plus this many recent messages
                    </p>
                  </div>
                )}

                {/* Model Summary Settings */}
                {preferences.context_management_method === "model_summary" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Summary Model</Label>
                      <Select
                        value={
                          preferences.context_summary_model ||
                          "gemini-2.5-flash-preview-05-20"
                        }
                        onValueChange={(value) =>
                          handlePreferenceChange({
                            context_summary_model: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini-2.5-flash-preview-05-20">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                Gemini 2.5 Flash
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Recommended - Fast and cost-effective
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="gemini-1.5-flash">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                Gemini 1.5 Flash
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Fast and reliable
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="gpt-4o-mini">
                            <div className="flex flex-col">
                              <span className="font-medium">GPT-4o Mini</span>
                              <span className="text-xs text-muted-foreground">
                                OpenAI's efficient model
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="claude-3-5-haiku-latest">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                Claude 3.5 Haiku
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Anthropic's fast model
                              </span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        This model will be used to create conversation summaries
                      </p>
                    </div>
                  </div>
                )}

                {/* Smart Summary Settings */}
                {preferences.context_management_method === "smart_summary" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Number of Recent Messages</Label>
                      <Select
                        value={String(
                          preferences.context_smart_summary_recent_count || 3
                        )}
                        onValueChange={(value) =>
                          handlePreferenceChange({
                            context_smart_summary_recent_count: parseInt(value),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 messages</SelectItem>
                          <SelectItem value="3">3 messages</SelectItem>
                          <SelectItem value="4">4 messages</SelectItem>
                          <SelectItem value="5">5 messages</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Number of most recent messages to include alongside the
                        summary
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Summary Model</Label>
                      <Select
                        value={
                          preferences.context_summary_model ||
                          "gemini-2.5-flash-preview-05-20"
                        }
                        onValueChange={(value) =>
                          handlePreferenceChange({
                            context_summary_model: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini-2.5-flash-preview-05-20">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                Gemini 2.5 Flash
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Recommended - Fast and cost-effective
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="gemini-1.5-flash">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                Gemini 1.5 Flash
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Fast and reliable
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="gpt-4o-mini">
                            <div className="flex flex-col">
                              <span className="font-medium">GPT-4o Mini</span>
                              <span className="text-xs text-muted-foreground">
                                OpenAI's efficient model
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="claude-3-5-haiku-latest">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                Claude 3.5 Haiku
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Anthropic's fast model
                              </span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto-update-summary"
                        checked={
                          preferences.context_summary_auto_update ?? true
                        }
                        onCheckedChange={(checked) =>
                          handlePreferenceChange({
                            context_summary_auto_update: checked,
                          })
                        }
                      />
                      <Label htmlFor="auto-update-summary" className="text-sm">
                        Auto-update summary in background
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Automatically update the conversation summary after each
                      AI response
                    </p>
                  </div>
                )}

                {/* Information box */}
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-blue-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Context Management Benefits
                      </h4>
                      <div className="mt-2 text-sm text-blue-700 dark:text-blue-200">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>
                            <strong>Full Conversation:</strong> Complete context
                            but higher token costs
                          </li>
                          <li>
                            <strong>Recent Messages:</strong> Lower costs,
                            maintains recent context
                          </li>
                          <li>
                            <strong>Model Summary:</strong> AI-generated
                            summaries for long conversations
                          </li>
                          <li>
                            <strong>Smart Summary:</strong> Best of both worlds
                            - summaries + recent context
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Visual Customization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <Label>Select Theme</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={baseTheme === "default" ? "default" : "outline"}
                      onClick={() => setBaseTheme("default")}
                      className="flex flex-col items-center gap-2 p-4 h-auto"
                    >
                      <span>Default</span>
                      <div className="flex gap-1">
                        <div className="theme-default w-3 h-3 bg-background border rounded-sm"></div>
                        <div className="theme-default w-3 h-3 bg-foreground rounded-sm"></div>
                        <div className="theme-default w-3 h-3 bg-primary rounded-sm"></div>
                        <div className="theme-default w-3 h-3 bg-secondary rounded-sm"></div>
                        <div className="theme-default w-3 h-3 bg-accent rounded-sm"></div>
                      </div>
                    </Button>
                    <Button
                      variant={baseTheme === "theo" ? "default" : "outline"}
                      onClick={() => setBaseTheme("theo")}
                      className="flex flex-col items-center gap-2 p-4 h-auto"
                    >
                      <span>Theo</span>
                      <div className="flex gap-1">
                        <div className="theme-theo w-3 h-3 bg-background rounded-sm"></div>
                        <div className="theme-theo w-3 h-3 bg-foreground rounded-sm"></div>
                        <div className="theme-theo w-3 h-3 bg-primary rounded-sm"></div>
                        <div className="theme-theo w-3 h-3 bg-secondary rounded-sm"></div>
                        <div className="theme-theo w-3 h-3 bg-accent rounded-sm"></div>
                      </div>
                    </Button>
                    <Button
                      variant={baseTheme === "boring" ? "default" : "outline"}
                      onClick={() => setBaseTheme("boring")}
                      className="flex flex-col items-center gap-2 p-4 h-auto"
                    >
                      <span>Boring</span>
                      <div className="flex gap-1">
                        <div className="theme-boring w-3 h-3 bg-background rounded-sm"></div>
                        <div className="theme-boring w-3 h-3 bg-foreground rounded-sm"></div>
                        <div className="theme-boring w-3 h-3 bg-primary rounded-sm"></div>
                        <div className="theme-boring w-3 h-3 bg-secondary rounded-sm"></div>
                        <div className="theme-boring w-3 h-3 bg-accent rounded-sm"></div>
                      </div>
                    </Button>
                  </div>

                  <Label>Colors</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={themeMode === "light" ? "default" : "outline"}
                      onClick={() => setThemeMode("light")}
                      className="flex items-center gap-2"
                    >
                      <Sun className="w-4 h-4" />
                      <span>Light</span>
                    </Button>
                    <Button
                      variant={themeMode === "dark" ? "default" : "outline"}
                      onClick={() => setThemeMode("dark")}
                      className="flex items-center gap-2"
                    >
                      <Moon className="w-4 h-4" />
                      <span>Dark</span>
                    </Button>
                    <Button
                      variant={themeMode === "system" ? "default" : "outline"}
                      onClick={() => setThemeMode("system")}
                      className="flex items-center gap-2"
                    >
                      <Monitor className="w-4 h-4" />
                      <span>System</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        );

      case "history":
        return (
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>History & Sync</CardTitle>
                <CardDescription>
                  Save your history as JSON, or import someone else's. Importing
                  will NOT delete existing messages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button variant="outline">Export History</Button>
                  <Button variant="outline">Import History</Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Chat History</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Export
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={selectedChats.length === 0}
                      >
                        Delete
                      </Button>
                      <Button variant="outline" size="sm">
                        Import
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={
                                selectedChats.length === chats.length &&
                                chats.length > 0
                              }
                              onCheckedChange={handleSelectAll}
                              aria-label="Select All"
                            />
                          </TableHead>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead className="w-24">Status</TableHead>
                          <TableHead className="w-40">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {chats.map((chat) => (
                          <TableRow key={chat.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedChats.includes(chat.id)}
                                onCheckedChange={() =>
                                  handleSelectChat(chat.id)
                                }
                                aria-label={`Select ${chat.title}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {chat.title || "Untitled Chat"}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                Active
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(chat.created_at)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {chats.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center py-8 text-muted-foreground"
                            >
                              No chat history found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        );

      case "model":
        return (
          <TabsContent value="model" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Models</CardTitle>
                <CardDescription>
                  Choose which models appear in your model selector. This won't
                  affect existing conversations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-4 p-4 overflow-y-scroll h-[500px]">
                  {ALL_MODELS.map((model) => (
                    <Card key={model.id}>
                      <CardHeader>
                        <CardTitle>
                          <div className="flex flex-row">
                            {model.name}
                            <Switch className="ml-auto" />
                          </div>
                        </CardTitle>
                        <CardDescription>{model.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        );

      case "api-keys":
        return (
          <TabsContent value="api-keys" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Manage your AI provider API keys. Keys are encrypted and
                  stored locally only - never synced to our servers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {apiKeysLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-sm text-muted-foreground">
                      Loading API keys...
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Your API Keys</h3>
                      <Button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add API Key
                      </Button>
                    </div>

                    {configuredProviders.length === 0 ? (
                      <div className="text-center py-8">
                        <Shield className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          No API keys configured
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Add your first API key to get started
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {configuredProviders.map((provider) => {
                          const keyEntry = apiKeys[provider];
                          const models = getProviderModels(provider);

                          return (
                            <Card key={provider} className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <h3 className="font-medium flex items-center gap-2">
                                    {keyEntry?.label ||
                                      getProviderDisplayName(provider)}
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                      ✓ Configured
                                    </span>
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {getProviderDescription(provider)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {models.length > 0
                                      ? `${models.length} model${
                                          models.length !== 1 ? "s" : ""
                                        } available`
                                      : "Custom provider"}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 space-y-3">
                                <div className="space-y-2">
                                  <Label>API Key</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type={
                                        showApiKeys[provider]
                                          ? "text"
                                          : "password"
                                      }
                                      value={
                                        showApiKeys[provider]
                                          ? keyEntry?.key || ""
                                          : "••••••••••••••••"
                                      }
                                      readOnly
                                      className="flex-1"
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => toggleShowApiKey(provider)}
                                    >
                                      {showApiKeys[provider] ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() =>
                                        handleRemoveApiKey(provider)
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  {keyEntry?.createdAt && (
                                    <p className="text-xs text-muted-foreground">
                                      Added: {formatDate(keyEntry.createdAt)}
                                      {keyEntry.lastUsed && (
                                        <span>
                                          {" "}
                                          • Last used:{" "}
                                          {formatDate(keyEntry.lastUsed)}
                                        </span>
                                      )}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        <h3 className="font-medium">Security Notice</h3>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-2">
                        <p>
                          • API keys are encrypted using AES-256-GCM encryption
                          before being stored locally
                        </p>
                        <p>
                          • Keys are never transmitted to our servers or shared
                          with third parties
                        </p>
                        <p>
                          • Keys are tied to this device and browser - clearing
                          browser data will remove them
                        </p>
                        <p>
                          • Make sure to keep backup copies of your API keys in
                          a secure location
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <AddApiKeyModal
              open={showAddModal}
              onOpenChange={setShowAddModal}
            />
          </TabsContent>
        );

      case "attachments":
        return (
          <TabsContent value="attachments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Attachments & Files</CardTitle>
                <CardDescription>
                  Configure file upload and attachment settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow File Uploads</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable uploading files to conversations
                    </p>
                  </div>
                  <Switch
                    checked={preferences.allow_file_uploads ?? true}
                    onCheckedChange={(checked) =>
                      handlePreferenceChange({ allow_file_uploads: checked })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max File Size (MB)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={preferences.max_file_size || 10}
                    onChange={(e) =>
                      handlePreferenceChange({
                        max_file_size: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Allowed File Types</Label>
                  <Input
                    placeholder="pdf, doc, txt, png, jpg"
                    value={preferences.allowed_file_types?.join(", ") || ""}
                    onChange={(e) =>
                      handlePreferenceChange({
                        allowed_file_types: e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Storage</h3>
                  <p className="text-sm text-muted-foreground">
                    Used: 2.3 GB / 10 GB
                  </p>
                  <Button variant="outline">Manage Storage</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        );

      case "general":
        return (
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  General application preferences and settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={preferences.language || "en"}
                    onValueChange={(value) =>
                      handlePreferenceChange({ language: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sound Effects</Label>
                    <p className="text-sm text-muted-foreground">
                      Play sounds for notifications and actions
                    </p>
                  </div>
                  <Switch
                    checked={preferences.sound_effects ?? true}
                    onCheckedChange={(checked) =>
                      handlePreferenceChange({ sound_effects: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-save Drafts</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically save message drafts
                    </p>
                  </div>
                  <Switch
                    checked={preferences.auto_save_drafts ?? true}
                    onCheckedChange={(checked) =>
                      handlePreferenceChange({ auto_save_drafts: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Privacy</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Analytics</Label>
                      <p className="text-sm text-muted-foreground">
                        Help improve the app by sharing usage data
                      </p>
                    </div>
                    <Switch
                      checked={preferences.analytics ?? false}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange({ analytics: checked })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        );

      default:
        return (
          <TabsContent value={category || "account"} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Settings Category</CardTitle>
                <CardDescription>
                  This is a placeholder for the {category} settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>Content for {category} settings will be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return renderContent();
}
