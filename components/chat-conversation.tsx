"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    isThinking?: boolean;
}

interface ChatConversationProps {
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
    isWaitingForResponse?: boolean;
    onProceedToBoard?: () => void;
    showProceedButton?: boolean;
}

export function ChatConversation({
    messages,
    onSendMessage,
    isWaitingForResponse = false,
    onProceedToBoard,
    showProceedButton = false,
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
                            "flex gap-3 items-center",
                            message.role === "user" && "justify-end"
                        )}
                    >
                        {message.role === "assistant" && (
                            <Avatar className="bg-primary">
                                <AvatarFallback className="bg-transparent text-primary-foreground font-semibold">
                                    S
                                </AvatarFallback>
                            </Avatar>
                        )}

                        <div
                            className={cn(
                                "rounded-2xl px-4 py-3",
                                message.role === "user"
                                    ? "bg-primary text-primary-foreground max-w-[60%] shadow-sm"
                                    : "text-foreground"
                            )}
                        >
                            {message.isThinking ? (
                                <div className="flex items-center space-x-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-sm">Thinking...</span>
                                </div>
                            ) : (
                                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area with optional proceed arrow */}
            <div className="border-t border-border p-4 bg-background">
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
                        disabled={isWaitingForResponse || showProceedButton}
                        className="flex-1 resize-none rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        rows={1}
                        style={{
                            minHeight: "48px",
                            maxHeight: "200px",
                        }}
                    />
                    {showProceedButton ? (
                        <Button
                            type="button"
                            onClick={onProceedToBoard}
                            size="icon"
                            className="h-12 w-12"
                        >
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            disabled={!input.trim() || isWaitingForResponse}
                            size="icon"
                            className="h-12 w-12"
                        >
                            <Send className="w-5 h-5" />
                        </Button>
                    )}
                </form>
            </div>
        </div>
    );
}
