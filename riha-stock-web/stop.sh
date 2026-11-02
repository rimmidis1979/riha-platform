#!/bin/bash
if [ -f .pid ]; then
  PID=$(cat .pid)
  echo "Stopping riha-stock-web (PID: $PID)..."
  kill $PID 2>/dev/null || true
  rm -f .pid
  echo "riha-stock-web stopped."
else
  pkill -f "vite.*5175" || true
  echo "No .pid file found, killed any running 5175 vite processes."
fi
