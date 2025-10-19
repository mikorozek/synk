"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Topic, Notification } from "@/lib/types";
import { SlidingSidebar } from "@/components/sliding-sidebar";
import { TopicsSidebar } from "@/components/topics-sidebar";
import { ChatFlowWrapper } from "@/components/chat-flow-wrapper";
import { TopicBoard } from "@/components/topic-board";
import { useToast } from "@/hooks/use-toast";
import { List } from "lucide-react";

// Polling interval in milliseconds (5 seconds)
const POLLING_INTERVAL = 5000;

export default function HomePage() {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { toast } = useToast();
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const loadEvents = async () => {
        try {
            const eventsResponse = await fetch("/api/events");
            if (eventsResponse.ok) {
                const apiEvents = await eventsResponse.json();
                const formattedNotifications = apiEvents.map((event: any) => ({
                    id: event.id.toString(),
                    topicId: event.topicId.toString(),
                    title: event.title,
                    content: event.summary || "",
                    source: "Event Monitor",
                    url: event.eventUrl,
                    createdAt: new Date(event.createdAt),
                    isRead: !event.unread, // unread: true means isRead: false
                    fromYoloMode: event.fromYoloMode || false,
                }));
                setNotifications(formattedNotifications);
            }
        } catch (error) {
            console.error("Error loading events from API:", error);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                // Load topics
                const topicsResponse = await fetch("/api/topics");
                if (topicsResponse.ok) {
                    const apiTopics = await topicsResponse.json();
                    const formattedTopics = apiTopics.map((topic: any) => ({
                        id: topic.id.toString(),
                        title: topic.title,
                        prompt: topic.prompt,
                        createdAt: topic.createdAt ? new Date(topic.createdAt) : new Date(),
                        multiverseXYoloMode: topic.multiverseXYoloMode || false,
                    }));
                    setTopics(formattedTopics);
                }

                // Load events (notifications)
                await loadEvents();
            } catch (error) {
                console.error("Error loading data from API:", error);
                toast({
                    title: "Failed to load data",
                    description: "Could not connect to the server",
                    variant: "destructive",
                });
            }
        };

        loadData();

        // Set up polling for events every 5 seconds
        const eventsPollInterval = setInterval(() => {
            loadEvents();
        }, 5000);

        // Cleanup interval on unmount
        return () => {
            clearInterval(eventsPollInterval);
        };
    }, [toast]);


    const handleCreateTopic = async (title: string, prompt: string) => {
        // This is called by ChatFlowWrapper after the topic has already been created
        // We just need to update the local state
        // The API call is made inside ChatFlowWrapper with the conversation context

        // Reload topics from the server to get the latest
        await loadData(false);

        toast({
            title: "Topic created",
            description: `Now tracking "${title}"`,
        });
    };

    const handleTopicClick = async (topic: Topic) => {
        setSelectedTopic(topic);

        // Refresh events to get the latest data for this topic
        await loadEvents();

        try {
            // Mark all notifications for this topic as read via API
            const response = await fetch('/api/events/mark-all-read', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ topicId: topic.id }),
            });

            if (!response.ok) {
                throw new Error('Failed to mark all events as read');
            }

            // Update local state
            setNotifications((prev) =>
                prev.map((n) => (n.topicId === topic.id ? { ...n, isRead: true } : n))
            );
        } catch (error) {
            console.error('Error marking all events as read:', error);
            toast({
                title: 'Failed to mark events as read',
                description: 'Could not update all events. Please try again.',
                variant: 'destructive',
            });
        }
    };


    const handleDeleteTopic = async (topicId: string) => {
        try {
            const response = await fetch(`/api/topics?id=${topicId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete topic");
            }

            setTopics((prev) => prev.filter((t) => t.id !== topicId));
            setNotifications((prev) => prev.filter((n) => n.topicId !== topicId));
            setSelectedTopic(null);

            toast({
                title: "Topic deleted",
                description: "Topic has been removed successfully",
            });
        } catch (error) {
            console.error("Error deleting topic:", error);
            toast({
                title: "Failed to delete topic",
                description: "Could not delete topic. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleRenameTopic = async (topicId: string, newTitle: string) => {
        try {
            const response = await fetch(`/api/topics?id=${topicId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ title: newTitle }),
            });

            if (!response.ok) {
                throw new Error("Failed to rename topic");
            }

            setTopics((prev) =>
                prev.map((t) => (t.id === topicId ? { ...t, title: newTitle } : t))
            );

            toast({
                title: "Topic renamed",
                description: "Topic has been updated successfully",
            });
        } catch (error) {
            console.error("Error renaming topic:", error);
            toast({
                title: "Failed to rename topic",
                description: "Could not update topic. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleToggleYoloMode = async (topicId: string, enabled: boolean) => {
        try {
            const response = await fetch(`/api/topics?id=${topicId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ multiverseXYoloMode: enabled }),
            });

            if (!response.ok) {
                throw new Error("Failed to toggle Yolo mode");
            }

            setTopics((prev) =>
                prev.map((t) => (t.id === topicId ? { ...t, multiverseXYoloMode: enabled } : t))
            );

            toast({
                title: enabled ? "Yolo mode enabled" : "Yolo mode disabled",
                description: enabled
                    ? "AI agent will now trade aggressively based on events"
                    : "AI agent trading has been disabled",
            });
        } catch (error) {
            console.error("Error toggling Yolo mode:", error);
            toast({
                title: "Failed to toggle Yolo mode",
                description: "Could not update topic. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            // Only mark as read if it's currently unread
            const notification = notifications.find(n => n.id === notificationId);
            if (notification?.isRead) {
                return; // Already read, do nothing
            }

            const response = await fetch(`/api/events/${notificationId}/mark-unread`, {
                method: "PATCH",
            });

            if (!response.ok) {
                throw new Error("Failed to mark as read");
            }

            const updatedEvent = await response.json();

            // Update local state
            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === notificationId ? { ...n, isRead: !updatedEvent.unread } : n
                )
            );
        } catch (error) {
            console.error("Error marking as read:", error);
            // Silently fail for card clicks - user can use dropdown if needed
        }
    };

    const handleToggleReadStatus = async (notificationId: string) => {
        try {
            const response = await fetch(`/api/events/${notificationId}/mark-unread`, {
                method: "PATCH",
            });

            if (!response.ok) {
                throw new Error("Failed to toggle read status");
            }

            const updatedEvent = await response.json();

            // Update local state
            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === notificationId ? { ...n, isRead: !updatedEvent.unread } : n
                )
            );

            toast({
                title: updatedEvent.unread ? "Marked as unread" : "Marked as read",
                description: "Event status updated successfully",
            });
        } catch (error) {
            console.error("Error toggling read status:", error);
            toast({
                title: "Failed to update status",
                description: "Could not update event. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleDeleteEvent = async (notificationId: string) => {
        try {
            const response = await fetch(`/api/events/${notificationId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete event");
            }

            // Remove from local state
            setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

            toast({
                title: "Event deleted",
                description: "Event has been removed successfully",
            });
        } catch (error) {
            console.error("Error deleting event:", error);
            toast({
                title: "Failed to delete event",
                description: "Could not delete event. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleBack = () => {
        setSelectedTopic(null);
    };

    const handleProceedToTopic = (topicId: number) => {
        // Find the topic by ID and select it
        const topic = topics.find((t) => t.id === topicId.toString());
        if (topic) {
            setSelectedTopic(topic);
        }
    };

    // Calculate the offset for centering content
    const leftOffset = leftSidebarOpen ? 320 : 0; // w-80 = 320px, w-0 = 0px

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
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
                    onToggleYoloMode={handleToggleYoloMode}
                />
            </SlidingSidebar>

            <main
                className="w-full transition-all duration-300 ease-in-out"
                style={{
                    marginLeft: `${leftOffset}px`,
                    marginRight: `0px`,
                }}
            >
                {selectedTopic ? (
                    <TopicBoard
                        topic={selectedTopic}
                        notifications={notifications}
                        onBack={handleBack}
                        onMarkAsRead={handleMarkAsRead}
                        onToggleReadStatus={handleToggleReadStatus}
                        onDeleteEvent={handleDeleteEvent}
                    />
                ) : (
                    <ChatFlowWrapper
                        onCreateTopic={handleCreateTopic}
                        onProceedToTopic={handleProceedToTopic}
                    />
                )}
            </main>
        </div>
    );
}
