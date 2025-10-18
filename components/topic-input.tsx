"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send } from "lucide-react";

interface TopicInputProps {
  onCreateTopic: (title: string, prompt: string) => void;
}

export function TopicInput({ onCreateTopic }: TopicInputProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onCreateTopic("", prompt.trim());
      setPrompt("");
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-8 text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold text-balance">Synk</h1>
        </div>
        <p className="text-lg text-muted-foreground text-balance">
          Stay in sync with what matters. Track topics and get notified when
          they appear across the web.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Textarea
            placeholder="What would you like to track? Describe the news or information you want to follow..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px] text-base resize-none bg-card pr-12"
            autoFocus
          />
          <Button
            type="submit"
            size="icon"
            className="absolute bottom-2 right-2 rounded-full"
            disabled={!prompt.trim()}
            aria-label="Create Topic"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
