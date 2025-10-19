"use client";

import { useState, useEffect } from "react";
import type { Topic, Notification } from "@/lib/types";
import { SlidingSidebar } from "@/components/sliding-sidebar";
import { TopicsSidebar } from "@/components/topics-sidebar";
import { ChatFlowWrapper } from "@/components/chat-flow-wrapper";
import { TopicBoard } from "@/components/topic-board";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { List } from "lucide-react";

export default function HomePage() {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
    const { toast } = useToast();

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
                    }));
                    setTopics(formattedTopics);
                }

                // Load events (notifications)
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
                        isRead: false,
                    }));
                    setNotifications(formattedNotifications);
                }
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
    }, [toast]);


    const handleCreateTopic = async (title: string, prompt: string) => {
        try {
            const response = await fetch("/api/topics", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    prompt: prompt,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("API Error:", errorData);
                throw new Error(errorData.error || "Failed to create topic");
            }

            const responseData = await response.json();

            // Convert to local format
            const formattedTopic = {
                id: responseData.topic.id.toString(),
                title: responseData.topic.title,
                prompt: responseData.topic.prompt,
                createdAt: responseData.topic.createdAt ? new Date(responseData.topic.createdAt) : new Date(),
            };

            setTopics((prev) => [formattedTopic, ...prev]);

            toast({
                title: "Topic created",
                description: `Now tracking "${formattedTopic.title}"`,
            });
        } catch (error) {
            console.error("Error creating topic:", error);

            toast({
                title: "Failed to create topic",
                description: "Could not save to database. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleTopicClick = (topic: Topic) => {
        setSelectedTopic(topic);

        // Mark all notifications for this topic as read
        setNotifications((prev) =>
            prev.map((n) => (n.topicId === topic.id ? { ...n, isRead: true } : n))
        );
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

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <ThemeToggle leftOffset={leftOffset} rightOffset={0} />

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
                    />
                ) : (
                    <ChatFlowWrapper onCreateTopic={handleCreateTopic} />
                )}
            </main>
        </div>
    );
}
