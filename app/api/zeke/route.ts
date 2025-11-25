import { NextRequest, NextResponse } from 'next/server';
import { streamText, tool } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import {
  createMcpClients,
  closeMcpClients,
} from '@/lib/mcp/clients';
import { z } from 'zod';

const zai = createOpenAICompatible({
  name: 'zai-coding-plan',
  apiKey: process.env.Z_AI_API_KEY || process.env.ZAI_API_KEY,
  baseURL: process.env.ZEKE_GLMPROXY_URL
    ? `${process.env.ZEKE_GLMPROXY_URL}/v1`
    : 'https://api.z.ai/api/coding/paas/v4',
});

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for long streams (bump to 120/300 if Vercel plan allows)

/**
 * Helper function to call Z.AI MCP endpoint and parse response
 */
async function callZaiMcpEndpoint(
  url: string,
  body: Record<string, any>
): Promise<any> {
  const apiKey = process.env.Z_AI_API_KEY || process.env.ZAI_API_KEY;
  if (!apiKey) {
    throw new Error('Z_AI_API_KEY or ZAI_API_KEY is not set');
  }

  console.log('[Zeke API] callZaiMcpEndpoint: calling', url, 'with body keys:', Object.keys(body));
  const startTime = Date.now();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify(body),
  });

  const duration = Date.now() - startTime;
  console.log('[Zeke API] callZaiMcpEndpoint: response status', response.status, 'after', duration, 'ms');

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('[Zeke API] callZaiMcpEndpoint: error response:', errorText);
    throw new Error(`Z.AI MCP endpoint failed: ${response.status} ${errorText}`);
  }

  // Try to parse as JSON first
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    const jsonResult = await response.json();
    console.log('[Zeke API] callZaiMcpEndpoint: got JSON response, keys:', Object.keys(jsonResult || {}));
    return jsonResult;
  }

  // If SSE, read the stream and parse
  const text = await response.text();
  console.log('[Zeke API] callZaiMcpEndpoint: got text response, length:', text.length);
  try {
    const parsed = JSON.parse(text);
    console.log('[Zeke API] callZaiMcpEndpoint: parsed JSON, keys:', Object.keys(parsed || {}));
    return parsed;
  } catch {
    // If not JSON, return as structured object
    console.log('[Zeke API] callZaiMcpEndpoint: returning as text content');
    return { content: text };
  }
}

/**
 * Custom tool: zekeSearch - Web search via Z.AI MCP
 */
const zekeSearch = tool({
  description: 'High-quality web search via Z.AI. Use this to find relevant information, articles, or resources on the web.',
  inputSchema: z.object({
    query: z.string().describe('Search query string'),
    lang: z.string().optional().describe('Language code (optional, e.g., "en", "zh")'),
  }),
  execute: async ({ query, lang }) => {
    try {
      console.log('[Zeke API] zekeSearch called with query:', query, 'lang:', lang);
      const body: Record<string, any> = { query };
      if (lang) {
        body.lang = lang;
      }

      // Add timeout to prevent hanging
      const result = await Promise.race([
        callZaiMcpEndpoint(
          'https://api.z.ai/api/mcp/web_search_prime/mcp',
          body
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('zekeSearch timeout after 30s')), 30000)
        ),
      ]) as any;

      console.log('[Zeke API] zekeSearch result type:', typeof result, 'isArray:', Array.isArray(result));

      // Format result for the model
      if (Array.isArray(result)) {
        return {
          results: result.map((item: any) => ({
            title: item.title || item.name || 'Untitled',
            url: item.url || item.link || '',
            summary: item.summary || item.snippet || item.description || '',
          })),
        };
      }

      return { results: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Zeke API] zekeSearch error:', errorMessage);
      return {
        error: `Search failed: ${errorMessage}`,
        results: [],
      };
    }
  },
});

/**
 * Custom tool: zekeReader - Web page reader via Z.AI MCP
 */
const zekeReader = tool({
  description: 'Fetch and parse the content of a web page. Use this to read and understand the content of a specific URL.',
  inputSchema: z.object({
    url: z.string().url().describe('URL of the web page to read'),
  }),
  execute: async ({ url }) => {
    try {
      console.log('[Zeke API] zekeReader called with url:', url);

      // Add timeout to prevent hanging
      const result = await Promise.race([
        callZaiMcpEndpoint(
          'https://api.z.ai/api/mcp/web_reader/mcp',
          { url }
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('zekeReader timeout after 45s')), 45000)
        ),
      ]) as any;

      console.log('[Zeke API] zekeReader result type:', typeof result, 'hasContent:', !!result?.content, 'hasText:', !!result?.text);

      // Format result for the model
      if (typeof result === 'string') {
        return { content: result };
      }

      if (result.content) {
        return { content: result.content };
      }

      if (result.text) {
        return { content: result.text };
      }

      return { content: JSON.stringify(result, null, 2) };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Zeke API] zekeReader error:', errorMessage);
      return {
        error: `Reader failed: ${errorMessage}`,
        content: '',
      };
    }
  },
});

