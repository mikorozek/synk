"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

interface ThemeToggleProps {
  leftOffset?: number;
  rightOffset?: number;
}

export function ThemeToggle({ leftOffset = 0, rightOffset = 0 }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const horizontalOffset = (leftOffset - rightOffset) / 2;

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-1/2 -translate-x-1/2 z-40 bg-card border border-border transition-all duration-300"
        style={{ marginLeft: `${horizontalOffset}px` }}
        disabled
      >
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="fixed top-3 left-1/2 -translate-x-1/2 z-40 bg-card border border-border hover:bg-muted transition-all duration-300"
      style={{ marginLeft: `${horizontalOffset}px` }}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
