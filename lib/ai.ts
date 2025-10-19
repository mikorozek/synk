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
});

// Schema for title generation response
const TitleGenerationSchema = z.object({
  title: z.string(),
});

export type SourceDiscoveryResult = z.infer<typeof SourceDiscoverySchema>;
export type TitleGenerationResult = z.infer<typeof TitleGenerationSchema>;

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

**Format your response as a numbered list with markdown formatting.**

Example response format:
1. What **specific aspects** of this topic are you most interested in?
2. Are there any *particular timeframes* or contexts you'd like me to focus on?
3. Do you want updates from **specific sources** or perspectives?

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

    return { sources };
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
