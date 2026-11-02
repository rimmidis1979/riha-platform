#!/bin/bash
echo "Starting riha-stock-web on port 5175..."
npm run dev -- --port 5175 &
echo $! > .pid
echo "riha-stock-web started with PID $(cat .pid) on http://localhost:5175"

