"use client"

import type { Notification, Topic } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

interface NotificationsSidebarProps {
  notifications: Notification[]
  topics: Topic[]
  onNotificationClick: (notification: Notification) => void
}

export function NotificationsSidebar({ notifications, topics, onNotificationClick }: NotificationsSidebarProps) {
  const sortedNotifications = [...notifications].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const getTopicTitle = (topicId: string) => {
    return topics.find((t) => t.id === topicId)?.title || "Unknown Topic"
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Notifications</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {unreadCount > 0 && (
            <Badge variant="default" className="mr-2">
              {unreadCount} new
            </Badge>
          )}
          {notifications.length} total
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {sortedNotifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1">They'll appear here when topics are matched</p>
            </div>
          ) : (
            sortedNotifications.map((notification) => (
              <Button
                key={notification.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-left h-auto py-3 px-4 relative",
                  !notification.isRead && "bg-accent/50",
                )}
                onClick={() => onNotificationClick(notification)}
              >
                <div className="flex flex-col gap-1.5 w-full">
                  {!notification.isRead && <div className="absolute top-3 right-3 w-2 h-2 bg-primary rounded-full" />}
                  <span className="font-medium text-sm line-clamp-2 pr-4">{notification.title}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="line-clamp-1">{getTopicTitle(notification.topicId)}</span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(notification.createdAt, {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </Button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
