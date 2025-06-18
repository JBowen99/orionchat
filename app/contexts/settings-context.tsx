import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "~/lib/client";
import { db } from "~/dexie/db";
import { useUser } from "~/contexts/user-context";
import type { Tables } from "database.types";

// Type for user preferences stored in the preferences JSON column
export interface UserPreferences {
  name?: string;
  traits?: string[];
  additional_info?: string;
  favorite_models?: string[];
  theme?: string;
  language?: string;
  sound_effects?: boolean;
  auto_save_drafts?: boolean;
  analytics?: boolean;
  save_chat_history?: boolean;
  sync_across_devices?: boolean;
  allow_file_uploads?: boolean;
  max_file_size?: number;
  allowed_file_types?: string[];
  default_model?: string;
  temperature?: number;
  max_tokens?: number;
  // Context management settings
  context_management_method?:
    | "full"
    | "recent_messages"
    | "model_summary"
    | "smart_summary";
  context_recent_messages_count?: number;
  context_summary_model?: string;
  context_summary_auto_update?: boolean;
  context_smart_summary_recent_count?: number;
}

type UserProfile = Tables<"user_profiles">;

interface SettingsContextType {
  preferences: UserPreferences;
  loading: boolean;
  syncing: boolean;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const { user } = useUser();
  const [supabase] = useState(() => createClient());

  const refreshSettings = async () => {
    if (!user?.id) return;

    setSyncing(true);

    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "not found"
        console.error("Supabase fetch error:", error);
        return;
      }

      let userProfile: UserProfile;

      if (!data) {
        // Create new user profile if it doesn't exist
        const { data: newProfile, error: insertError } = await supabase
          .from("user_profiles")
          .insert({
            id: user.id,
            preferences: {},
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating user profile:", insertError);
          return;
        }

        userProfile = newProfile;
      } else {
        userProfile = data;
      }

      const prefs = (userProfile.preferences as UserPreferences) || {};
      setPreferences(prefs);

      // Update Dexie cache with fresh data
      await db.user_profiles.put(userProfile);
    } catch (error) {
      console.error("Error refreshing settings:", error);
    } finally {
      setSyncing(false);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!user?.id) return;

    const newPreferences = { ...preferences, ...updates };

    // Optimistically update local state
    setPreferences(newPreferences);

    try {
      setSyncing(true);

      // Update Supabase
      const { data, error } = await supabase
        .from("user_profiles")
        .update({
          preferences: newPreferences,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating preferences:", error);
        // Revert optimistic update on error
        setPreferences(preferences);
        return;
      }

      // Update Dexie cache
      if (data) {
        await db.user_profiles.put(data);
      }
    } catch (error) {
      console.error("Error updating preferences:", error);
      // Revert optimistic update on error
      setPreferences(preferences);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // First, load from Dexie cache for instant feedback
        const cachedProfile = await db.user_profiles.get(user.id);

        if (cachedProfile?.preferences) {
          const prefs = (cachedProfile.preferences as UserPreferences) || {};
          setPreferences(prefs);
          setLoading(false); // Set loading to false immediately with cached data
        }

        // Then sync with Supabase in the background
        await refreshSettings();
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false); // Ensure loading is false even if cache was empty
      }
    };

    loadSettings();
  }, [user?.id]);

  const value: SettingsContextType = {
    preferences,
    loading,
    syncing,
    updatePreferences,
    refreshSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
