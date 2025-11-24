# Zeke Bridge

A Go-based reliability layer between Zeke (Next.js) and Z.AI's APIs.

## Features

- **MCP Server**: Exposes `zeke_search` and `zeke_reader` tools via Streamable HTTP
- **GLM Proxy**: OpenAI-compatible endpoint that proxies to Z.AI's GLM Coding Plan
- **Retry Logic**: Automatic retries with exponential backoff
- **Header Fixing**: Ensures correct `Accept` headers for Z.AI MCP endpoints
- **Error Logging**: Structured logging and debug endpoints

## Setup

1. **Install dependencies:**
```bash
cd zeke-bridge
go mod tidy
```

2. **Set environment variables:**
```bash
export Z_AI_API_KEY=your_api_key_here
export PORT=8081  # optional, defaults to 8081
```

3. **Run:**
```bash
go run cmd/zeke-bridge/main.go
```

## Endpoints

- `POST /mcp` - MCP Streamable HTTP endpoint
- `POST /v1/chat/completions` - OpenAI-compatible GLM proxy
- `GET /healthz` - Health check
- `GET /debug/last-errors` - Recent error log

## Integration with Zeke

Update your Next.js `.env.local`:

```env
ZEKE_GLMPROXY_URL=http://localhost:8081
ZEKE_MCP_URL=http://localhost:8081/mcp
```

Then update `app/api/zeke/route.ts` to use these URLs instead of direct Z.AI endpoints.

