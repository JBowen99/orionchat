import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useTheme } from "~/contexts/theme-context";

export function ThemeToggle() {
  const { actualTheme, themeMode, setThemeMode } = useTheme();

  const toggleTheme = () => {
    setThemeMode(actualTheme === "light" ? "dark" : "light");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={toggleTheme}
      aria-label={`Switch to ${
        actualTheme === "light" ? "dark" : "light"
      } mode`}
    >
      {actualTheme === "light" ? (
        <Moon className="w-4 h-4" />
      ) : (
        <Sun className="w-4 h-4" />
      )}
    </Button>
  );
}
