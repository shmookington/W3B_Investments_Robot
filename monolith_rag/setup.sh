#!/bin/bash
# MONOLITH RAG — One-Command Setup
# Usage: ./setup.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "============================================"
echo "  MONOLITH RAG — Setup"  
echo "============================================"
echo ""

# 1. Create virtual environment if it doesn't exist
if [ ! -d "$SCRIPT_DIR/venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv "$SCRIPT_DIR/venv"
    echo "   ✅ Virtual environment created"
else
    echo "📦 Virtual environment already exists"
fi

# 2. Install dependencies
echo ""
echo "📥 Installing dependencies..."
"$SCRIPT_DIR/venv/bin/pip" install -q -r "$SCRIPT_DIR/requirements.txt"
echo "   ✅ Dependencies installed"

# 3. Run the indexer
echo ""
echo "🔧 Indexing all MONOLITH documents..."
"$SCRIPT_DIR/venv/bin/python" "$SCRIPT_DIR/indexer.py" --force
echo ""
echo "============================================"
echo "  ✅ MONOLITH RAG is ready!"
echo ""
echo "  Query example:"
echo "    $SCRIPT_DIR/venv/bin/python $SCRIPT_DIR/query.py \"your question\""
echo ""
echo "  Write to Antigravity brain:"
echo "    $SCRIPT_DIR/venv/bin/python $SCRIPT_DIR/query.py \"your question\" --brain"
echo "============================================"
