"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";

interface TopicInputProps {
  onCreateTopic: (title: string, prompt: string) => void;
}

export function TopicInput({ onCreateTopic }: TopicInputProps) {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && prompt.trim()) {
      onCreateTopic(title.trim(), prompt.trim());
      setTitle("");
      setPrompt("");
      setIsExpanded(false);
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
        {!isExpanded ? (
          <div className="relative">
            <Textarea
              placeholder="What would you like to track? Describe the news or information you want to follow..."
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (e.target.value.length > 0) {
                  setIsExpanded(true);
                }
              }}
              className="min-h-[120px] text-base resize-none bg-card"
              autoFocus
            />
          </div>
        ) : (
          <div className="space-y-4 p-6 bg-card rounded-lg border border-border">
            <div className="space-y-2">
              <Label htmlFor="title">Topic Name</Label>
              <Input
                id="title"
                placeholder="e.g., AI Developments, Climate News, Tech Startups..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-base"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Description</Label>
              <Textarea
                id="prompt"
                placeholder="Describe what you want to track in detail..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] text-base resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsExpanded(false);
                  setTitle("");
                  setPrompt("");
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim() || !prompt.trim()}>
                Create Topic
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
