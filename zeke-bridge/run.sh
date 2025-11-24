#!/bin/bash
# Run zeke-bridge service

export Z_AI_API_KEY=${Z_AI_API_KEY:-$(grep Z_AI_API_KEY ../.env.local 2>/dev/null | cut -d '=' -f2)}
export PORT=${PORT:-8081}

if [ -z "$Z_AI_API_KEY" ]; then
    echo "Error: Z_AI_API_KEY is required"
    echo "Set it in .env.local or export Z_AI_API_KEY=your_key"
    exit 1
fi

echo "Starting zeke-bridge on port $PORT..."
go run cmd/zeke-bridge/main.go

