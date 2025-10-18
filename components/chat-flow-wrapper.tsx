"use client";

import { useState } from "react";
import { TopicInput } from "./topic-input";
import { ChatConversation, type ChatMessage } from "./chat-conversation";

interface ChatFlowWrapperProps {
    onCreateTopic: (title: string, prompt: string) => Promise<void>;
}

export function ChatFlowWrapper({ onCreateTopic }: ChatFlowWrapperProps) {
    const [showConversation, setShowConversation] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [initialPrompt, setInitialPrompt] = useState("");
    const [questions, setQuestions] = useState<string[]>([]);
    const [answers, setAnswers] = useState<string[]>([]);
    const [isComplete, setIsComplete] = useState(false);

    const handleInitialSubmit = (title: string, prompt: string) => {
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

        // Show thinking indicator
        setIsWaitingForResponse(true);
        const thinkingMsg: ChatMessage = {
            id: `thinking-${Date.now()}`,
            role: "assistant",
            content: "",
            isThinking: true,
        };
        setMessages((prev) => [...prev, thinkingMsg]);

        // TODO: Replace with actual LLM API call to generate questions
        // Simulate thinking for 15 seconds
        setTimeout(() => {
            // Remove thinking message
            setMessages((prev) => prev.filter((m) => !m.isThinking));

            // Mock questions - you'll replace this with actual LLM response
            const mockQuestions = [
                "What specific aspects of this topic are you most interested in?",
                "What timeframe or context should I consider?",
                "Are there any specific sources or perspectives you'd like me to focus on?",
            ];
            setQuestions(mockQuestions);
            setCurrentQuestionIndex(0);

            // Ask the first question
            const firstQuestion: ChatMessage = {
                id: `question-0`,
                role: "assistant",
                content: mockQuestions[0],
            };
            setMessages((prev) => [...prev, firstQuestion]);
            setIsWaitingForResponse(false);
        }, 15000); // 15 seconds thinking time
    };

    const handleSendMessage = (userMessage: string) => {
        // Add user message
        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: userMessage,
        };
        setMessages((prev) => [...prev, userMsg]);
        setIsWaitingForResponse(true);

        // Store the answer
        const newAnswers = [...answers, userMessage];
        setAnswers(newAnswers);

        // Check if there are more questions
        if (currentQuestionIndex < questions.length - 1) {
            // Ask next question after a short delay
            const nextIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIndex);

            setTimeout(() => {
                const nextQuestion: ChatMessage = {
                    id: `question-${nextIndex}`,
                    role: "assistant",
                    content: questions[nextIndex],
                };
                setMessages((prev) => [...prev, nextQuestion]);
                setIsWaitingForResponse(false);
            }, 1000);
        } else {
            // All questions answered, start thinking/research phase
            const thinkingMsg: ChatMessage = {
                id: `thinking-final-${Date.now()}`,
                role: "assistant",
                content: "",
                isThinking: true,
            };
            setMessages((prev) => [...prev, thinkingMsg]);

            // TODO: Replace with actual LLM API call to perform research
            // Simulate research for 15 seconds
            setTimeout(() => {
                // Remove thinking message
                setMessages((prev) => prev.filter((m) => !m.isThinking));

                // Add completion message
                const completeMsg: ChatMessage = {
                    id: `complete-${Date.now()}`,
                    role: "assistant",
                    content: "I'm finished! I've analyzed your topic and gathered relevant information. Click the button below to proceed to your topic board.",
                };
                setMessages((prev) => [...prev, completeMsg]);
                setIsWaitingForResponse(false);
                setIsComplete(true);
            }, 15000); // 15 seconds research time
        }
    };

    const handleProceedToBoard = async () => {
        // Generate a title from the prompt (first sentence or truncated)
        const title = initialPrompt.split('.')[0].substring(0, 50);

        // Create the topic - this will trigger navigation to TopicBoard
        await onCreateTopic(title, initialPrompt);

        // Reset state for next conversation
        setShowConversation(false);
        setMessages([]);
        setIsWaitingForResponse(false);
        setCurrentQuestionIndex(0);
        setInitialPrompt("");
        setQuestions([]);
        setAnswers([]);
        setIsComplete(false);
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
        />
    );
}
