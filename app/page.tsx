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
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { List, Bell } from "lucide-react";

export default function HomePage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const state = loadState();
    setTopics(state.topics);
    setNotifications(state.notifications);

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
      newState.notifications.forEach((notification) => {
        toast({
          title: notification.title,
          description: notification.body,
        });
      });
    }
  }, []);

  useEffect(() => {
    if (topics.length > 0 || notifications.length > 0) {
      saveState({ topics, notifications });
    }
  }, [topics, notifications]);

  const handleCreateTopic = (title: string, prompt: string) => {
    const newTopic = createTopic(title, prompt);
    setTopics((prev) => [newTopic, ...prev]);
    setSelectedTopic(newTopic);

    setTimeout(() => {
      const demoNotification = createNotification(
        newTopic.id,
        `Welcome to ${title}`,
        `You\'re now tracking "${title}". We\'ll notify you when relevant content appears across social media, websites, RSS feeds, and newsletters.`,
        "Synk System"
      );
      setNotifications((prev) => [demoNotification, ...prev]);
      toast({
        title: demoNotification.title,
        description: demoNotification.body,
      });
    }, 1000);
  };

  const handleTopicClick = (topic: Topic) => {
    setSelectedTopic(topic);

    // Mark all notifications for this topic as read
    setNotifications((prev) =>
      prev.map((n) => (n.topicId === topic.id ? { ...n, isRead: true } : n))
    );
  };

  const handleNotificationClick = (notification: Notification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
    );

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

  const handleRenameTopic = (topicId: string, newTitle: string) => {
    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, title: newTitle } : t))
    );
  };

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  };

  const handleBack = () => {
    setSelectedTopic(null);
  };

  // Calculate the offset for centering content
  const leftOffset = leftSidebarOpen ? 320 : 0; // w-80 = 320px, w-0 = 0px
  const rightOffset = rightSidebarOpen ? 320 : 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <ThemeToggle />

      <SlidingSidebar
        side="left"
        icon={<List className="w-5 h-5" />}
        onToggle={setLeftSidebarOpen}
      >
        <TopicsSidebar
          topics={topics}
          onTopicClick={handleTopicClick}
          selectedTopicId={selectedTopic?.id}
          notifications={notifications}
          onNewChat={handleBack}
          onDeleteTopic={handleDeleteTopic}
          onRenameTopic={handleRenameTopic}
        />
      </SlidingSidebar>

      <SlidingSidebar
        side="right"
        icon={<Bell className="w-5 h-5" />}
        onToggle={setRightSidebarOpen}
      >
        <NotificationsSidebar
          notifications={notifications}
          topics={topics}
          onNotificationClick={handleNotificationClick}
        />
      </SlidingSidebar>

      <main
        className="w-full transition-all duration-300 ease-in-out"
        style={{
          marginLeft: `${leftOffset}px`,
          marginRight: `${rightOffset}px`,
        }}
      >
        {selectedTopic ? (
          <TopicBoard
            topic={selectedTopic}
            notifications={notifications}
            onBack={handleBack}
            onMarkAsRead={handleMarkAsRead}
          />
        ) : (
          <TopicInput onCreateTopic={handleCreateTopic} />
        )}
      </main>
    </div>
  );
}
