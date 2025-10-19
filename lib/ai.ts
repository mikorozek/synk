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
 * Discovers relevant sources for a topic using GPT-5 with web search
 * @param prompt - The user's topic prompt
 * @returns Object containing discovered sources
 */
export async function discoverSources(
  prompt: string
): Promise<SourceDiscoveryResult> {
  console.log('[AI] Starting source discovery with GPT-5');
  console.log(`[AI] Prompt: ${prompt}`);

  try {
    const result = await generateText({
      model: openai('gpt-5'),
      prompt: `Find relevant sources about ${prompt}`,
      tools: {
        web_search: openai.tools.webSearch({
          searchContextSize: 'high',
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
 * @param prompt - The user's original prompt
 * @returns Object containing the generated title (truncated to 255 chars if needed)
 */
export async function generateTitle(
  prompt: string
): Promise<TitleGenerationResult> {
  console.log('[AI] Starting title generation with GPT-5');
  console.log(`[AI] Prompt: ${prompt}`);

  try {
    const result = await generateObject({
      model: openai('gpt-5'),
      system: `Generate a short, descriptive title for the given topic.`,
      prompt: `Generate a title for: ${prompt}`,
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
