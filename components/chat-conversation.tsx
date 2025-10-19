"use client";

import { useState, useEffect, useRef } from "react";
import { Send, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Animated dots component
function AnimatedDots() {
    const [dots, setDots] = useState(1);

    useEffect(() => {
        const interval = setInterval(() => {
            setDots((prev) => (prev % 3) + 1);
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return <span>{".".repeat(dots)}</span>;
}

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    isThinking?: boolean;
    thinkingText?: string;
}

interface ChatConversationProps {
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
    isWaitingForResponse?: boolean;
    onProceedToBoard?: () => void;
    showProceedButton?: boolean;
    topicTitle?: string;
}

export function ChatConversation({
    messages,
    onSendMessage,
    isWaitingForResponse = false,
    onProceedToBoard,
    showProceedButton = false,
    topicTitle,
}: ChatConversationProps) {
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isWaitingForResponse) {
            onSendMessage(input.trim());
            setInput("");
        }
    };

    return (
        <div className="flex flex-col h-full w-full max-w-4xl mx-auto">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={cn(
                            "flex gap-3 items-start",
                            message.role === "user" && "justify-end"
                        )}
                    >
                        {message.role === "assistant" && (
                            <div className="flex-shrink-0 pt-0.5">
                                <Avatar className="bg-primary">
                                    <AvatarFallback className="bg-transparent text-primary-foreground font-semibold">
                                        S
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        )}

                        <div
                            className={cn(
                                "rounded-2xl px-4 py-3",
                                message.role === "user"
                                    ? "bg-primary text-primary-foreground max-w-[60%] shadow-sm"
                                    : "text-foreground max-w-[80%]"
                            )}
                        >
                            {message.isThinking ? (
                                <div className="flex items-center space-x-1">
                                    <span className="text-sm">{message.thinkingText || "Thinking"}</span>
                                    <span className="text-sm inline-block w-6"><AnimatedDots /></span>
                                </div>
                            ) : message.role === "assistant" ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                            strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                                            em: ({ children }) => <em className="italic">{children}</em>,
                                            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                                            ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                                            li: ({ children }) => <li className="ml-2">{children}</li>,
                                        }}
                                    >
                                        {message.content}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area with optional proceed button */}
            <div className="border-t border-border p-4 bg-background">
                {showProceedButton && topicTitle ? (
                    <Button
                        type="button"
                        onClick={onProceedToBoard}
                        className="w-full h-12 text-base"
                    >
                        Go to {topicTitle}
                    </Button>
                ) : (
                    <form onSubmit={handleSubmit} className="flex items-end space-x-2">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                            placeholder={isWaitingForResponse ? "Waiting for response..." : "Type your message..."}
                            disabled={isWaitingForResponse}
                            className="flex-1 resize-none rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                            rows={1}
                            style={{
                                minHeight: "48px",
                                maxHeight: "200px",
                            }}
                        />
                        <Button
                            type="submit"
                            disabled={!input.trim() || isWaitingForResponse}
                            size="icon"
                            className="h-12 w-12"
                        >
                            <Send className="w-5 h-5" />
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}
