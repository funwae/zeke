# Zeke Bridge Integration Guide

## Overview

`zeke-bridge` is a Go service that sits between Zeke (Next.js) and Z.AI's APIs, providing:

- **Reliability**: Retry logic, error handling, header fixing
- **MCP Tools**: `zeke_search` and `zeke_reader` via Streamable HTTP
- **GLM Proxy**: OpenAI-compatible endpoint for GLM-4.6

## Quick Start

### 1. Start the Bridge

```bash
cd zeke-bridge
export Z_AI_API_KEY=your_key_here
./run.sh
```

Or manually:
```bash
go run cmd/zeke-bridge/main.go
```

The bridge will start on `http://localhost:8081`.

### 2. Update Zeke to Use Bridge

Add to `.env.local`:

```env
ZEKE_GLMPROXY_URL=http://localhost:8081
ZEKE_MCP_URL=http://localhost:8081/mcp
```

### 3. Restart Zeke

```bash
npm run dev
```

## How It Works

### Without Bridge (Direct)
- Zeke → Z.AI GLM endpoint directly
- Zeke → Z.AI MCP endpoints directly

### With Bridge
- Zeke → Bridge → Z.AI GLM endpoint
- Zeke → Bridge → Z.AI MCP endpoints

The bridge handles:
- Retries with exponential backoff
- Correct `Accept` headers for Z.AI MCP
- Error logging and debugging
- SSE/streaming adaptation

## Endpoints

- `POST /mcp` - MCP Streamable HTTP (tools: `zeke_search`, `zeke_reader`)
- `POST /v1/chat/completions` - OpenAI-compatible GLM proxy
- `GET /healthz` - Health check
- `GET /debug/last-errors` - Recent error log

## Testing

Test the bridge health:
```bash
curl http://localhost:8081/healthz
```

Test MCP tools:
```bash
curl -X POST http://localhost:8081/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Troubleshooting

Check bridge logs for detailed error messages. The bridge logs all upstream requests and responses.

If you see errors, check:
1. `Z_AI_API_KEY` is set correctly
2. Bridge is running on the expected port
3. Network connectivity to Z.AI APIs

