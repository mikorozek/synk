import { openai } from '@ai-sdk/openai';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';

// Schema for source discovery response
const SourceDiscoverySchema = z.object({
  sources: z.array(
    z.object({
      url: z.string(),
      type: z.enum(['RSS', 'Static Page']),
      description: z.string(),
    })
  ),
  initialReport: z.object({
    title: z.string().describe('A concise title for the initial status report'),
    summary: z.string().describe('A brief summary of what sources were found and what will be tracked'),
  }),
});

// Schema for title generation response
const TitleGenerationSchema = z.object({
    title: z.string(),
});

const NotificationEvaluationSchema = z.object({
  matchesUserPrompt: z.boolean(),
  notificationName: z.string().min(1).nullable(),
  notificationDescription: z.string().min(1).nullable()
}).superRefine((data, ctx) => {
  if (data.matchesUserPrompt) {
    if (!data.notificationName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'notificationName is required when matchesUserPrompt is true'
      });
    }
    if (!data.notificationDescription) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'notificationDescription is required when matchesUserPrompt is true'
      });
    }
  }
});

export type SourceDiscoveryResult = z.infer<typeof SourceDiscoverySchema>;
export type TitleGenerationResult = z.infer<typeof TitleGenerationSchema>;
export type NotificationEvaluationResult = z.infer<typeof NotificationEvaluationSchema>;

export interface EvaluateRssItemInput {
  topicPrompt: string;
  conversation: Array<{ role: 'user' | 'assistant'; content: string }>;
  previousEvents: Array<{ title: string; summary: string | null; url: string | null }>;
  rssItem: {
    title?: string | null;
    summary?: string | null;
    content?: string | null;
    url?: string | null;
    publishedAt?: string | Date | null;
  };
}

/**
 * Generates clarifying questions to better understand what the user wants to track
 * @param prompt - The user's initial prompt
 * @returns String containing clarifying questions
 */
