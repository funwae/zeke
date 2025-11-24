package config

import (
	"os"
)

// Config holds the adapter configuration
type Config struct {
	ZAIAPIKey    string
	ZaiSearchURL string
	ZaiReaderURL string
	Port         string
	LogLevel     string
}

// Load reads configuration from environment variables
func Load() *Config {
	return &Config{
		ZAIAPIKey:    getEnv("Z_AI_API_KEY", ""),
		ZaiSearchURL: getEnv("ZAI_MCP_SEARCH_URL", "https://api.z.ai/api/mcp/web_search_prime/mcp"),
		ZaiReaderURL: getEnv("ZAI_MCP_READER_URL", "https://api.z.ai/api/mcp/web_reader/mcp"),
		Port:         getEnv("PORT", "8081"),
		LogLevel:     getEnv("LOG_LEVEL", "info"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

