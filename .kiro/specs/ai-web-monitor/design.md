# Design Document

## Overview

The Monitor App (branded as "Synk") is a Next.js full-stack application that enables users to configure topic monitoring and view notifications in a feed. The existing template includes a complete UI with sliding sidebars, topic management, and notification display. The system needs API integration to replace localStorage with PostgreSQL database persistence, containerized using Docker.

**Current Template Features:**
- Topic creation through input interface
- Sliding sidebars for topics (left) and notifications (right)
- Topic board for viewing topic-specific notifications
- Notification management with read/unread states
- Responsive design with Tailwind CSS and Radix UI components

## Architecture

### System Architecture

```mermaid
graph TB
    subgraph "Container Environment"
        subgraph "Next.js Application"
            UI[React Frontend]
            subgraph "API Routes"
                API1[GET /api/topics]
                API2[POST /api/topics]
                API3[GET /api/notifications]
                API4[GET /api/notifications/[topicId]]
            end
            UI --> API1
            UI --> API2
            UI --> API3
            UI --> API4
        end
        
        subgraph "Database"
            DB[(PostgreSQL)]
            Topics[Topics Table]
            Notifications[Notifications Table]
        end
        
        API1 --> Topics
        API2 --> Topics
        API3 --> Notifications
        API4 --> Notifications
    end
    
    User[User] --> UI
```

### Component Architecture

```mermaid
graph TB
    subgraph "Frontend Components"
        Chat[Chat Interface]
        Feed[Event Feed]
        Topics[Topic Management]
        Layout[App Layout]
    end
    
    subgraph "API Layer"
        GetTopics[GET /api/topics]
        PostTopics[POST /api/topics]
        GetNotifications[GET /api/notifications]
        GetTopicNotifications[GET /api/notifications/[topicId]]
    end
    
    subgraph "Data Layer"
        TopicModel[Topic Model]
        NotificationModel[Notification Model]
        DB[(PostgreSQL)]
    end
    
    Chat --> PostTopics
    Feed --> GetNotifications
    Feed --> GetTopicNotifications
    Topics --> GetTopics
    
    GetTopics --> TopicModel
    PostTopics --> TopicModel
    GetNotifications --> NotificationModel
    GetTopicNotifications --> NotificationModel
    
    TopicModel --> DB
    NotificationModel --> DB
```

## Components and Interfaces

### Frontend Components (Existing Template)

#### TopicInput Component
- **Purpose**: Handle topic creation through form interface
- **Props**: 
  - `onCreateTopic: (title: string, prompt: string) => void`
- **Current Implementation**: Form with title and description inputs
- **Integration Needed**: Connect to POST /api/topics endpoint

#### NotificationsSidebar Component  
- **Purpose**: Display all notifications in right sliding sidebar
- **Props**:
  - `notifications: Notification[]`
  - `topics: Topic[]`
  - `onNotificationClick: (notification: Notification) => void`
- **Current Implementation**: Scrollable list with unread indicators
- **Integration Needed**: Connect to GET /api/notifications endpoint

#### TopicsSidebar Component
- **Purpose**: Display topics list in left sliding sidebar  
- **Props**:
  - `topics: Topic[]`
  - `onTopicClick: (topic: Topic) => void`
  - `selectedTopicId?: string`
- **Current Implementation**: List of topics with selection state
- **Integration Needed**: Connect to GET /api/topics endpoint

#### TopicBoard Component
- **Purpose**: Display topic details and topic-specific notifications
- **Props**:
  - `topic: Topic`
  - `notifications: Notification[]`
  - `onBack: () => void`
  - `onDeleteTopic: (topicId: string) => void`
  - `onMarkAsRead: (notificationId: string) => void`
- **Current Implementation**: Topic header with filtered notifications
- **Integration Needed**: Connect to GET /api/notifications/[topicId] endpoint

#### SlidingSidebar Component
- **Purpose**: Reusable sliding sidebar container
- **Props**: `side: 'left' | 'right'`, `icon: ReactNode`, `children: ReactNode`
- **Current Implementation**: Animated sidebar with trigger button

### API Endpoints

#### Endpoint 1: Get All Topics
- `GET /api/topics`
- **Purpose**: List of all topics that user created
- **Response**: Array of Topic objects with id, name, description, keywords, and metadata

#### Endpoint 2: Create New Topic
- `POST /api/topics`
- **Purpose**: Create a new topic for monitoring
- **Request Body**: Topic configuration (name, description, keywords)
- **Response**: Created Topic object with generated id

#### Endpoint 3: Get All Recent Events
- `GET /api/events`
- **Purpose**: Get all recent events from all topics combined
- **Usage**: List on the right side of the site
- **Response**: Array of event objects sorted by most recent first

#### Endpoint 4: Get Events for Specific Topic
- `GET /api/events/[topicId]`
- **Purpose**: All events from specific topic
- **Response**: Array of event objects filtered by topic ID

