"use client";

import { useState } from "react";
import { TopicInput } from "./topic-input";
import { ChatConversation, type ChatMessage } from "./chat-conversation";

interface ChatFlowWrapperProps {
    onCreateTopic: (title: string, prompt: string) => Promise<void>;
    onProceedToTopic?: (topicId: number) => void;
}

export function ChatFlowWrapper({ onCreateTopic, onProceedToTopic }: ChatFlowWrapperProps) {
    const [showConversation, setShowConversation] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
    const [initialPrompt, setInitialPrompt] = useState("");
    const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [hasAskedQuestions, setHasAskedQuestions] = useState(false);
    const [topicData, setTopicData] = useState<{ id: number; title: string } | null>(null);

    const handleInitialSubmit = async (title: string, prompt: string) => {
        // Switch to conversation mode
        setShowConversation(true);
        setInitialPrompt(prompt);

        // Add user's initial message
        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: prompt,
        };
        setMessages([userMsg]);

        // Store in conversation history
        const userConversationEntry = { role: "user", content: prompt };
        setConversationHistory([userConversationEntry]);

        // Show thinking indicator
        setIsWaitingForResponse(true);
        const thinkingMsg: ChatMessage = {
            id: `thinking-${Date.now()}`,
            role: "assistant",
            content: "",
            isThinking: true,
        };
        setMessages((prev) => [...prev, thinkingMsg]);

        // Call API to generate clarifying questions
        try {
            const response = await fetch("/api/chat/get-questions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ prompt }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate questions");
            }

            const { questions } = await response.json();

            // Remove thinking message
            setMessages((prev) => prev.filter((m) => !m.isThinking));

            // Add assistant's questions
            const assistantMsg: ChatMessage = {
                id: `assistant-questions-${Date.now()}`,
                role: "assistant",
                content: questions,
            };
            setMessages((prev) => [...prev, assistantMsg]);

            // Store in conversation history
            setConversationHistory((prev) => [...prev, { role: "assistant", content: questions }]);

            setIsWaitingForResponse(false);
            setHasAskedQuestions(true);
        } catch (error) {
            console.error("Error generating questions:", error);
            // Remove thinking message
            setMessages((prev) => prev.filter((m) => !m.isThinking));

            // Determine error message based on error type
            let errorMessage = "Sorry, I encountered an error while generating questions.";
            if (error instanceof TypeError && error.message === "Failed to fetch") {
                errorMessage = "Unable to connect to the server. Please check your internet connection and try refreshing the page.";
            } else if (error instanceof Error) {
                errorMessage = `Error: ${error.message}. Please try refreshing the page.`;
            }

            // Show error message
            const errorMsg: ChatMessage = {
                id: `error-${Date.now()}`,
                role: "assistant",
                content: errorMessage,
            };
            setMessages((prev) => [...prev, errorMsg]);
            setIsWaitingForResponse(false);

            // Reset to allow user to try again
            setShowConversation(false);
            setMessages([]);
            setConversationHistory([]);
        }
    };

    const handleSendMessage = async (userMessage: string) => {
        console.log("[ChatFlow] User sent message:", userMessage);

        // Add user message
        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: userMessage,
        };
        setMessages((prev) => [...prev, userMsg]);

        // Store in conversation history
        const updatedConversation = [...conversationHistory, { role: "user", content: userMessage }];
        setConversationHistory(updatedConversation);

        console.log("[ChatFlow] Conversation history:", updatedConversation);

        // Immediately start the POST request to create the topic
        const topicCreationPromise = (async () => {
            try {
                console.log("[ChatFlow] Making POST request to /api/topics");

                const response = await fetch("/api/topics", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        prompt: initialPrompt,
                        conversation: updatedConversation,
                    }),
                });

                console.log("[ChatFlow] Response status:", response.status);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Server error: ${response.status}`);
                }

                const responseData = await response.json();
                console.log("[ChatFlow] Topic created:", responseData.topic);

                return responseData.topic;
            } catch (error) {
                console.error("Error creating topic:", error);
                throw error;
            }
        })();

        // Wait 500ms before showing the predefined message
        await new Promise(resolve => setTimeout(resolve, 500));

        // Add predefined message
        const predefinedMsg: ChatMessage = {
            id: `predefined-${Date.now()}`,
            role: "assistant",
            content: "Now I will gather all relevant sources and perform deep research on your topic.",
        };
        setMessages((prev) => [...prev, predefinedMsg]);

        // Wait another 200ms before starting the thinking states
        await new Promise(resolve => setTimeout(resolve, 200));

        // Thinking states to cycle through
        const thinkingStates = [
            "Vibing",
            "Drifting",
            "Wandering",
            "Pondering",
            "Zoning",
            "Gazing",
            "Unraveling",
            "Tripping",
            "Meandering",
            "Floating",
            "Musing"
        ];

        // Add thinking message with first state (below the predefined message)
        const thinkingId = `thinking-states-${Date.now()}`;
        const thinkingMsg: ChatMessage = {
            id: thinkingId,
            role: "assistant",
            content: "",
            isThinking: true,
            thinkingText: thinkingStates[0],
        };
        setMessages((prev) => [...prev, thinkingMsg]);
        setIsWaitingForResponse(true);

        // Cycle through thinking states while the POST request completes
        // Use a flag to stop the loop when topic is created
        let topicCreated = false;
        let topic = null;

        // Start listening for topic creation
        topicCreationPromise.then((result) => {
            topicCreated = true;
            topic = result;
        }).catch((error) => {
            topicCreated = true; // Stop the loop even on error
            console.error("Topic creation error:", error);
        });

        // Cycle through thinking states until topic is created
        for (let i = 1; i < thinkingStates.length && !topicCreated; i++) {
            const delay = 10000 + Math.random() * 10000; // 10-20 seconds
            console.log(`[ChatFlow] Showing state: ${thinkingStates[i]} for ${delay}ms`);

            // Wait for delay OR topic creation, whichever comes first
            const startTime = Date.now();
            while (Date.now() - startTime < delay && !topicCreated) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (topicCreated) {
                console.log("[ChatFlow] Topic created, stopping thinking states");
                break;
            }

            // Update thinking text
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === thinkingId
                        ? { ...m, thinkingText: thinkingStates[i] }
                        : m
                )
            );
        }

        // Wait for the topic creation to complete (if not already done)
        try {
            if (!topic) {
                topic = await topicCreationPromise;
            }

            // Remove thinking message
            setMessages((prev) => prev.filter((m) => m.id !== thinkingId));

            // Add completion message
            const completionMsg: ChatMessage = {
                id: `completion-${Date.now()}`,
                role: "assistant",
                content: "Finished! I've set up your topic and discovered relevant sources to monitor.",
            };
            setMessages((prev) => [...prev, completionMsg]);

            // Store topic data for the button
            setTopicData({ id: topic.id, title: topic.title });

            // Format and add topic to parent's state via the callback
            await onCreateTopic(topic.title, topic.prompt);

            // Show the proceed button
            console.log("[ChatFlow] Setting isComplete to true, proceed button should appear");
            setIsWaitingForResponse(false);
            setIsComplete(true);
        } catch (error) {
            console.error("Error in topic creation:", error);

            // Remove thinking message
            setMessages((prev) => prev.filter((m) => m.id !== thinkingId));

            // Determine error message based on error type
            let errorMessage = "Sorry, I encountered an error creating your topic.";
            if (error instanceof TypeError && error.message === "Failed to fetch") {
                errorMessage = "Unable to connect to the server. Please check your internet connection and try again.";
            } else if (error instanceof Error) {
                errorMessage = `Error: ${error.message}`;
            }

            // Show error message
            const errorMsg: ChatMessage = {
                id: `error-${Date.now()}`,
                role: "assistant",
                content: errorMessage,
            };
            setMessages((prev) => [...prev, errorMsg]);
            setIsWaitingForResponse(false);

            // Reset state to allow user to try again
            setShowConversation(false);
            setMessages([]);
            setConversationHistory([]);
        }
    };

    const handleProceedToBoard = () => {
        console.log("[ChatFlow] Proceed button clicked!");

        // Navigate to the topic board if callback is provided
        if (onProceedToTopic && topicData) {
            onProceedToTopic(topicData.id);
        }

        // Reset state for next conversation
        setShowConversation(false);
        setMessages([]);
        setIsWaitingForResponse(false);
        setInitialPrompt("");
        setConversationHistory([]);
        setIsComplete(false);
        setHasAskedQuestions(false);
        setTopicData(null);
    };

    if (!showConversation) {
        return <TopicInput onCreateTopic={handleInitialSubmit} />;
    }

    return (
        <ChatConversation
            messages={messages}
            onSendMessage={handleSendMessage}
            isWaitingForResponse={isWaitingForResponse}
            onProceedToBoard={handleProceedToBoard}
            showProceedButton={isComplete}
            topicTitle={topicData?.title}
        />
    );
}
