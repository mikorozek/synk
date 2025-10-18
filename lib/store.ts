"use client";

import { v4 as uuidv4 } from "uuid";
import type { Topic, Notification, AppState } from "./types";

const STORAGE_KEY = "synk-app-state";

export function loadState(): AppState {
  if (typeof window === "undefined") {
    return { topics: [], notifications: [] };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { topics: [], notifications: [] };
    }

    const parsed = JSON.parse(stored);
    return {
      topics: parsed.topics.map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      })),
      notifications: parsed.notifications.map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt),
      })),
    };
  } catch {
    return { topics: [], notifications: [] };
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save state:", error);
  }
}

export function createTopic(title: string, prompt: string): Topic {
  return {
    id: uuidv4(),
    title,
    prompt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createNotification(
  topicId: string,
  title: string,
  content: string,
  source: string,
  url?: string
): Notification {
  return {
    id: uuidv4(),
    topicId,
    title,
    content,
    source,
    url,
    createdAt: new Date(),
    isRead: false,
  };
}
