import { useApiKeys } from "~/contexts/api-keys-context";
import type { Provider } from "~/contexts/api-keys-context";

/**
 * Hook to get API key for a specific provider and optionally update its last used timestamp
 */
export function useProviderApiKey() {
  const { getApiKey, hasKey, updateLastUsed } = useApiKeys();

  const getKeyForProvider = (provider: Provider): string | null => {
    return getApiKey(provider);
  };

  const markAsUsed = async (provider: Provider): Promise<void> => {
    await updateLastUsed(provider);
  };

  const hasKeyForProvider = (provider: Provider): boolean => {
    return hasKey(provider);
  };

  /**
   * Get an API key for a provider and mark it as used
   */
  const useKey = async (provider: Provider): Promise<string | null> => {
    const key = getApiKey(provider);
    if (key) {
      await updateLastUsed(provider);
    }
    return key;
  };

  return {
    getKeyForProvider,
    hasKeyForProvider,
    markAsUsed,
    useKey,
  };
} 