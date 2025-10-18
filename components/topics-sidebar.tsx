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
import {
  MessageSquarePlus,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
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

  const sortedTopics = [...topics];

  const hasUnread = (topicId: string) => {
    return notifications.some((n) => n.topicId === topicId && !n.isRead);
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
      <div className="p-3 border-b border-border">
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-3 h-11 px-3 bg-background hover:bg-muted"
          variant="outline"
        >
          <MessageSquarePlus className="w-4 h-4 shrink-0" />
          <span className="font-medium">New Topic</span>
        </Button>
      </div>

      {/* Topics List */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-2 pb-4">
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
                  className={`w-full rounded-lg transition-colors group relative ${
                    selectedTopicId === topic.id
                      ? "bg-muted"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2 pr-2">
                    <button
                      onClick={() => onTopicClick(topic)}
                      className="flex-1 text-left px-3 py-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium line-clamp-2 break-words">
                            {topic.title}
                          </span>
                          {hasUnread(topic.id) && (
                            <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />
                          )}
                        </div>
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
                </div>
              ))}
            </div>
          )}
        </div>
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
