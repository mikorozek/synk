# AI-Enhanced Topic Creation Specification

## Overview
Extend the `/api/topics` POST endpoint to integrate OpenAI GPT-4o models for intelligent source discovery and title generation.

---

## Requirements

### 1. Source Discovery with Web Search (GPT-4o)
**Model**: `gpt-4o`
**Tool**: OpenAI Web Search
**System Prompt**: "Find relevant sources about topic X"

**Structured Output Schema**:
```typescript
{
  sources: Array<{
    url: string;
    type: "RSS feed" | "static page";
    description: string;  // One sentence description
    relevance: string;    // Why is it relevant
  }>
}
```

**Configuration**:
- Use web search tool with appropriate search context
- Force web search tool usage via `toolChoice`
- Return structured output with sources

---

### 2. Title Generation (GPT-4o-mini)
**Model**: `gpt-4o-mini`
**Input**: Original user prompt only (not web search results)

**Structured Output Schema**:
```typescript
{
  title: string;  // Max 50-100 characters, concise and descriptive
}
```

**Purpose**: Generate a concise, meaningful title from the user's prompt

---

### 3. API Workflow

**Endpoint**: `POST /api/topics`

**Request Body**:
```json
{
  "prompt": "string (required)"
}
```

**Execution Flow** (sequential, not transactional):
1. Validate prompt is provided
2. **Call GPT-4o** with web search tool for source discovery
   - Log request start
   - Log response/errors
   - If fails: return 500 with clear error message
3. **Call GPT-4o-mini** for title generation
   - Log request start
   - Log response/errors
   - If fails: return 500 with clear error message
4. **Create Topic** in database with generated title
   - Save: title, prompt, createdAt (auto)
   - If fails: return 500 with clear error message
5. **Store Sources** from GPT-4o response
   - Save each source to Source table
   - Fields: topicId, sourceUrl, type
   - Log each source creation
   - If fails: log error but continue (don't fail entire request)
6. **Return Response** with topic data and AI-generated sources

**Response Body**:
```json
{
  "topic": {
    "id": number,
    "title": string,
    "prompt": string,
    "createdAt": datetime
  },
  "sources": [
    {
      "url": string,
      "type": "RSS feed" | "static page",
      "description": string,
      "relevance": string
    }
  ]
}
```

---

### 4. Error Handling

**No Retries**: All AI calls are single-attempt only

**Error Responses**:
- Missing prompt: `400 - "Prompt is required"`
- GPT-4o web search fails: `500 - "Failed to discover sources: {error details}"`
- GPT-4o-mini title gen fails: `500 - "Failed to generate title: {error details}"`
- Topic creation fails: `500 - "Failed to create topic: {error details}"`
- Source storage fails: Log error, don't fail request

**Logging Requirements**:
- Log start of each AI call
- Log completion/failure of each AI call
- Log topic creation
- Log each source being saved
- Log any errors with full details

---

### 5. Database Schema

**Topic Model** (existing - no changes):
```prisma
model Topic {
  id        Int      @id @default(autoincrement())
  prompt    String
  title     String   @db.VarChar(255)
  createdAt DateTime @default(now()) @map("created_at")

  events  Event[]
  sources Source[]

  @@map("topics")
}
```

**Source Model** (existing - use for storing AI sources):
```prisma
model Source {
  id        Int    @id @default(autoincrement())
  topicId   Int    @map("topic_id")
  sourceUrl String @map("source_url") @db.VarChar(1000)
  type      String @db.VarChar(100)

  topic Topic @relation(fields: [topicId], references: [id], onDelete: Cascade)

  @@index([topicId])
  @@index([type])
  @@map("sources")
}
```

**Note**: Use existing `type` field to store "RSS feed" or "static page"

---

### 6. Environment Configuration

**Required Environment Variables**:
```env
OPENAI_API_KEY=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
```

Add this to `.env` file in project root.

---

### 7. Dependencies

**New Package Required**:
```bash
npm install ai
```

The Vercel AI SDK (`ai` package) provides:
- OpenAI integration
- Web search tool support
- Structured output with Zod schemas
- Type-safe AI interactions

---

### 8. Implementation Files

**Files to Create**:
- `/lib/ai.ts` - AI service functions for source discovery and title generation

**Files to Modify**:
- `/app/api/topics/route.ts` - Update POST handler with AI integration
- `/.env` - Add OPENAI_API_KEY

---

### 9. Example Usage

**Request**:
```bash
POST /api/topics
Content-Type: application/json

{
  "prompt": "Latest developments in quantum computing"
}
```

**Response**:
```json
{
  "topic": {
    "id": 42,
    "title": "Latest Developments in Quantum Computing",
    "prompt": "Latest developments in quantum computing",
    "createdAt": "2025-10-18T12:34:56.789Z"
  },
  "sources": [
    {
      "url": "https://quantum.rss/feed.xml",
      "type": "RSS feed",
      "description": "Daily updates on quantum computing research and breakthroughs",
      "relevance": "Provides real-time updates on quantum computing developments"
    },
    {
      "url": "https://arxiv.org/list/quant-ph/recent",
      "type": "static page",
      "description": "Recent quantum physics papers on arXiv",
      "relevance": "Academic source for latest quantum computing research papers"
    }
  ]
}
```

---

### 10. Success Criteria

- ✅ Topic created with AI-generated title
- ✅ Sources discovered via GPT-4o web search
- ✅ Sources stored in database linked to topic
- ✅ Response includes both topic and sources
- ✅ Comprehensive logging throughout process
- ✅ Clear error messages on failures
- ✅ No retries on AI failures
- ✅ Source storage failures don't break the request

---

## Notes

- Sources are NOT stored in a single transaction with topic creation
- Title generation uses ONLY the original prompt, not web search results
- Web search results are returned to client but not stored in Topic model
- Description and relevance from AI response are NOT stored (only url and type)
- Maximum title length should be validated to fit `VarChar(255)` constraint