export async function generateClarifyingQuestions(
    prompt: string
): Promise<string> {
    console.log('[AI] Starting clarifying questions generation');
    console.log(`[AI] Initial prompt: ${prompt}`);

    try {
        const result = await generateText({
            model: openai('gpt-4o-mini'),
            system: `You are helping users set up topic monitoring for web events.
Users often provide general requests, and your job is to ask clarifying questions to understand:
- What specific topic or subject they want to track
- What types of events or updates they're interested in
- Any specific sources, perspectives, or contexts they care about

Generate around 3 thoughtful clarifying questions that will help niche down their request.

**Format your response with markdown formatting. **

Example response format:
What **specific aspects** of this topic are you most interested in?

Are there any *particular timeframes* or contexts you'd like me to focus on?

Do you want updates from **specific sources** or perspectives?

Use **bold** for emphasis on key terms and *italics* for subtle emphasis.`,
            prompt: `User wants to track: "${prompt}"\n\nGenerate clarifying questions to better understand what they want to monitor.`,
        });

        console.log('[AI] Clarifying questions generated successfully');
        console.log(`[AI] Questions: ${result.text}`);

        return result.text;
    } catch (error) {
        console.error('[AI] Clarifying questions generation failed:', error);
        throw new Error(
            `Failed to generate clarifying questions: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Discovers relevant sources for a topic using GPT-5 with web search
 * @param prompt - The user's topic prompt (or formatted conversation)
 * @param isConversation - Whether the prompt is a formatted conversation
 * @returns Object containing discovered sources
 */
export async function discoverSources(
    prompt: string,
    isConversation: boolean = false
): Promise<SourceDiscoveryResult> {
    console.log('[AI] Starting source discovery with GPT-5-mini');
    console.log(`[AI] Prompt: ${prompt}`);

    const systemPrompt = isConversation
        ? `The user has had a conversation about what they want to track. The conversation is provided below, where they discussed their interests and preferences. Based on this full conversation, find relevant sources.`
        : undefined;

    try {
        const result = await generateText({
            model: openai('gpt-5-mini'),
            system: systemPrompt,
            prompt: isConversation
                ? `Based on this conversation:\n\n${prompt}\n\nFind relevant sources for what the user wants to track.`
                : `Find relevant sources about ${prompt}`,
            tools: {
                web_search: openai.tools.webSearch({
                    searchContextSize: 'low',
                }),
            },
            toolChoice: { type: 'tool', toolName: 'web_search' },
        });

        console.log('[AI] Source discovery completed successfully');
        console.log(`[AI] Web search sources: ${result.sources?.length || 0}`);

        // Extract sources from web search results and categorize them
        const sources = (result.sources || []).map((source: any) => ({
            url: source.url,
            type: (source.url.includes('/feed') || source.url.includes('/rss') || source.url.endsWith('.xml'))
                ? 'RSS' as const
                : 'Static Page' as const,
            description: source.title || 'Web source',
        }));

        console.log(`[AI] Processed ${sources.length} sources`);

        // Generate initial report based on discovered sources
        console.log('[AI] Generating initial report');
        const reportResult = await generateObject({
            model: openai('gpt-5'),
            mode: 'json',
            schema: z.object({
                title: z.string().describe('A concise title for the initial status report'),
                summary: z.string().describe('A brief summary of what sources were found and what will be tracked'),
            }),
            system: 'You are creating an initial status report for a new monitoring topic. The report should confirm what sources were found and what will be tracked.',
            prompt: `User's request: ${prompt}

Discovered sources:
${sources.map((s, i) => `${i + 1}. ${s.description} (${s.url})`).join('\n')}

Create an initial report that:
- Has a clear, concise title (e.g., "Monitoring Setup Complete" or "Started Tracking [Topic]")
- Summarizes what sources were found and confirms what will be monitored
- Is encouraging and confirms the tracking has begun`,
        });

        console.log('[AI] Initial report generated');

        return {
            sources,
            initialReport: reportResult.object
        };
    } catch (error) {
        console.error('[AI] Source discovery failed:', error);
        throw new Error(
            `Failed to discover sources: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Generates a title for a topic using GPT-5
 * @param prompt - The user's original prompt (or formatted conversation)
 * @param isConversation - Whether the prompt is a formatted conversation
 * @returns Object containing the generated title (truncated to 255 chars if needed)
 */
export async function generateTitle(
    prompt: string,
    isConversation: boolean = false
): Promise<TitleGenerationResult> {
    console.log('[AI] Starting title generation with GPT-5');
    console.log(`[AI] Prompt: ${prompt}`);

    const systemPrompt = isConversation
        ? `Generate a short, descriptive title based on the conversation. The conversation shows what the user wants to track, including clarifications about their interests.`
        : `Generate a short, descriptive title for the given topic.`;

    try {
        const result = await generateObject({
            model: openai('gpt-5'),
            system: systemPrompt,
            prompt: isConversation
                ? `Based on this conversation:\n\n${prompt}\n\nGenerate a title for what the user wants to track.`
                : `Generate a title for: ${prompt}`,
            schema: TitleGenerationSchema,
            mode: 'json',
        });

        // Truncate to 255 characters if needed (database constraint)
        const title = result.object.title.length > 255
            ? result.object.title.substring(0, 255)
            : result.object.title;

        console.log('[AI] Title generation completed successfully');
        console.log(`[AI] Generated title: ${title}`);
        if (result.object.title.length > 255) {
            console.log(`[AI] Title was truncated from ${result.object.title.length} to 255 characters`);
        }

        return { title };
    } catch (error) {
        console.error('[AI] Title generation failed:', error);
        throw new Error(
            `Failed to generate title: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

function formatConversationForAgent(messages: Array<{ role: 'user' | 'assistant'; content: string }>): string {
  if (messages.length === 0) {
    return 'No conversation history available.';
  }

  return messages
    .map(message => {
      const speaker = message.role === 'assistant' ? 'Assistant' : 'User';
      return `**${speaker}:** ${message.content}`;
    })
    .join('\n\n');
}

function formatEventsForAgent(events: Array<{ title: string; summary: string | null; url: string | null }>): string {
  if (events.length === 0) {
    return 'No recent events have been recorded.';
  }

  return events
    .map((event, index) => {
      const summary = event.summary?.trim() ? event.summary : '_No summary provided._';
      const url = event.url?.trim() ? event.url : '_No URL available._';
      return `### Event ${index + 1}: ${event.title}\n- Summary: ${summary}\n- URL: ${url}`;
    })
    .join('\n\n');
}

export async function evaluateRssItemRelevance(
  input: EvaluateRssItemInput
): Promise<NotificationEvaluationResult> {
  const { topicPrompt, conversation, previousEvents, rssItem } = input;

  console.log('[AI] Evaluating RSS item against topic context');

  const conversationMarkdown = formatConversationForAgent(conversation);
  const eventsMarkdown = formatEventsForAgent(previousEvents);

  const rssSummary = rssItem.summary?.trim() || rssItem.content?.trim() || '_No summary provided._';
  const rssUrl = rssItem.url?.trim() || '_No URL provided._';
  const rssPublishedAt = rssItem.publishedAt
    ? (rssItem.publishedAt instanceof Date ? rssItem.publishedAt.toISOString() : rssItem.publishedAt)
    : '_No published date provided._';

  try {
    const result = await generateObject({
      model: openai('gpt-5'),
      mode: 'json',
      schema: NotificationEvaluationSchema,
      system: `You are an assistant that reviews incoming RSS items for relevance to a user's topic.
Evaluate whether the new item should trigger a notification for the user.
Respond strictly with JSON that matches the provided schema.
When the item is not relevant, set both notification fields to null.
Do not include any additional keys or prose.` ,
      prompt: `Topic Prompt:\n${topicPrompt}\n\nConversation History:\n${conversationMarkdown}\n\nRecent Events (Most recent first):\n${eventsMarkdown}\n\nNew RSS Item:\n- Title: ${rssItem.title || 'Untitled'}\n- Summary: ${rssSummary}\n- URL: ${rssUrl}\n- Published At: ${rssPublishedAt}\n\nDecide if this RSS item matches the user's interests. If it does, craft a clear, concise notification name and description that the user will see. The notification should not duplicate recent events unless there is meaningful new information.`
    });

    console.log('[AI] RSS item evaluation completed');
    return result.object;
  } catch (error) {
    console.error('[AI] RSS item evaluation failed:', error);
    throw new Error(
      `Failed to evaluate RSS item: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export interface EvaluateStaticSiteChangeInput {
  topicPrompt: string;
  conversation: Array<{ role: 'user' | 'assistant'; content: string }>;
  previousEvents: Array<{ title: string; summary: string | null; url: string | null }>;
  change: {
    sourceUrl: string;
    oldContent: string | null;
    newContent: string;
  };
}

export async function evaluateStaticSiteChange(
  input: EvaluateStaticSiteChangeInput
): Promise<NotificationEvaluationResult> {
  const { topicPrompt, conversation, previousEvents, change } = input;

  console.log('[AI] Evaluating static site change against topic context');

  const conversationMarkdown = formatConversationForAgent(conversation);
  const eventsMarkdown = formatEventsForAgent(previousEvents);

  const sanitizedOldContent = change.oldContent?.trim() || '_Previous content not available._';
  const sanitizedNewContent = change.newContent.trim() || '_New content is empty._';

  try {
    const result = await generateObject({
      model: openai('gpt-5'),
      mode: 'json',
      schema: NotificationEvaluationSchema,
      system: `You review website changes and decide if the update warrants notifying the user.
Compare the old content with the new content to identify what changed.
If the change is irrelevant to the user's interests, set matchesUserPrompt to false and both notification fields to null.
If it is relevant, craft a clear notification name and description summarizing the meaningful change.
Respond strictly with JSON and do not include extra keys.` ,
      prompt: `Topic Prompt:\n${topicPrompt}\n\nConversation History:\n${conversationMarkdown}\n\nRecent Events (Most recent first):\n${eventsMarkdown}\n\nWebsite Change Details:\n- Source URL: ${change.sourceUrl}\n\nPrevious Content:\n\n\`\`\`markdown\n${sanitizedOldContent}\n\`\`\`\n\nNew Content:\n\n\`\`\`markdown\n${sanitizedNewContent}\n\`\`\`\n\nAnalyze the differences between the old and new content. Determine what changed and whether this change matches the user's interests.`
    });

    console.log('[AI] Static site change evaluation completed');
    return result.object;
  } catch (error) {
    console.error('[AI] Static site change evaluation failed:', error);
    throw new Error(
      `Failed to evaluate static site change: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