### Database Schema

#### Topics Table
```sql
CREATE TABLE topics (
    id SERIAL PRIMARY KEY,
    prompt TEXT NOT NULL,
    title VARCHAR(255) NOT NULL
);
```

#### Events Table
```sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    event_url VARCHAR(1000),
    topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
    summary TEXT,
    title VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Sources Table
```sql
CREATE TABLE sources (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
    source_url VARCHAR(1000) NOT NULL,
    type VARCHAR(100) NOT NULL -- RSS, Twitter, Newsletter, etc.
);
```

#### Database Indexes (for performance)
```sql
CREATE INDEX idx_events_topic_id ON events(topic_id);
CREATE INDEX idx_events_created_at ON events(created_at DESC);
CREATE INDEX idx_sources_topic_id ON sources(topic_id);
CREATE INDEX idx_sources_type ON sources(type);
```

## Data Models

### TypeScript Interfaces

**Current Template Types (lib/types.ts):**
```typescript
interface Topic {
    id: string;
    title: string;
    prompt: string;
    createdAt: Date;
    updatedAt: Date;
}

interface Notification {
    id: string;
    topicId: string;
    title: string;
    content: string;
    source: string;
    url?: string;
    createdAt: Date;
    isRead: boolean;
}

interface AppState {
    topics: Topic[];
    notifications: Notification[];
}
```

**Database-Compatible Types (for API integration):**
```typescript
interface TopicDB {
    id: number;
    prompt: string;
    title: string;
}

interface EventDB {
    id: number;
    event_url?: string;
    topic_id: number;
    summary?: string;
    title: string;
    created_at: Date;
}

interface SourceDB {
    id: number;
    topic_id: number;
    source_url: string;
    type: string; // 'RSS' | 'Twitter' | 'Newsletter' | etc.
}
```

## Error Handling

### Frontend Error Handling
- **Chat Interface**: Display error messages for failed topic creation
- **Event Feed**: Show loading states and error messages for failed data fetching
- **Topic Management**: Confirm destructive actions and handle API failures gracefully

### API Error Handling
- **Validation Errors**: Return 400 status with detailed validation messages
- **Database Errors**: Return 500 status with generic error message, log detailed error
- **Not Found Errors**: Return 404 status for non-existent resources

### Database Error Handling
- **Connection Failures**: Implement retry logic with exponential backoff
- **Constraint Violations**: Handle unique constraint and foreign key violations
- **Transaction Management**: Use database transactions for multi-table operations

## Testing Strategy

### Unit Testing
- **Frontend Components**: Test component rendering, user interactions, and state management
- **API Routes**: Test request/response handling, validation, and error scenarios
- **Database Models**: Test CRUD operations and data validation

### Integration Testing
- **API Integration**: Test complete request flow from frontend to database
- **Database Integration**: Test schema migrations and data consistency
- **Container Integration**: Test application startup and service connectivity

### End-to-End Testing
- **User Workflows**: Test complete user journeys from chat interaction to event viewing
- **Cross-Component Integration**: Test data flow between chat, topics, and events
- **Container Deployment**: Test complete application deployment and functionality

## Deployment Configuration

### Docker Configuration

#### Application Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start"]
```

#### Docker Compose Configuration
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://synk_user:synk_password@db:5432/synk_db
      - NODE_ENV=production
    depends_on:
      db:
        condition: service_healthy
  
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=synk_db
      - POSTGRES_USER=synk_user
      - POSTGRES_PASSWORD=synk_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U synk_user -d synk_db"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

#### Database Initialization Script (init.sql)
```sql
-- Create tables
CREATE TABLE topics (
    id SERIAL PRIMARY KEY,
    prompt TEXT NOT NULL,
    title VARCHAR(255) NOT NULL
);

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    event_url VARCHAR(1000),
    topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
    summary TEXT,
    title VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sources (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
    source_url VARCHAR(1000) NOT NULL,
    type VARCHAR(100) NOT NULL
);

-- Create indexes
CREATE INDEX idx_events_topic_id ON events(topic_id);
CREATE INDEX idx_events_created_at ON events(created_at DESC);
CREATE INDEX idx_sources_topic_id ON sources(topic_id);
CREATE INDEX idx_sources_type ON sources(type);
```

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Application environment (development/production)
- `NEXTAUTH_SECRET`: Secret for session management (future authentication)
- `PORT`: Application port (default: 3000)

## Future Extensibility

### AI Integration Points
- **Chat Processing**: Enhanced natural language processing for topic extraction
- **Event Generation**: AI-powered web scraping and content analysis
- **Smart Notifications**: AI-driven relevance scoring and notification filtering

### Scalability Considerations
- **Database Indexing**: Add indexes on frequently queried columns (topic keywords, event dates)
- **Caching Layer**: Implement Redis for frequently accessed data
- **Background Processing**: Add job queue for event processing and notifications
- **API Rate Limiting**: Implement rate limiting for API endpoints