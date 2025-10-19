"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { PanelLeft, PanelRight, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

interface SlidingSidebarProps {
  side: "left" | "right";
  children: React.ReactNode;
  icon: React.ReactNode;
  onToggle?: (isOpen: boolean) => void;
}

export function SlidingSidebar({ side, children, icon, onToggle }: SlidingSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    onToggle?.(isOpen);
  }, [isOpen, onToggle]);

  return (
    <>
      {/* Fixed Toggle Buttons */}
      <div
        className={cn(
          "fixed top-3 flex gap-2 z-40",
          side === "left" ? "left-3" : "right-3"
        )}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2.5 hover:bg-muted rounded-lg transition-colors bg-card border border-border"
          aria-label={`Toggle ${side} sidebar`}
        >
          {isOpen ? (
            side === "left" ? <PanelLeft className="w-5 h-5" /> : <PanelRight className="w-5 h-5" />
          ) : (
            icon
          )}
        </button>

        {side === "left" && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2.5 hover:bg-muted rounded-lg transition-colors bg-card border border-border"
            aria-label="Toggle theme"
            disabled={!mounted}
          >
            {mounted && theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed top-0 h-full bg-card border-border z-30 transition-all duration-300 ease-in-out shadow-2xl",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          isOpen ? "w-80" : "w-0"
        )}
      >
        {/* Sidebar Content */}
        <div className={cn(
          "h-full pt-16 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          {children}
        </div>
      </div>
    </>
  );
}
