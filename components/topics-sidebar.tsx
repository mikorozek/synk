"use client";

import { useState } from "react";
import type { Notification, Topic } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow } from "date-fns";
import {
    MessageSquarePlus,
    MessageSquare,
    MoreHorizontal,
    Pencil,
    Trash2,
    Search,
} from "lucide-react";

interface TopicsSidebarProps {
    topics: Topic[];
    onTopicClick: (topic: Topic) => void;
    selectedTopicId?: string;
    notifications: Notification[];
    onNewChat?: () => void;
    onDeleteTopic?: (topicId: string) => void;
    onRenameTopic?: (topicId: string, newTitle: string) => void;
}

export function TopicsSidebar({
    topics,
    onTopicClick,
    selectedTopicId,
    notifications,
    onNewChat,
    onDeleteTopic,
    onRenameTopic,
}: TopicsSidebarProps) {
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [renamingTopic, setRenamingTopic] = useState<Topic | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const sortedTopics = [...topics]
        .filter((topic) =>
            topic.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            const timeA = a.createdAt?.getTime() ?? 0;
            const timeB = b.createdAt?.getTime() ?? 0;
            return timeB - timeA;
        });

    const getUnreadCount = (topicId: string) => {
        return notifications.filter((n) => n.topicId === topicId && !n.isRead).length;
    };

    const handleRenameStart = (topic: Topic, e: React.MouseEvent) => {
        e.stopPropagation();
        setRenamingTopic(topic);
        setRenameValue(topic.title);
        setRenameDialogOpen(true);
    };

    const handleRenameSubmit = () => {
        if (renameValue.trim() && renamingTopic && onRenameTopic) {
            onRenameTopic(renamingTopic.id, renameValue.trim());
        }
        setRenameDialogOpen(false);
        setRenamingTopic(null);
        setRenameValue("");
    };

    const handleRenameCancel = () => {
        setRenameDialogOpen(false);
        setRenamingTopic(null);
        setRenameValue("");
    };

    return (
        <div className="flex flex-col h-full">
            {/* New Chat Button */}
            <div className="p-3 border-b border-border space-y-2">
                <Button
                    onClick={onNewChat}
                    className="w-full justify-start gap-3 h-11 px-3 bg-background hover:bg-muted"
                    variant="outline"
                >
                    <MessageSquarePlus className="w-4 h-4 shrink-0" />
                    <span className="font-medium">New Topic</span>
                </Button>

                {/* Search Filter */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search topics..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9"
                    />
                </div>
            </div>

            {/* Topics List */}
            <ScrollArea className="flex-1 overflow-y-auto">
                {sortedTopics.length === 0 ? (
                    <div className="text-center py-12 px-4 text-muted-foreground">
                        <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No topics yet</p>
                        <p className="text-xs mt-1">Create one to get started</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {sortedTopics.map((topic) => (
                            <div
                                key={topic.id}
                                className={`rounded-lg transition-colors flex flex-row group relative overflow-hidden ${selectedTopicId === topic.id
                                    ? "bg-muted"
                                    : "hover:bg-muted/50"
                                    }`}
                                style={{ width: "calc(320px - 32px)" }}
                            >
                                <button
                                    onClick={() => onTopicClick(topic)}
                                    className="flex-1 text-left px-3 py-2.5 min-w-0"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 min-w-0">
                                            <span className="text-sm font-medium truncate flex-1 min-w-0">
                                                {topic.title}
                                            </span>
                                            {getUnreadCount(topic.id) > 0 && (
                                                <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />
                                            )}
                                        </div>
                                        <span className="text-xs text-muted-foreground mt-1 block truncate">
                                            {topic.createdAt
                                                ? formatDistanceToNow(topic.createdAt, {
                                                    addSuffix: true,
                                                })
                                                : "Just now"}
                                        </span>
                                    </div>
                                </button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className="p-2 opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/10 rounded transition-opacity"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem
                                            onClick={(e) => handleRenameStart(topic, e)}
                                        >
                                            <Pencil className="w-4 h-4 mr-2" />
                                            Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (
                                                    confirm(
                                                        "Are you sure you want to delete this topic?"
                                                    )
                                                ) {
                                                    onDeleteTopic?.(topic.id);
                                                }
                                            }}
                                            className="text-destructive focus:text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Rename Dialog */}
            <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Topic</DialogTitle>
                        <DialogDescription>
                            Enter a new name for your topic.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="topic-name">Topic Name</Label>
                            <Input
                                id="topic-name"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleRenameSubmit();
                                    } else if (e.key === "Escape") {
                                        handleRenameCancel();
                                    }
                                }}
                                placeholder="Enter topic name"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleRenameCancel}>
                            Cancel
                        </Button>
                        <Button onClick={handleRenameSubmit}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
