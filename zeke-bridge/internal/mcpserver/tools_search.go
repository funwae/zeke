package mcpserver

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"zeke-bridge/internal/httpx"
)

type SearchArgs struct {
	Query string `json:"query"`
	Lang  string `json:"lang,omitempty"`
}

type SearchOutput struct {
	Results string `json:"results"`
}

func (s *Server) handleSearch(
	ctx context.Context,
	req *mcp.CallToolRequest,
	input SearchArgs,
) (*mcp.CallToolResult, SearchOutput, error) {
	if input.Query == "" {
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				&mcp.TextContent{Text: "query is required"},
			},
		}, SearchOutput{}, nil
	}

	body := map[string]any{
		"query": input.Query,
	}
	if input.Lang != "" {
		body["lang"] = input.Lang
	}

	buf, err := json.Marshal(body)
	if err != nil {
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				&mcp.TextContent{Text: "failed to marshal request"},
			},
		}, SearchOutput{}, nil
	}

	httpReq, err := httpx.NewRequest(ctx, http.MethodPost, s.cfg.ZaiSearchURL, buf)
	if err != nil {
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				&mcp.TextContent{Text: "failed to create request"},
			},
		}, SearchOutput{}, nil
	}

	httpReq.Header.Set("Authorization", "Bearer "+s.cfg.ZAIAPIKey)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json, text/event-stream")

	resp, err := s.client.Do(ctx, httpReq)
	if err != nil {
		s.logger.Error("search upstream failed", "error", err)
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				&mcp.TextContent{Text: "web search upstream failed: " + err.Error()},
			},
		}, SearchOutput{}, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := httpx.ReadBody(resp)
		s.logger.Error("search upstream error",
			"status", resp.StatusCode,
			"body", string(bodyBytes),
		)
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				&mcp.TextContent{Text: fmt.Sprintf("upstream returned status %d", resp.StatusCode)},
			},
		}, SearchOutput{}, nil
	}

	bodyBytes, err := httpx.ReadBody(resp)
	if err != nil {
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				&mcp.TextContent{Text: "failed to read response"},
			},
		}, SearchOutput{}, nil
	}

	var parsed any
	if err := json.Unmarshal(bodyBytes, &parsed); err != nil {
		// If not JSON, return as text
		resultText := string(bodyBytes)
		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: resultText},
			},
		}, SearchOutput{Results: resultText}, nil
	}

	// Format search results
	resultText := formatSearchResults(parsed)

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			&mcp.TextContent{Text: resultText},
		},
	}, SearchOutput{Results: resultText}, nil
}

func formatSearchResults(data any) string {
	buf, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Sprintf("Search results: %v", data)
	}
	return "Search results:\n" + string(buf)
}
