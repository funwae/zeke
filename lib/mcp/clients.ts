import {
  experimental_createMCPClient,
} from '@ai-sdk/mcp';
import { Experimental_StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio';

export type MCPClient = Awaited<ReturnType<typeof experimental_createMCPClient>>;

export type ZekeMcpClients = {
  vision: MCPClient | null;
};

function requireZaiKey() {
  const key = process.env.Z_AI_API_KEY;
  if (!key) {
    throw new Error('Missing Z_AI_API_KEY – set it in your .env.local');
  }
  return key;
}

/**
 * Create MCP clients for Zeke
 * Vision uses stdio transport (may fail gracefully)
 * Web Search and Reader are now custom tools in the API route
 */
export async function createMcpClients(): Promise<ZekeMcpClients> {
  const apiKey = requireZaiKey();

  let vision: MCPClient | null = null;

  // Vision – stdio transport via Z.AI's MCP server (non-fatal if fails)
  try {
    const visionTransport = new Experimental_StdioMCPTransport({
      command: 'npx',
      args: ['-y', '@z_ai/mcp-server'],
      env: {
        Z_AI_API_KEY: apiKey,
        Z_AI_MODE: 'ZAI',
      },
    });

    vision = await experimental_createMCPClient({
      transport: visionTransport,
    });
  } catch (error) {
    console.warn('Vision MCP client initialization failed (continuing without it):', error);
    vision = null;
  }

  return { vision };
}

/**
 * Close all MCP clients
 */
export async function closeMcpClients(clients: ZekeMcpClients) {
  const toClose: Promise<void>[] = [];
  if (clients.vision) {
    toClose.push(clients.vision.close());
  }
  await Promise.allSettled(toClose);
}

// Legacy exports for backward compatibility (deprecated)
// MCPClient type is already defined above

export async function createVisionClient(): Promise<MCPClient | null> {
  const clients = await createMcpClients();
  return clients.vision;
}

export async function closeClients(clients: {
  vision?: MCPClient | null;
}): Promise<void> {
  if (clients.vision) {
    await Promise.allSettled([
      clients.vision?.close(),
    ]);
  }
}
