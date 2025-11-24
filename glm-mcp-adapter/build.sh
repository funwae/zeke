#!/bin/bash
set -e

echo "Building GLM MCP Adapter..."

# Build for current platform
go build -o adapter cmd/adapter/main.go

echo "Build complete! Run ./adapter to start the server."

