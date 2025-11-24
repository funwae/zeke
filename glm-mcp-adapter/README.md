# GLM MCP Adapter

A production-ready Go adapter that exposes Z.AI's MCP (Model Context Protocol) servers as a unified Streamable HTTP endpoint for GLM-4.6 and other AI models.

## What It Does

This adapter wraps Z.AI's MCP devpack servers (Web Search, Web Reader) and exposes them via a single Streamable HTTP endpoint compatible with the AI SDK's `@ai-sdk/mcp` client. It handles:

- **Automatic retries** with exponential backoff
- **Proper header management** for Z.AI's Streamable HTTP requirements
- **Error handling** and structured logging
- **MCP tool registration** (`zai_search`, `zai_reader`)

## Quick Start

```bash
# 1. Set your Z.AI API key
export Z_AI_API_KEY="your-api-key-here"

# 2. Build and run
cd glm-mcp-adapter
go mod tidy
go run cmd/adapter/main.go

# 3. Test health endpoint
curl http://localhost:8081/healthz
```

## Integration

### With Next.js / AI SDK

```typescript
import { experimental_createMCPClient } from '@ai-sdk/mcp';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const mcpClient = await experimental_createMCPClient({
  transport: new StreamableHTTPClientTransport(
    new URL('http://localhost:8081/mcp'),
    {
      requestInit: {
        headers: {
          Authorization: `Bearer ${process.env.Z_AI_API_KEY}`,
        },
      },
    }
  ),
});

const tools = await mcpClient.tools();
// Use tools with streamText() or generateText()
```

### Environment Variables

- `Z_AI_API_KEY` (required) - Your Z.AI API key
- `PORT` (default: `8081`) - Server port
- `LOG_LEVEL` (default: `info`) - Logging level: `debug`, `info`, `warn`, `error`
- `ZAI_MCP_SEARCH_URL` (default: Z.AI endpoint) - Override search URL
- `ZAI_MCP_READER_URL` (default: Z.AI endpoint) - Override reader URL

## Architecture

```
┌─────────────┐
│   GLM-4.6   │
│  (via AI    │
│   SDK)      │
└──────┬──────┘
       │ Streamable HTTP
       ▼
┌─────────────────┐
│  GLM MCP        │
│  Adapter        │
│  (this service) │
└──────┬──────────┘
       │ HTTP + Retry
       ▼
┌─────────────┐   ┌─────────────┐
│ Z.AI Web    │   │ Z.AI Web    │
│ Search MCP  │   │ Reader MCP  │
└─────────────┘   └─────────────┘
```

## Why Use This?

- **Reliability**: Automatic retries handle transient failures
- **Compatibility**: Proper Streamable HTTP implementation for Z.AI's MCP servers
- **Simplicity**: Single endpoint instead of managing multiple MCP connections
- **Production-ready**: Structured logging, error handling, health checks

## License

MIT

