package mcpserver

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"glm-mcp-adapter/internal/httpx"
)

type ReaderArgs struct {
	URL string `json:"url"`
}

type ReaderOutput struct {
	Content string `json:"content"`
}

func (s *Server) handleReader(
	ctx context.Context,
	req *mcp.CallToolRequest,
	input ReaderArgs,
) (*mcp.CallToolResult, ReaderOutput, error) {
	if input.URL == "" {
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				&mcp.TextContent{Text: "url is required"},
			},
		}, ReaderOutput{}, nil
	}

	body := map[string]any{
		"url": input.URL,
	}

	buf, err := json.Marshal(body)
	if err != nil {
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				&mcp.TextContent{Text: "failed to marshal request"},
			},
		}, ReaderOutput{}, nil
	}

	httpReq, err := httpx.NewRequest(ctx, http.MethodPost, s.cfg.ZaiReaderURL, buf)
	if err != nil {
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				&mcp.TextContent{Text: "failed to create request"},
			},
		}, ReaderOutput{}, nil
	}

	httpReq.Header.Set("Authorization", "Bearer "+s.cfg.ZAIAPIKey)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json, text/event-stream")

	resp, err := s.client.Do(ctx, httpReq)
	if err != nil {
		s.logger.Error("reader upstream failed", "error", err)
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				&mcp.TextContent{Text: "web reader upstream failed: " + err.Error()},
			},
		}, ReaderOutput{}, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := httpx.ReadBody(resp)
		s.logger.Error("reader upstream error",
			"status", resp.StatusCode,
			"body", string(bodyBytes),
		)
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				&mcp.TextContent{Text: fmt.Sprintf("upstream returned status %d", resp.StatusCode)},
			},
		}, ReaderOutput{}, nil
	}

	bodyBytes, err := httpx.ReadBody(resp)
	if err != nil {
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				&mcp.TextContent{Text: "failed to read response"},
			},
		}, ReaderOutput{}, nil
	}

	var parsed any
	if err := json.Unmarshal(bodyBytes, &parsed); err != nil {
		resultText := string(bodyBytes)
		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: resultText},
			},
		}, ReaderOutput{Content: resultText}, nil
	}

	resultText := formatReaderResults(parsed)

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			&mcp.TextContent{Text: resultText},
		},
	}, ReaderOutput{Content: resultText}, nil
}

func formatReaderResults(data any) string {
	buf, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Sprintf("Reader results: %v", data)
	}
	return "Reader results:\n" + string(buf)
}

