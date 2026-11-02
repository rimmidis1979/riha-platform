#!/bin/bash
if [ -f .pid ]; then
  PID=$(cat .pid)
  if ps -p $PID > /dev/null 2>&1; then
    echo "riha-stock-web is RUNNING (PID: $PID) at http://localhost:5175"
    exit 0
  fi
fi

if pgrep -f "vite.*5175" > /dev/null 2>&1; then
  echo "riha-stock-web is RUNNING on port 5175"
  exit 0
else
  echo "riha-stock-web is STOPPED"
  exit 1
fi
