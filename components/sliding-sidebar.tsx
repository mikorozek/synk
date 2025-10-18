"use client"

import type React from "react"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface SlidingSidebarProps {
  side: "left" | "right"
  children: React.ReactNode
  icon: React.ReactNode
}

export function SlidingSidebar({ side, children, icon }: SlidingSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Trigger Button */}
      <button
        onMouseEnter={() => setIsOpen(true)}
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-40 p-3 bg-muted/80 backdrop-blur-sm hover:bg-muted transition-all duration-300 rounded-lg",
          side === "left" ? "left-4" : "right-4",
        )}
        aria-label={`Toggle ${side} sidebar`}
      >
        {icon}
      </button>

      {/* Sidebar Panel */}
      <div
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className={cn(
          "fixed top-0 h-full w-80 bg-card border-border z-50 transition-transform duration-300 ease-in-out shadow-2xl",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          isOpen ? "translate-x-0" : side === "left" ? "-translate-x-full" : "translate-x-full",
        )}
      >
        <div className="h-full overflow-y-auto p-6">{children}</div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setIsOpen(false)} />
      )}
    </>
  )
}
