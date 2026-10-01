#!/usr/bin/env bash
set -u
cd ~/boswell-wp || exit 1
LOGDIR=~/boswell-backups/rebuild-logs
mkdir -p "$LOGDIR"
PROMPT_FILE=scripts/dev/rebuild-run-prompt.md
MAX_RUNS=40
NO_PROGRESS=0

for i in $(seq 1 $MAX_RUNS); do
  if [ "$(git branch --show-current)" != "astro-rebuild" ]; then
    echo "Not on astro-rebuild. Stopping."; break
  fi
  if grep -q '^REBUILD-STATUS: DONE' CLAUDE.md; then echo "All done."; break; fi
  if grep -q '^REBUILD-STATUS: BLOCKED' CLAUDE.md; then echo "Blocked. See CLAUDE.md."; break; fi

  BEFORE=$(git rev-parse HEAD)
  LOG="$LOGDIR/run-$(date +%Y%m%d-%H%M%S).log"
  echo "Run $i starting. Log: $LOG"
  claude -p "$(cat "$PROMPT_FILE")" --dangerously-skip-permissions > "$LOG" 2>&1
  AFTER=$(git rev-parse HEAD)

  if [ "$BEFORE" = "$AFTER" ]; then
    NO_PROGRESS=$((NO_PROGRESS+1))
    echo "Run $i made no commit ($NO_PROGRESS in a row)."
    if [ "$NO_PROGRESS" -ge 2 ]; then echo "Stopping: two runs with no progress."; break; fi
  else
    NO_PROGRESS=0
    git log -1 --oneline
  fi
done
