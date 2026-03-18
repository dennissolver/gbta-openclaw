#!/usr/bin/env bash
set -euo pipefail

echo "Installing dependencies..."
cd apps/frontend && npm install

echo ""
echo "Starting Next.js on :3000..."
npm run dev
