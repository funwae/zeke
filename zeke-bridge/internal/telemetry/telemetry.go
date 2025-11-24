package telemetry

import (
	"os"
	"sync"
	"time"

	"golang.org/x/exp/slog"
)

type ErrorEntry struct {
	Timestamp time.Time
	Tool      string
	Endpoint  string
	Status    int
	Error     string
	Body      string
}

type RingBuffer struct {
	mu       sync.RWMutex
	entries  []ErrorEntry
	capacity int
	index    int
}

func NewRingBuffer(capacity int) *RingBuffer {
	return &RingBuffer{
		entries:  make([]ErrorEntry, 0, capacity),
		capacity: capacity,
	}
}

func (rb *RingBuffer) Add(entry ErrorEntry) {
	rb.mu.Lock()
	defer rb.mu.Unlock()

	if len(rb.entries) < rb.capacity {
		rb.entries = append(rb.entries, entry)
	} else {
		rb.entries[rb.index] = entry
		rb.index = (rb.index + 1) % rb.capacity
	}
}

func (rb *RingBuffer) Get() []ErrorEntry {
	rb.mu.RLock()
	defer rb.mu.RUnlock()

	result := make([]ErrorEntry, len(rb.entries))
	copy(result, rb.entries)
	return result
}

func NewLogger(level string) *slog.Logger {
	var logLevel slog.Level
	switch level {
	case "debug":
		logLevel = slog.LevelDebug
	case "warn":
		logLevel = slog.LevelWarn
	case "error":
		logLevel = slog.LevelError
	default:
		logLevel = slog.LevelInfo
	}

	opts := &slog.HandlerOptions{
		Level: logLevel,
	}

	return slog.New(slog.NewTextHandler(os.Stdout, opts))
}

