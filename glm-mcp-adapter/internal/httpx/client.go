package httpx

import (
	"bytes"
	"context"
	"errors"
	"io"
	"math"
	"net/http"
	"time"

	"golang.org/x/exp/slog"
)

// RetryingClient provides HTTP requests with automatic retry and backoff
type RetryingClient struct {
	Client     *http.Client
	MaxRetries int
	BaseDelay  time.Duration
	Logger     *slog.Logger
}

// NewRetryingClient creates a new retrying HTTP client
func NewRetryingClient(logger *slog.Logger) *RetryingClient {
	return &RetryingClient{
		Client: &http.Client{
			Timeout: 25 * time.Second,
		},
		MaxRetries: 3,
		BaseDelay:  250 * time.Millisecond,
		Logger:     logger,
	}
}

// Do executes an HTTP request with retry logic
func (c *RetryingClient) Do(ctx context.Context, req *http.Request) (*http.Response, error) {
	var lastErr error
	var lastResp *http.Response

	for attempt := 0; attempt <= c.MaxRetries; attempt++ {
		req = req.Clone(ctx)

		// Ensure required headers for Z.AI MCP
		if req.Header.Get("Accept") == "" {
			req.Header.Set("Accept", "application/json, text/event-stream")
		}

		resp, err := c.Client.Do(req)
		if err == nil {
			// Success case
			if resp.StatusCode < 500 && resp.StatusCode != 429 {
				return resp, nil
			}

			// Don't retry on most 4xx except 429
			if resp.StatusCode >= 400 && resp.StatusCode < 500 && resp.StatusCode != 429 {
				return resp, nil
			}

			lastResp = resp
		}

		lastErr = err
		if attempt == c.MaxRetries {
			break
		}

		delay := c.backoff(attempt)
		c.Logger.Warn("retrying upstream request",
			"attempt", attempt+1,
			"max_attempts", c.MaxRetries+1,
			"delay_ms", delay.Milliseconds(),
			"err", err,
			"status", func() int {
				if lastResp != nil {
					return lastResp.StatusCode
				}
				return 0
			}(),
		)

		select {
		case <-time.After(delay):
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}

	if lastErr == nil && lastResp != nil {
		return lastResp, nil
	}

	if lastErr == nil {
		lastErr = errors.New("upstream request failed after retries")
	}
	return nil, lastErr
}

func (c *RetryingClient) backoff(attempt int) time.Duration {
	f := math.Pow(2, float64(attempt))
	jitter := time.Duration(float64(c.BaseDelay) * 0.3)
	return time.Duration(f)*c.BaseDelay + jitter
}

// ReadBody reads and returns the body, replacing it with a new reader
func ReadBody(resp *http.Response) ([]byte, error) {
	if resp.Body == nil {
		return nil, nil
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

// NewRequest creates a new request with proper body handling
func NewRequest(ctx context.Context, method, url string, body []byte) (*http.Request, error) {
	var bodyReader io.Reader
	if body != nil {
		bodyReader = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return nil, err
	}
	return req, nil
}

