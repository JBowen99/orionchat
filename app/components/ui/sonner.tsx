"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
import type { ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--toast-background)",
          "--normal-text": "var(--toast-foreground)",
          "--normal-border": "var(--toast-border)",
          "--success-bg": "var(--toast-success-background)",
          "--success-text": "var(--toast-success-foreground)",
          "--success-border": "var(--toast-success-border)",
          "--error-bg": "var(--toast-error-background)",
          "--error-text": "var(--toast-error-foreground)",
          "--error-border": "var(--toast-error-border)",
          "--warning-bg": "var(--toast-warning-background)",
          "--warning-text": "var(--toast-warning-foreground)",
          "--warning-border": "var(--toast-warning-border)",
          "--info-bg": "var(--toast-info-background)",
          "--info-text": "var(--toast-info-foreground)",
          "--info-border": "var(--toast-info-border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
