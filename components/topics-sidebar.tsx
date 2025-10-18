"use client";

import type { Topic } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface TopicsSidebarProps {
  topics: Topic[];
  onTopicClick: (topic: Topic) => void;
  selectedTopicId?: string;
}

export function TopicsSidebar({
  topics,
  onTopicClick,
  selectedTopicId,
}: TopicsSidebarProps) {
  const sortedTopics = [...topics].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Your Topics</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {topics.length} {topics.length === 1 ? "topic" : "topics"} tracked
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {sortedTopics.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No topics yet</p>
              <p className="text-xs mt-1">Create one to get started</p>
            </div>
          ) : (
            sortedTopics.map((topic) => (
              <Button
                key={topic.id}
                variant={selectedTopicId === topic.id ? "secondary" : "ghost"}
                className="w-full justify-start text-left h-auto py-3 px-4"
                onClick={() => onTopicClick(topic)}
              >
                <div className="flex flex-col gap-1 w-full">
                  <span className="font-medium text-sm line-clamp-1">
                    {topic.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(topic.createdAt, { addSuffix: true })}
                  </span>
                </div>
              </Button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
