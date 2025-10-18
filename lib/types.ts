export interface Topic {
  id: string;
  title: string;
  prompt: string;
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
}

export interface AppState {
  topics: Topic[];
  notifications: Notification[];
}
