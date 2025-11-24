package mcpserver

import (
	"net/http"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	"golang.org/x/exp/slog"

	"zeke-bridge/internal/config"
	"zeke-bridge/internal/httpx"
)

type Server struct {
	mcpServer *mcp.Server
	logger    *slog.Logger
	client    *httpx.RetryingClient
	cfg       *config.Config
}

func New(logger *slog.Logger, cfg *config.Config) *Server {
	impl := &mcp.Implementation{
		Name:    "zeke-bridge",
		Version: "0.1.0",
	}

	s := mcp.NewServer(impl, nil)
	cli := httpx.NewRetryingClient(logger)

	srv := &Server{
		mcpServer: s,
		logger:    logger,
		client:    cli,
		cfg:       cfg,
	}

	// Register tools with typed handlers using top-level AddTool
	mcp.AddTool(s, &mcp.Tool{
		Name:        "zeke_search",
		Description: "High-reliability web search via Z.AI devpack.",
	}, srv.handleSearch)

	mcp.AddTool(s, &mcp.Tool{
		Name:        "zeke_reader",
		Description: "High-reliability web reader via Z.AI devpack.",
	}, srv.handleReader)

	return srv
}

// HandleMCP handles MCP requests via Streamable HTTP
func (s *Server) HandleMCP(w http.ResponseWriter, r *http.Request) {
	// Create handler that returns our server
	handler := mcp.NewStreamableHTTPHandler(func(*http.Request) *mcp.Server {
		return s.mcpServer
	}, nil)
	handler.ServeHTTP(w, r)
}
