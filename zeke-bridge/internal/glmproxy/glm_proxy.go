package glmproxy

import (
	"encoding/json"
	"io"
	"net/http"

	"zeke-bridge/internal/httpx"
)

type Proxy struct {
	Client *httpx.RetryingClient
	APIKey string
	BaseURL string
}

func NewProxy(client *httpx.RetryingClient, apiKey, baseURL string) *Proxy {
	return &Proxy{
		Client:  client,
		APIKey:  apiKey,
		BaseURL: baseURL,
	}
}

func (p *Proxy) HandleChatCompletions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var openAIReq map[string]any
	if err := json.NewDecoder(r.Body).Decode(&openAIReq); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	// Normalize model name
	if m, ok := openAIReq["model"].(string); ok {
		if m == "GLM-4.6" || m == "glm-4.6" {
			openAIReq["model"] = "glm-4.6"
		}
	}

	buf, err := json.Marshal(openAIReq)
	if err != nil {
		http.Error(w, "failed to marshal request", http.StatusInternalServerError)
		return
	}

	req, err := httpx.NewRequest(ctx, http.MethodPost, p.BaseURL, buf)
	if err != nil {
		http.Error(w, "failed to create request", http.StatusInternalServerError)
		return
	}

	req.Header.Set("Authorization", "Bearer "+p.APIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.Client.Do(ctx, req)
	if err != nil {
		http.Error(w, "upstream GLM error: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy headers
	for k, v := range resp.Header {
		w.Header()[k] = v
	}
	w.WriteHeader(resp.StatusCode)

	// Stream response body
	_, err = io.Copy(w, resp.Body)
	if err != nil {
		// Log but don't fail - response may have already started
		return
	}
}

