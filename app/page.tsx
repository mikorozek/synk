"use client";

import { useState, useEffect } from "react";
import type { Topic, Notification } from "@/lib/types";
import {
  loadState,
  saveState,
  createTopic,
  createNotification,
} from "@/lib/store";
import { SlidingSidebar } from "@/components/sliding-sidebar";
import { TopicsSidebar } from "@/components/topics-sidebar";
import { NotificationsSidebar } from "@/components/notifications-sidebar";
import { TopicInput } from "@/components/topic-input";
import { TopicBoard } from "@/components/topic-board";
import { List, Bell } from "lucide-react";

export default function HomePage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    const state = loadState();
    setTopics(state.topics);
    setNotifications(state.notifications);

    // Add demo notifications if this is the first load
    if (state.topics.length === 0 && state.notifications.length === 0) {
      const demoTopic = createTopic(
        "AI Developments",
        "Track the latest developments in artificial intelligence, machine learning, and AI applications"
      );
      const demoNotifications = [
        createNotification(
          demoTopic.id,
          "New AI Model Released by OpenAI",
          "OpenAI has announced a new language model with improved reasoning capabilities and reduced hallucinations. The model shows significant improvements in mathematical problem-solving and code generation.",
          "Tech News",
          "https://example.com"
        ),
        createNotification(
          demoTopic.id,
          "Google Announces AI-Powered Search Features",
          "Google is rolling out new AI-powered search features that provide more contextual and conversational results. The update includes better understanding of complex queries.",
          "Google Blog"
        ),
      ];

      const newState = {
        topics: [demoTopic],
        notifications: demoNotifications,
      };
      setTopics(newState.topics);
      setNotifications(newState.notifications);
      saveState(newState);
    }
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    if (topics.length > 0 || notifications.length > 0) {
      saveState({ topics, notifications });
    }
  }, [topics, notifications]);

  const handleCreateTopic = (title: string, prompt: string) => {
    const newTopic = createTopic(title, prompt);
    setTopics((prev) => [newTopic, ...prev]);

    // Simulate getting a notification after creating a topic
    setTimeout(() => {
      const demoNotification = createNotification(
        newTopic.id,
        `Welcome to ${title}`,
        `You're now tracking "${title}". We'll notify you when relevant content appears across social media, websites, RSS feeds, and newsletters.`,
        "Synk System"
      );
      setNotifications((prev) => [demoNotification, ...prev]);
    }, 1000);
  };

  const handleTopicClick = (topic: Topic) => {
    setSelectedTopic(topic);
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
    );

    // Navigate to the topic
    const topic = topics.find((t) => t.id === notification.topicId);
    if (topic) {
      setSelectedTopic(topic);
    }
  };

  const handleDeleteTopic = (topicId: string) => {
    setTopics((prev) => prev.filter((t) => t.id !== topicId));
    setNotifications((prev) => prev.filter((n) => n.topicId !== topicId));
    setSelectedTopic(null);
  };

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  };

  const handleBack = () => {
    setSelectedTopic(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {/* Left Sidebar - Topics */}
      <SlidingSidebar side="left" icon={<List className="w-5 h-5" />}>
        <TopicsSidebar
          topics={topics}
          onTopicClick={handleTopicClick}
          selectedTopicId={selectedTopic?.id}
        />
      </SlidingSidebar>

      {/* Right Sidebar - Notifications */}
      <SlidingSidebar side="right" icon={<Bell className="w-5 h-5" />}>
        <NotificationsSidebar
          notifications={notifications}
          topics={topics}
          onNotificationClick={handleNotificationClick}
        />
      </SlidingSidebar>

      {/* Main Content */}
      <main className="w-full">
        {selectedTopic ? (
          <TopicBoard
            topic={selectedTopic}
            notifications={notifications}
            onBack={handleBack}
            onDeleteTopic={handleDeleteTopic}
            onMarkAsRead={handleMarkAsRead}
          />
        ) : (
          <TopicInput onCreateTopic={handleCreateTopic} />
        )}
      </main>
    </div>
  );
}
