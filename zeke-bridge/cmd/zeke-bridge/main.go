package main

import (
	"fmt"
	"net/http"

	"zeke-bridge/internal/config"
	"zeke-bridge/internal/glmproxy"
	"zeke-bridge/internal/httpx"
	"zeke-bridge/internal/mcpserver"
	"zeke-bridge/internal/telemetry"
)

func main() {
	cfg := config.Load()
	if cfg.ZAIAPIKey == "" {
		panic("Z_AI_API_KEY is required")
	}

	logger := telemetry.NewLogger(cfg.LogLevel)
	logger.Info("starting zeke-bridge", "port", cfg.Port)

	// Initialize components
	mcpSrv := mcpserver.New(logger, cfg)
	retryClient := httpx.NewRetryingClient(logger)
	glmProxy := glmproxy.NewProxy(retryClient, cfg.ZAIAPIKey, cfg.GLMCodingURL)

	// Setup HTTP routes
	mux := http.NewServeMux()

	// MCP endpoint
	mux.HandleFunc("/mcp", mcpSrv.HandleMCP)

	// GLM proxy endpoint (OpenAI-compatible)
	mux.HandleFunc("/v1/chat/completions", glmProxy.HandleChatCompletions)

	// Health check
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Debug endpoint
	mux.HandleFunc("/debug/last-errors", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("[]")) // Placeholder - implement ring buffer later
	})

	addr := fmt.Sprintf(":%s", cfg.Port)
	logger.Info("zeke-bridge listening", "addr", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		logger.Error("server failed", "error", err)
		panic(err)
	}
}

