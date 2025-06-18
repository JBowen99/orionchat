import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { encrypt, decrypt, getDeviceKey } from "~/lib/crypto";
import type { ModelConfig } from "~/lib/models";

export type Provider =
  | "openai"
  | "anthropic"
  | "google"
  | "mistral"
  | "deepseek"
  | "openrouter"
  | "custom";

export interface ApiKeyEntry {
  provider: Provider;
  key: string;
  label?: string;
  createdAt: string;
  lastUsed?: string;
}

interface ApiKeysContextType {
  apiKeys: Record<Provider, ApiKeyEntry | null>;
  loading: boolean;
  hasKey: (provider: Provider) => boolean;
  getApiKey: (provider: Provider) => string | null;
  setApiKey: (provider: Provider, key: string, label?: string) => Promise<void>;
  removeApiKey: (provider: Provider) => Promise<void>;
  updateLastUsed: (provider: Provider) => Promise<void>;
  exportKeys: () => Promise<string>;
  importKeys: (encryptedData: string, password: string) => Promise<void>;
}

const ApiKeysContext = createContext<ApiKeysContextType | undefined>(undefined);

const STORAGE_KEY = "orion_api_keys_encrypted";

export const ApiKeysProvider = ({ children }: { children: ReactNode }) => {
  const [apiKeys, setApiKeys] = useState<Record<Provider, ApiKeyEntry | null>>({
    openai: null,
    anthropic: null,
    google: null,
    mistral: null,
    deepseek: null,
    openrouter: null,
    custom: null,
  });
  const [loading, setLoading] = useState(true);

  // Load encrypted API keys from localStorage on mount
  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        const encryptedData = localStorage.getItem(STORAGE_KEY);
        if (encryptedData) {
          const deviceKey = getDeviceKey();
          const decryptedData = await decrypt(encryptedData, deviceKey);
          const keys = JSON.parse(decryptedData) as Record<
            Provider,
            ApiKeyEntry | null
          >;
          setApiKeys(keys);
        }
      } catch (error) {
        console.error("Failed to load API keys:", error);
        // If decryption fails, clear the corrupted data
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    };

    loadApiKeys();
  }, []);

  // Save encrypted API keys to localStorage
  const saveApiKeys = async (keys: Record<Provider, ApiKeyEntry | null>) => {
    try {
      const deviceKey = getDeviceKey();
      const encryptedData = await encrypt(JSON.stringify(keys), deviceKey);
      localStorage.setItem(STORAGE_KEY, encryptedData);
      setApiKeys(keys);
    } catch (error) {
      console.error("Failed to save API keys:", error);
      throw error;
    }
  };

  const hasKey = (provider: Provider): boolean => {
    return apiKeys[provider] !== null && apiKeys[provider]?.key !== "";
  };

  const getApiKey = (provider: Provider): string | null => {
    return apiKeys[provider]?.key || null;
  };

  const setApiKey = async (
    provider: Provider,
    key: string,
    label?: string
  ): Promise<void> => {
    const newEntry: ApiKeyEntry = {
      provider,
      key,
      label: label || provider.charAt(0).toUpperCase() + provider.slice(1),
      createdAt: new Date().toISOString(),
    };

    const newKeys = {
      ...apiKeys,
      [provider]: newEntry,
    };

    await saveApiKeys(newKeys);
  };

  const removeApiKey = async (provider: Provider): Promise<void> => {
    const newKeys = {
      ...apiKeys,
      [provider]: null,
    };

    await saveApiKeys(newKeys);
  };

  const updateLastUsed = async (provider: Provider): Promise<void> => {
    const existingKey = apiKeys[provider];
    if (existingKey) {
      const updatedKey = {
        ...existingKey,
        lastUsed: new Date().toISOString(),
      };

      const newKeys = {
        ...apiKeys,
        [provider]: updatedKey,
      };

      await saveApiKeys(newKeys);
    }
  };

  const exportKeys = async (): Promise<string> => {
    // Export with a user-provided password for portability
    const deviceKey = getDeviceKey();
    return await encrypt(JSON.stringify(apiKeys), deviceKey);
  };

  const importKeys = async (
    encryptedData: string,
    password: string
  ): Promise<void> => {
    try {
      const decryptedData = await decrypt(encryptedData, password);
      const importedKeys = JSON.parse(decryptedData) as Record<
        Provider,
        ApiKeyEntry | null
      >;

      // Merge with existing keys, allowing user to choose which to import
      const newKeys = { ...apiKeys };
      Object.entries(importedKeys).forEach(([provider, keyEntry]) => {
        if (keyEntry) {
          newKeys[provider as Provider] = keyEntry;
        }
      });

      await saveApiKeys(newKeys);
    } catch (error) {
      console.error("Failed to import API keys:", error);
      throw error;
    }
  };

  const value: ApiKeysContextType = {
    apiKeys,
    loading,
    hasKey,
    getApiKey,
    setApiKey,
    removeApiKey,
    updateLastUsed,
    exportKeys,
    importKeys,
  };

  return (
    <ApiKeysContext.Provider value={value}>{children}</ApiKeysContext.Provider>
  );
};

export const useApiKeys = (): ApiKeysContextType => {
  const context = useContext(ApiKeysContext);
  if (!context) {
    throw new Error("useApiKeys must be used within an ApiKeysProvider");
  }
  return context;
};