export async function POST(req: NextRequest) {
  console.log('[Zeke API] ========== POST request received ==========');
  console.log('[Zeke API] Request URL:', req.url);
  console.log('[Zeke API] Request headers:', Object.fromEntries(req.headers.entries()));

  const apiKey = process.env.Z_AI_API_KEY || process.env.ZAI_API_KEY;
  if (!apiKey) {
    console.error('[Zeke API] ❌ Z_AI_API_KEY or ZAI_API_KEY is not set');
    return NextResponse.json(
      { error: 'Z_AI_API_KEY is not set', message: 'Please configure Z_AI_API_KEY or ZAI_API_KEY in your environment variables' },
      { status: 500 }
    );
  }
  console.log('[Zeke API] ✅ API key is set');

  let prompt: string;
  try {
    const body = await req.json();
    console.log('[Zeke API] Request body keys:', Object.keys(body));
    prompt = body.prompt;
    if (!prompt) {
      console.error('[Zeke API] ❌ Missing prompt in body');
      return NextResponse.json(
        { error: 'Missing prompt', message: 'Request body must include a prompt field' },
        { status: 400 }
      );
    }
    console.log('[Zeke API] ✅ Prompt received, length:', prompt.length);
    console.log('[Zeke API] Prompt preview:', prompt.substring(0, 100));
  } catch (err) {
    console.error('[Zeke API] ❌ Failed to parse request body:', err);
    return NextResponse.json(
      { error: 'Invalid request', message: 'Request body must be valid JSON' },
      { status: 400 }
    );
  }

  let clients;
  try {
    // Initialize all MCP clients (Vision may be null if stdio fails)
    clients = await createMcpClients();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('MCP clients initialization failed:', {
      message: errorMessage,
      error: error,
    });
      return NextResponse.json(
        {
          error: 'MCP clients initialization failed',
          message: errorMessage,
        },
        { status: 500 }
      );
  }

  try {
    const tools: Record<string, any> = {
      zekeSearch,
      zekeReader,
    };

    // Collect tools from Vision MCP client (if available)
    if (clients.vision) {
      try {
        const visionTools = await clients.vision.tools();
        Object.assign(tools, visionTools);
      } catch (error) {
        console.warn('Failed to get Vision MCP tools:', error);
      }
    }

    // Ensure at least one tool is available
    console.log('[Zeke API] Total tools available:', Object.keys(tools).length, Object.keys(tools));
    if (Object.keys(tools).length === 0) {
      await closeMcpClients(clients);
      return NextResponse.json(
        { error: 'No tools available' },
        { status: 500 }
      );
    }

    console.log('[Zeke API] ========== Starting streamText ==========');
    console.log('[Zeke API] Prompt length:', prompt.length);
    console.log('[Zeke API] Tools available:', Object.keys(tools));

    const response = await streamText({
      model: zai('glm-4.6'),
      tools,
      // 🔥 UN-NERF: Set explicit token budget so responses don't get cut off early
      // GLM-4.6 supports up to 128K output tokens, but we use 8192 for "deep" mode
      maxOutputTokens: 8192, // Deep briefing mode - allows for comprehensive, multi-page briefings
      temperature: 0.35, // Slightly lower for more focused, consistent output
      // Add callback to track tool calls
      onStepFinish: async ({ text, toolCalls, toolResults, finishReason }) => {
        console.log('[Zeke API] Step finished:', {
          textLength: text?.length || 0,
          toolCallsCount: toolCalls?.length || 0,
          toolResultsCount: toolResults?.length || 0,
          finishReason,
        });
        if (toolCalls && toolCalls.length > 0) {
          console.log('[Zeke API] Tool calls:', toolCalls.map(tc => ({
            name: tc.toolName,
            toolCallId: tc.toolCallId,
          })));
        }
        if (toolResults && toolResults.length > 0) {
          console.log('[Zeke API] Tool results:', toolResults.map(tr => {
            const result = 'result' in tr ? tr.result : 'output' in tr ? tr.output : null;
            return {
              toolCallId: tr.toolCallId,
              resultLength: result ? (typeof result === 'string' ? result.length : JSON.stringify(result).length) : 0,
            };
          }));
        }
      },
      system: [
        'You are Zeke, a classy, friendly robot briefing officer.',
        'You speak in a PG-rated, slightly humorous tone – nothing crude, no memes that would embarrass people in a meeting.',
        'You produce briefings that feel polished and "boardroom-ready," but still fun.',
        '',
        'You are working with Z.AI tools:',
        '- Vision MCP: `image_analysis`, `video_analysis` for understanding images and videos (if available).',
        '- Web Search: `zekeSearch` for high-quality web search.',
        '- Web Reader: `zekeReader` to fetch and parse the content of web pages.',
        '',
        'You are also powered by GLM-4.6 via the GLM Coding Plan (coding/paas/v4, OpenAI-compatible).',
        '',
        'PROMPT FORMAT FROM CLIENT:',
        'The user prompt has this structure:',
        '',
        'LANG_MODE=<BILINGUAL|EN|ZH>',
        'URL=<optional-http-url-or-empty>',
        '',
        'MISSION:',
        '<free-form mission text>',
        '',
        'YOUR JOB:',
        '1. Read LANG_MODE and URL from the prompt.',
        '2. If a URL is present, always use zekeSearch and zekeReader tools to understand context around that URL.',
        '   - zekeSearch: find 3–5 useful results closely related to the URL or mission.',
        '   - zekeReader: fetch the main content for the target URL (or a top result if no URL is given).',
        '3. If the mission or URL mentions a local image or screenshot filename (like demo.png),',
        '   you MAY call image_analysis from the Vision MCP to add visual context.',
        '4. Then generate a **detailed, comprehensive briefing**.',
        '',
        'OUTPUT RULES:',
        '- Write a **detailed** briefing, not just a short summary.',
        '- Include: core idea, main tradeoffs, important numbers, key risks, any missing info or TODOs.',
        '- Aim for a few pages of content if necessary. Avoid being overly brief.',
        '- If LANG_MODE=BILINGUAL: output English first, then Simplified Chinese.',
        '- If LANG_MODE=EN: English only.',
        '- If LANG_MODE=ZH: Chinese only (简体中文).',
        '- Use clear sections:',
        '  1) Title',
        '  2) Overview (can be multiple paragraphs)',
        '  3) Key points (detailed bullets, 6–12+ items if relevant)',
        '  4) "Why it matters" (detailed explanation, 3–5+ bullets)',
        '  5) "Important numbers/metrics" (if applicable)',
        '  6) "Risks and considerations" (if applicable)',
        '  7) "Next steps" (detailed recommendations, 3–5+ bullets)',
        '',
        'Style constraints:',
        '- No slang that would sound unprofessional.',
        '- No mention of "lab" or "labs" in your copy.',
        '- Assume your audience includes Chinese and Western devs in the same Discord – keep tone respectful and globally friendly.',
      ].join('\n'),
      prompt,
      onFinish: async ({ finishReason, usage, text }) => {
        // Log finish reason and usage to debug truncation issues
        console.log('[Zeke API] Stream finished:', {
          finishReason,
          finalTextLength: text?.length || 0,
          usage: usage ? {
            promptTokens: 'promptTokens' in usage ? usage.promptTokens : 'inputTokens' in usage ? usage.inputTokens : 'unknown',
            completionTokens: 'completionTokens' in usage ? usage.completionTokens : 'outputTokens' in usage ? usage.outputTokens : 'unknown',
            totalTokens: 'totalTokens' in usage ? usage.totalTokens : 'unknown',
          } : 'not available',
        });

        // If finishReason is 'length', we hit the maxOutputTokens limit
        if (finishReason === 'length') {
          console.warn('[Zeke API] ⚠️ Response was truncated due to maxOutputTokens limit. Consider increasing maxOutputTokens if longer responses are needed.');
        } else if (finishReason === 'stop') {
          console.log('[Zeke API] ✅ Stream completed normally (stop reason)');
        } else if (finishReason === 'tool-calls') {
          console.log('[Zeke API] ⚠️ Stream finished with tool-calls reason - this might indicate incomplete execution');
        } else {
          console.log('[Zeke API] Stream finished with reason:', finishReason);
        }

        await closeMcpClients(clients);
      },
      onError: async (error) => {
        console.error('[Zeke API] Stream error:', error);
        await closeMcpClients(clients);
      },
    });

    // Use toTextStreamResponse - returns plain text stream
    console.log('[Zeke API] ========== Returning stream response ==========');
    return response.toTextStreamResponse();
  } catch (err) {
    console.error('[Zeke API] error:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;

    console.error('[Zeke API] Error details:', {
      message: errorMessage,
      stack: errorStack,
      type: err?.constructor?.name,
    });

    if (clients) {
      await closeMcpClients(clients);
    }

    // Return error in a format that useCompletion can handle
    // useCompletion expects a text stream or will parse JSON error
    return NextResponse.json(
      {
        error: 'Zeke ran into a problem.',
        message: errorMessage,
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
