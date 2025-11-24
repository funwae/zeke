# GLM MCP Adapter - Complete Integration Guide

This guide walks you through integrating the GLM MCP Adapter into your GLM-4.6 project.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Integration Examples](#integration-examples)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Usage](#advanced-usage)

## Overview

The GLM MCP Adapter is a Go service that acts as a bridge between your application and Z.AI's MCP servers. It:

- Exposes Z.AI's Web Search and Web Reader MCP tools via a single Streamable HTTP endpoint
- Handles retries, error recovery, and proper header management
- Provides a clean interface compatible with the AI SDK's MCP client

## Prerequisites

- **Go 1.23+** installed
- **Z.AI API Key** from [Z.AI](https://z.ai)
- **Node.js 22+** (if integrating with Next.js/AI SDK)
- Basic familiarity with MCP (Model Context Protocol)

## Installation

### Step 1: Copy the Adapter

Copy the `glm-mcp-adapter` folder into your project:

```bash
# Option A: Copy entire folder
cp -r glm-mcp-adapter /path/to/your/project/

# Option B: Add as git submodule
git submodule add <repository-url>/glm-mcp-adapter
```

### Step 2: Install Dependencies

```bash
cd glm-mcp-adapter
go mod tidy
```

### Step 3: Build

```bash
go build -o adapter cmd/adapter/main.go
```

Or use the provided build script:

```bash
chmod +x build.sh
./build.sh
```

## Configuration

### Environment Variables

Create a `.env` file or set environment variables:

```bash
# Required
export Z_AI_API_KEY="your-z-ai-api-key"

# Optional
export PORT="8081"
export LOG_LEVEL="info"
export ZAI_MCP_SEARCH_URL="https://api.z.ai/api/mcp/web_search_prime/mcp"
export ZAI_MCP_READER_URL="https://api.z.ai/api/mcp/web_reader/mcp"
```

### Running the Adapter

```bash
# Development
go run cmd/adapter/main.go

# Production
./adapter

# With custom port
PORT=9090 ./adapter
```

## Integration Examples

### Example 1: Next.js with AI SDK

```typescript
// lib/mcp/adapter-client.ts
import { experimental_createMCPClient } from '@ai-sdk/mcp';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export async function createAdapterClient() {
  const adapterURL = process.env.GLM_MCP_ADAPTER_URL || 'http://localhost:8081/mcp';

  const transport = new StreamableHTTPClientTransport(
    new URL(adapterURL),
    {
      requestInit: {
        headers: {
          Authorization: `Bearer ${process.env.Z_AI_API_KEY}`,
        },
      },
    }
  );

  return await experimental_createMCPClient({ transport });
}

// app/api/chat/route.ts
import { streamText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createAdapterClient } from '@/lib/mcp/adapter-client';

const glm = createOpenAICompatible({
  name: 'glm-4.6',
  apiKey: process.env.Z_AI_API_KEY,
  baseURL: 'https://api.z.ai/api/coding/paas/v4',
});

export async function POST(req: Request) {
  const { prompt } = await req.json();

  // Get MCP tools from adapter
  const mcpClient = await createAdapterClient();
  const tools = await mcpClient.tools();

  // Use with GLM-4.6
  const result = await streamText({
    model: glm('glm-4.6'),
    tools,
    prompt,
    system: 'You are a helpful assistant with access to web search and reading capabilities.',
  });

  return result.toTextStreamResponse();
}
```

### Example 2: Standalone Node.js

```javascript
// mcp-client.js
import { experimental_createMCPClient } from '@ai-sdk/mcp';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const transport = new StreamableHTTPClientTransport(
  new URL('http://localhost:8081/mcp'),
  {
    requestInit: {
      headers: {
        Authorization: `Bearer ${process.env.Z_AI_API_KEY}`,
      },
    },
  }
);

const client = await experimental_createMCPClient({ transport });
const tools = await client.tools();

// Use tools with your GLM client
console.log('Available tools:', Object.keys(tools));
```

### Example 3: Docker Deployment

```dockerfile
# Dockerfile
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY glm-mcp-adapter .
RUN go mod download
RUN go build -o adapter cmd/adapter/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/adapter .
EXPOSE 8081
CMD ["./adapter"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  mcp-adapter:
    build: ./glm-mcp-adapter
    ports:
      - "8081:8081"
    environment:
      - Z_AI_API_KEY=${Z_AI_API_KEY}
      - LOG_LEVEL=info
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8081/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Troubleshooting

### Adapter Won't Start

**Error**: `Z_AI_API_KEY environment variable is required`

**Solution**: Set the environment variable:
```bash
export Z_AI_API_KEY="your-key"
```

### Tools Not Available

**Symptom**: `tools()` returns empty object

**Check**:
1. Adapter is running: `curl http://localhost:8081/healthz`
2. Authorization header is set correctly
3. Check adapter logs for errors

### Connection Refused

**Symptom**: `ECONNREFUSED` when connecting to adapter

**Solution**:
1. Verify adapter is running: `ps aux | grep adapter`
2. Check port is correct: `netstat -tuln | grep 8081`
3. Ensure firewall allows connections

### MCP Tools Return Errors

**Symptom**: Tools return error responses

**Check**:
1. Z.AI API key is valid
2. Z.AI endpoints are accessible
3. Check adapter logs: `LOG_LEVEL=debug ./adapter`

## Advanced Usage

### Custom Tool Registration

To add custom tools, modify `internal/mcpserver/server.go`:

```go
mcp.AddTool(s, &mcp.Tool{
    Name:        "custom_tool",
    Description: "Your custom tool description",
    InputSchema: &mcp.Schema{
        Type: "object",
        Properties: map[string]*mcp.Schema{
            "param": {
                Type:        "string",
                Description: "Parameter description",
            },
        },
        Required: []string{"param"},
    },
}, srv.handleCustomTool)
```

### Custom Retry Logic

Modify `internal/httpx/client.go` to adjust retry behavior:

```go
// Change max retries
MaxRetries: 5,

// Change base delay
BaseDelay: 500 * time.Millisecond,
```

### Health Check Endpoint

The adapter includes a health check at `/healthz`:

```bash
curl http://localhost:8081/healthz
# Returns: OK
```

Use this for Kubernetes liveness/readiness probes or load balancer health checks.

### Logging

Set log level via environment variable:

```bash
LOG_LEVEL=debug ./adapter  # Verbose logging
LOG_LEVEL=warn ./adapter   # Only warnings and errors
LOG_LEVEL=error ./adapter  # Only errors
```

### Production Deployment

1. **Build binary**:
   ```bash
   CGO_ENABLED=0 GOOS=linux go build -o adapter cmd/adapter/main.go
   ```

2. **Run as systemd service** (`/etc/systemd/system/mcp-adapter.service`):
   ```ini
   [Unit]
   Description=GLM MCP Adapter
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/opt/mcp-adapter
   Environment="Z_AI_API_KEY=your-key"
   Environment="PORT=8081"
   ExecStart=/opt/mcp-adapter/adapter
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable and start**:
   ```bash
   sudo systemctl enable mcp-adapter
   sudo systemctl start mcp-adapter
   ```

## Architecture Details

### Request Flow

```
Client (AI SDK)
  ↓ Streamable HTTP POST
Adapter (/mcp endpoint)
  ↓ HTTP POST with retry
Z.AI MCP Server
  ↓ Response (JSON or SSE)
Adapter (parses and formats)
  ↓ MCP CallToolResult
Client (receives tool result)
```

### Tool Handlers

Each tool handler:
1. Validates input parameters
2. Creates HTTP request to Z.AI endpoint
3. Sets required headers (`Authorization`, `Accept`, `Content-Type`)
4. Executes request with retry logic
5. Parses response (handles both JSON and SSE)
6. Returns MCP-compliant `CallToolResult`

### Error Handling

- **Network errors**: Automatic retry with exponential backoff
- **4xx errors**: Returned immediately (no retry except 429)
- **5xx errors**: Retried up to `MaxRetries` times
- **Parse errors**: Returned as text content

## Contributing

To extend the adapter:

1. Add new tool handlers in `internal/mcpserver/`
2. Register tools in `internal/mcpserver/server.go`
3. Update this documentation
4. Test with your GLM integration

## Support

For issues or questions:
- Check Z.AI MCP documentation: https://docs.z.ai
- Review adapter logs with `LOG_LEVEL=debug`
- Verify Z.AI API key and endpoints

## License

MIT License - See LICENSE file

