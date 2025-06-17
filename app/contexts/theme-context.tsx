import * as React from "react";

type BaseTheme = "default" | "theo" | "boring";
type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  baseTheme: BaseTheme;
  themeMode: ThemeMode;
  setBaseTheme: (theme: BaseTheme) => void;
  setThemeMode: (mode: ThemeMode) => void;
  actualTheme: "light" | "dark";
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(
  undefined
);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [baseTheme, setBaseTheme] = React.useState<BaseTheme>("default");
  const [themeMode, setThemeMode] = React.useState<ThemeMode>("system");
  const [actualTheme, setActualTheme] = React.useState<"light" | "dark">(
    "light"
  );

  // Get system preference
  const getSystemTheme = React.useCallback((): "light" | "dark" => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  }, []);

  // Update actual theme based on theme mode
  React.useEffect(() => {
    const updateTheme = () => {
      let newActualTheme: "light" | "dark";

      if (themeMode === "system") {
        newActualTheme = getSystemTheme();
      } else {
        newActualTheme = themeMode;
      }

      setActualTheme(newActualTheme);

      // Use requestAnimationFrame for non-blocking DOM updates
      requestAnimationFrame(() => {
        const root = document.documentElement;

        // Remove all theme classes
        root.classList.remove("dark", "theme-theo", "theme-boring");

        // Apply base theme if not default
        if (baseTheme === "theo") {
          root.classList.add("theme-theo");
        } else if (baseTheme === "boring") {
          root.classList.add("theme-boring");
        }

        // Apply dark mode if needed
        if (newActualTheme === "dark") {
          root.classList.add("dark");
        }
      });
    };

    updateTheme();
  }, [baseTheme, themeMode, getSystemTheme]);

  // Listen for system theme changes
  React.useEffect(() => {
    if (themeMode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => {
        const systemTheme = getSystemTheme();
        setActualTheme(systemTheme);
        const root = document.documentElement;

        // Remove dark class and re-add if needed
        root.classList.remove("dark");
        if (systemTheme === "dark") {
          root.classList.add("dark");
        }
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [themeMode, getSystemTheme]);

  // Load theme from localStorage on mount
  React.useEffect(() => {
    const savedBaseTheme = localStorage.getItem("baseTheme") as BaseTheme;
    const savedThemeMode = localStorage.getItem("themeMode") as ThemeMode;

    if (
      savedBaseTheme &&
      ["default", "theo", "boring"].includes(savedBaseTheme)
    ) {
      setBaseTheme(savedBaseTheme);
    }

    if (
      savedThemeMode &&
      ["light", "dark", "system"].includes(savedThemeMode)
    ) {
      setThemeMode(savedThemeMode);
    }
  }, []);

  // Save theme to localStorage when it changes
  React.useEffect(() => {
    localStorage.setItem("baseTheme", baseTheme);
    localStorage.setItem("themeMode", themeMode);
  }, [baseTheme, themeMode]);

  const value = React.useMemo(
    () => ({
      baseTheme,
      themeMode,
      setBaseTheme,
      setThemeMode,
      actualTheme,
    }),
    [baseTheme, themeMode, actualTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Export types for use in other components
export type { BaseTheme, ThemeMode };
