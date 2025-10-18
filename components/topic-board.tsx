"use client";

import type { Topic, Notification } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopicBoardProps {
  topic: Topic;
  notifications: Notification[];
  onBack: () => void;
  onMarkAsRead: (notificationId: string) => void;
}

export function TopicBoard({
  topic,
  notifications,
  onBack,
  onMarkAsRead,
}: TopicBoardProps) {
  const topicNotifications = notifications
    .filter((n) => n.topicId === topic.id)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-balance">{topic.title}</h1>
          <p className="text-muted-foreground text-balance">{topic.prompt}</p>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-4">
          {topicNotifications.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-12 pb-12 text-center">
                <p className="text-muted-foreground">
                  No notifications yet for this topic
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  You'll be notified when relevant content is found
                </p>
              </CardContent>
            </Card>
          ) : (
            topicNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={cn(
                  "transition-all hover:shadow-md cursor-pointer",
                  !notification.isRead && "border-primary/50 bg-accent/30"
                )}
                onClick={() => onMarkAsRead(notification.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg text-balance">
                          {notification.title}
                        </CardTitle>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-2 text-xs">
                        <span className="font-medium">{notification.source}</span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(notification.createdAt, {
                            addSuffix: true,
                          })}
                        </span>
                      </CardDescription>
                    </div>
                    {notification.url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={notification.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-pretty leading-relaxed">
                    {notification.content}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
