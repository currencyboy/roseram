#!/bin/sh
# Development server wrapper that respects PORT environment variable
PORT=${PORT:-3001}
echo "Starting Next.js dev server on 0.0.0.0:$PORT"
exec next dev -p "$PORT" -H 0.0.0.0
