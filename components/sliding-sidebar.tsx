"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { PanelLeft, PanelRight } from "lucide-react";

interface SlidingSidebarProps {
  side: "left" | "right";
  children: React.ReactNode;
  icon: React.ReactNode;
  onToggle?: (isOpen: boolean) => void;
}

export function SlidingSidebar({ side, children, icon, onToggle }: SlidingSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    onToggle?.(isOpen);
  }, [isOpen, onToggle]);

  return (
    <>
      {/* Fixed Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed top-3 p-2.5 hover:bg-muted rounded-lg transition-colors z-40 bg-card border border-border",
          side === "left" ? "left-3" : "right-3"
        )}
        aria-label={`Toggle ${side} sidebar`}
      >
        {isOpen ? (
          side === "left" ? <PanelLeft className="w-5 h-5" /> : <PanelRight className="w-5 h-5" />
        ) : (
          icon
        )}
      </button>

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
