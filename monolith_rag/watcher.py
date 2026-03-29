#!/usr/bin/env python3
"""
MONOLITH RAG — Auto-Indexing File Watcher

Watches the docs/ directory for any new or modified .md files.
When a change is detected, waits 5 seconds (debounce) then re-indexes.

Runs in the background. Set it and forget it.

Usage:
    python watcher.py          # Run in foreground
    python watcher.py --daemon # Run in background
"""

import os
import sys
import time
import signal
import subprocess
import argparse
from pathlib import Path
from datetime import datetime

# --- Configuration ---
DOCS_DIR = os.path.join(os.path.dirname(__file__), '..', 'docs')
INDEXER_PATH = os.path.join(os.path.dirname(__file__), 'indexer.py')
PYTHON_PATH = os.path.join(os.path.dirname(__file__), 'venv', 'bin', 'python')
CHECK_INTERVAL = 10     # Check for changes every 10 seconds
DEBOUNCE_SECONDS = 5    # Wait 5 seconds after last change before re-indexing
LOG_FILE = os.path.join(os.path.dirname(__file__), 'watcher.log')

# Track file states
file_states = {}
last_change_time = 0
needs_reindex = False
running = True


def log(message: str):
    """Log with timestamp."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    line = f"[{timestamp}] {message}"
    print(line)
    try:
        with open(LOG_FILE, 'a') as f:
            f.write(line + '\n')
    except Exception:
        pass


def get_file_states(docs_dir: str) -> dict:
    """Get modification times for all markdown files."""
    states = {}
    docs_path = Path(docs_dir).resolve()
    for md_file in docs_path.rglob('*.md'):
        try:
            states[str(md_file)] = md_file.stat().st_mtime
        except Exception:
            pass
    return states


def detect_changes(old_states: dict, new_states: dict) -> list:
    """Find new or modified files."""
    changes = []
    
    # New or modified files
    for path, mtime in new_states.items():
        if path not in old_states:
            changes.append(('NEW', path))
        elif mtime > old_states[path]:
            changes.append(('MODIFIED', path))
    
    # Deleted files
    for path in old_states:
        if path not in new_states:
            changes.append(('DELETED', path))
    
    return changes


def run_indexer():
    """Run the indexer script."""
    log("🔧 Re-indexing documents...")
    try:
        result = subprocess.run(
            [PYTHON_PATH, INDEXER_PATH],
            capture_output=True,
            text=True,
            timeout=120
        )
        if result.returncode == 0:
            # Extract chunk count from output
            for line in result.stdout.split('\n'):
                if 'Total chunks' in line:
                    log(f"   ✅ {line.strip()}")
                    break
            else:
                log("   ✅ Re-index complete")
        else:
            log(f"   ❌ Indexer error: {result.stderr[:200]}")
    except subprocess.TimeoutExpired:
        log("   ❌ Indexer timed out (>120s)")
    except Exception as e:
        log(f"   ❌ Failed to run indexer: {e}")


def handle_shutdown(signum, frame):
    """Graceful shutdown."""
    global running
    log("👋 Watcher shutting down...")
    running = False


def watch_loop():
    """Main watch loop."""
    global file_states, last_change_time, needs_reindex, running
    
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)
    
    docs_path = str(Path(DOCS_DIR).resolve())
    log("=" * 50)
    log("  MONOLITH RAG — File Watcher Started")
    log(f"  Watching: {docs_path}")
    log(f"  Check interval: {CHECK_INTERVAL}s")
    log("=" * 50)
    
    # Initial state
    file_states = get_file_states(DOCS_DIR)
    log(f"📁 Tracking {len(file_states)} markdown files")
    
    while running:
        time.sleep(CHECK_INTERVAL)
        
        # Check for changes
        new_states = get_file_states(DOCS_DIR)
        changes = detect_changes(file_states, new_states)
        
        if changes:
            for change_type, path in changes:
                filename = os.path.basename(path)
                log(f"📝 {change_type}: {filename}")
            
            file_states = new_states
            last_change_time = time.time()
            needs_reindex = True
        
        # Debounced re-index
        if needs_reindex and (time.time() - last_change_time) >= DEBOUNCE_SECONDS:
            run_indexer()
            needs_reindex = False
    
    log("✅ Watcher stopped cleanly")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='MONOLITH RAG File Watcher')
    parser.add_argument('--daemon', action='store_true', 
                        help='Run in background (daemon mode)')
    args = parser.parse_args()
    
    if args.daemon:
        # Fork to background
        pid = os.fork()
        if pid > 0:
            # Parent - write PID file and exit
            pid_file = os.path.join(os.path.dirname(__file__), 'watcher.pid')
            with open(pid_file, 'w') as f:
                f.write(str(pid))
            print(f"🚀 Watcher started in background (PID: {pid})")
            print(f"   Log: {LOG_FILE}")
            print(f"   Stop: kill $(cat {pid_file})")
            sys.exit(0)
        else:
            # Child - run the watcher
            watch_loop()
    else:
        watch_loop()
