# Zeke Briefing Desk

> "Give Zeke a screenshot and a link. He comes back with a clean bilingual briefing."

**Zeke** is a multi-modal briefing assistant powered by GLM-4.6 and Z.AI's MCP servers. Submit a URL (and optionally a screenshot), and Zeke will use Vision, Web Search, and Web Reader MCP tools to produce a polished bilingual briefing.

## Features

- **Multi-modal analysis**: Combines Vision MCP, Web Search MCP, and Web Reader MCP
- **Bilingual output**: English, Simplified Chinese (简体中文), or both
- **GLM-4.6 powered**: Uses Z.AI's GLM Coding Plan endpoint
- **Streaming responses**: Real-time briefing generation
- **Graceful degradation**: Works even if Vision MCP is unavailable

## Branding Note

**Important**: Copy intentionally avoids "Lab(s)" terminology. This is a clean, classic presentation suitable for both English and 简体中文 audiences. Please maintain this constraint in any modifications.

## Prerequisites

- **Node.js >= 22** (required for Vision MCP stdio transport)
- **Z.AI API Key** (GLM Coding Plan)
- `npx` available in your environment

## Setup

1. **Clone and install dependencies:**

```bash
npm install
# or
pnpm install
# or
yarn install
```

2. **Set up environment variables:**

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Z.AI API key:

```bash
Z_AI_API_KEY=sk-your-api-key-here
```

3. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000/zeke](http://localhost:3000/zeke) in your browser.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `Z_AI_API_KEY` | Your Z.AI API key for GLM Coding Plan | Yes |

## Usage

1. **Select language mode**: Choose EN, 中文, or 双语 (bilingual)
2. **Optionally paste a URL**: Any doc, blog post, or spec link
3. **Write your mission**: Tell Zeke what you want to understand
4. **Click "Send to Zeke"**: Watch as Zeke uses MCP tools and generates your briefing

### Example Mission

```
Give me a tight, high-signal briefing on this page and its surrounding context.
Assume I'm a senior engineer just joining the project.
Highlight: core idea, main tradeoffs, important numbers, and any risks.
```

## How It Works

1. **Zeke parses your mission** and language preference
2. **MCP tools activate**:
   - `webSearchPrime` finds relevant sources
   - `webReader` fetches and parses page content
   - `image_analysis` (if Vision MCP available) analyzes screenshots
3. **GLM-4.6 synthesizes** everything into a structured briefing

## MCP Health Checks

### Test Web Search MCP

```bash
curl -X POST https://api.z.ai/api/mcp/web_search_prime/mcp \
  -H "Authorization: Bearer $Z_AI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "webSearchPrime",
      "arguments": {
        "query": "GLM-4.6 MCP integration"
      }
    }
  }'
```

### Test Web Reader MCP

```bash
curl -X POST https://api.z.ai/api/mcp/web_reader/mcp \
  -H "Authorization: Bearer $Z_AI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "webReader",
      "arguments": {
        "url": "https://docs.z.ai/devpack/mcp/vision-mcp-server"
      }
    }
  }'
```

### Test Vision MCP

Create a test file `test-vision.js`:

```javascript
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';
import { Experimental_StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio';

const transport = new Experimental_StdioMCPTransport({
  command: 'npx',
  args: ['-y', '@z_ai/mcp-server'],
  env: {
    Z_AI_API_KEY: process.env.Z_AI_API_KEY,
    Z_AI_MODE: 'ZAI',
  },
});

const client = await createMCPClient({ transport });
const tools = await client.tools();
console.log('Available tools:', Object.keys(tools));
await client.close();
```

Run with:

```bash
Z_AI_API_KEY=sk-your-key node test-vision.js
```

## Deployment

Deploy to Vercel:

1. Push to GitHub and import the repository in Vercel
2. Set `Z_AI_API_KEY` in Environment Variables
3. Deploy — Vercel automatically detects Next.js and uses Node.js 22 runtime

## Discord Demo Instructions

When demonstrating Zeke in Discord:

1. **Show the interface**: Screenshot of the clean UI with Zeke avatar
2. **Submit a request**: Paste a URL (e.g., a Z.AI docs page) and a mission
3. **Highlight the tech stack**:
   - "This is *Zeke*, a multi-modal briefing officer built on GLM-4.6's Coding Plan."
   - "One click: GLM calls Vision MCP (if screenshot), Web Search MCP, and Web Reader MCP."
   - "Then GLM-4.6 synthesizes everything into a clean English + Chinese briefing."
   - "All via a single OpenAI-compatible endpoint at `https://api.z.ai/api/coding/paas/v4` and three MCP endpoints."

4. **Show the result**: Share the bilingual briefing output

## Architecture

- **Frontend**: Next.js 15 App Router, React, Tailwind CSS
- **Backend**: Next.js API Routes (Node.js runtime)
- **AI**: GLM-4.6 via Z.AI Coding Plan (`/api/coding/paas/v4`)
- **MCP Servers**:
  - Vision: Local stdio (`npx -y @z_ai/mcp-server`)
  - Web Search: HTTP (`https://api.z.ai/api/mcp/web_search_prime/mcp`)
  - Web Reader: HTTP (`https://api.z.ai/api/mcp/web_reader/mcp`)

## Troubleshooting

### Vision MCP not working

Vision MCP requires Node.js >= 22. If it fails to initialize, Zeke will continue with Web Search and Web Reader MCPs only. Check:

- Node.js version: `node --version` (should be >= 22)
- `npx` is available: `which npx`
- API key is set correctly

### API errors

- Verify `Z_AI_API_KEY` is set in `.env.local`
- Check that your API key has access to GLM Coding Plan
- Ensure you have remaining quota for Web Search and Web Reader MCP calls

### Build errors

- Ensure Node.js >= 22 is installed
- Clear `.next` folder and rebuild: `rm -rf .next && npm run build`

## License

MIT

## Credits

Built to demonstrate GLM-4.6 + Z.AI MCP integration. Zeke mascot designed for clean, professional presentation suitable for global developer communities.

