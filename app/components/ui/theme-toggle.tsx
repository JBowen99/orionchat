import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useTheme } from "~/contexts/theme-context";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { actualTheme, themeMode, setThemeMode } = useTheme();

  const toggleTheme = () => {
    setThemeMode(actualTheme === "light" ? "dark" : "light");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`${className}`}
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
