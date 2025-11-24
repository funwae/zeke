package mcpserver

import (
	"net/http"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	"golang.org/x/exp/slog"

	"glm-mcp-adapter/internal/config"
	"glm-mcp-adapter/internal/httpx"
)

// Server wraps an MCP server with Z.AI tool handlers
type Server struct {
	mcpServer *mcp.Server
	logger    *slog.Logger
	client    *httpx.RetryingClient
	cfg       *config.Config
}

// New creates a new MCP server with Z.AI tools registered
func New(logger *slog.Logger, cfg *config.Config, client *httpx.RetryingClient) *Server {
	impl := &mcp.Implementation{
		Name:    "glm-mcp-adapter",
		Version: "0.1.0",
	}

	s := mcp.NewServer(impl, nil)

	srv := &Server{
		mcpServer: s,
		logger:    logger,
		client:    client,
		cfg:       cfg,
	}

	// Register Z.AI MCP tools
	mcp.AddTool(s, &mcp.Tool{
		Name:        "zai_search",
		Description: "High-reliability web search via Z.AI MCP devpack.",
		InputSchema: &mcp.Schema{
			Type: "object",
			Properties: map[string]*mcp.Schema{
				"query": {
					Type:        "string",
					Description: "Search query",
				},
				"lang": {
					Type:        "string",
					Description: "Language code (optional)",
				},
			},
			Required: []string{"query"},
		},
	}, srv.handleSearch)

	mcp.AddTool(s, &mcp.Tool{
		Name:        "zai_reader",
		Description: "High-reliability web reader via Z.AI MCP devpack.",
		InputSchema: &mcp.Schema{
			Type: "object",
			Properties: map[string]*mcp.Schema{
				"url": {
					Type:        "string",
					Description: "URL to read",
				},
			},
			Required: []string{"url"},
		},
	}, srv.handleReader)

	return srv
}

// HandleMCP handles MCP requests via Streamable HTTP
func (s *Server) HandleMCP(w http.ResponseWriter, r *http.Request) {
	handler := mcp.NewStreamableHTTPHandler(func(*http.Request) *mcp.Server {
		return s.mcpServer
	}, nil)
	handler.ServeHTTP(w, r)
}

