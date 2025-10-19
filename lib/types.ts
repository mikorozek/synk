export interface Topic {
  id: string;
  title: string;
  prompt: string;
  createdAt: Date;
  multiverseXYoloMode?: boolean;
}

export interface Notification {
  id: string;
  topicId: string;
  title: string;
  content: string;
  source: string;
  url?: string;
  createdAt: Date;
  isRead: boolean;
  fromYoloMode?: boolean;
}

export interface AppState {
  topics: Topic[];
  notifications: Notification[];
}
