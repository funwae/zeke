# Zeke Bridge Setup

## What is zeke-bridge?

A Go service that provides a reliability layer between Zeke and Z.AI's APIs, handling:
- Retry logic with exponential backoff
- Correct HTTP headers for Z.AI MCP endpoints
- Error logging and debugging
- MCP tool exposure (`zeke_search`, `zeke_reader`)
- OpenAI-compatible GLM proxy

## Quick Start

### 1. Start the Bridge

```bash
cd zeke-bridge
export Z_AI_API_KEY=$(grep Z_AI_API_KEY ../.env.local | cut -d '=' -f2)
./run.sh
```

The bridge runs on `http://localhost:8081` by default.

### 2. Update Zeke to Use Bridge (Optional)

Add to `.env.local`:

```env
ZEKE_GLMPROXY_URL=http://localhost:8081
ZEKE_MCP_URL=http://localhost:8081/mcp
```

### 3. Restart Zeke

```bash
npm run dev
```

## Testing

**Test bridge health:**
```bash
curl http://localhost:8081/healthz
```

**Test without bridge (direct Z.AI):**
- Don't set `ZEKE_GLMPROXY_URL` or `ZEKE_MCP_URL`
- Zeke will use Z.AI endpoints directly

**Test with bridge:**
- Set both environment variables
- Zeke will route through the bridge

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────┐
│   Zeke      │────────▶│ zeke-bridge  │────────▶│   Z.AI   │
│  (Next.js)  │         │    (Go)      │         │   APIs   │
└─────────────┘         └──────────────┘         └──────────┘
```

The bridge handles:
- MCP tool calls (`zeke_search`, `zeke_reader`)
- GLM chat completions (OpenAI-compatible proxy)
- Retries, error handling, logging

## Benefits

1. **Reliability**: Automatic retries on transient failures
2. **Debugging**: Structured logs and error tracking
3. **Compatibility**: Handles Z.AI's specific header requirements
4. **Flexibility**: Can switch between bridge and direct mode via env vars

