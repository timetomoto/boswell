#!/usr/bin/env bash
#
# Push theme changes from the local repo to the live bozzies.org server
# over SSH + rsync.
#
# What ships: `theme/bozzies/` → `/home/khalboz/bozzies.org/wp-content/
# themes/bozzies/`. The excludes are the same set that the first-time
# deploy used, so dev-only artefacts and block source files don't leak
# into production. Nothing outside the theme folder is touched — wp
# core, plugins, uploads, and the database all keep their state.
#
# Usage:
#   bash scripts/deploy/deploy-theme.sh          # dry-run first, then
#                                                # prompt before syncing
#   bash scripts/deploy/deploy-theme.sh --yes    # non-interactive push
#   bash scripts/deploy/deploy-theme.sh --dry    # dry-run only
#
# Env overrides:
#   SSH_HOST   SSH destination (default: khalboz@bozzies.org)
#   REMOTE     Remote theme path
#              (default: /home/khalboz/bozzies.org/wp-content/themes/bozzies)
#
# Deliberate design notes:
#   - `rsync --delete` keeps the server mirror in sync. Files removed
#     locally are removed on the server. This is intentional: no stale
#     block renderers left behind after a cleanup commit.
#   - `--itemize-changes` on the dry-run shows exactly what will move so
#     the owner can eyeball before confirming.
#   - .import-tmp is a working dir for one-shot imports; block/*/src is
#     JSX / SCSS source — the compiled build/ is what render.php and
#     block.json reference, so src/ is dead weight on the server.
#   - .DS_Store, *.log, .git, _tmp*: belt-and-braces to catch anything
#     stray on a dev machine.

set -euo pipefail

SSH_HOST="${SSH_HOST:-khalboz@bozzies.org}"
REMOTE="${REMOTE:-/home/khalboz/bozzies.org/wp-content/themes/bozzies}"
# Resolve the repo root — the script works whether invoked from the
# repo root or from scripts/deploy/.
HERE="$(cd "$(dirname "$0")/../.." && pwd)"
LOCAL="$HERE/theme/bozzies/"

MODE="interactive"
for arg in "$@"; do
	case "$arg" in
		--yes|-y) MODE="yes" ;;
		--dry|--dry-run) MODE="dry" ;;
		-h|--help)
			sed -n '1,/^set -euo/p' "$0" | sed 's/^# \{0,1\}//'
			exit 0
			;;
		*)
			echo "unknown arg: $arg" >&2
			exit 2
			;;
	esac
done

if [ ! -d "$LOCAL" ]; then
	echo "ERROR: $LOCAL not found" >&2
	exit 1
fi

RSYNC_EXCLUDES=(
	--exclude '.import-tmp/'
	--exclude 'blocks/*/src/'
	--exclude 'node_modules/'
	--exclude '.DS_Store'
	--exclude '*.log'
	--exclude '.git/'
	--exclude '_tmp*'
)

echo "deploying $LOCAL → $SSH_HOST:$REMOTE"
echo "mode: $MODE"
echo

# --- Dry run first, every time, so we can show what would change. ------
echo "--- dry run ---"
rsync -az --delete --itemize-changes "${RSYNC_EXCLUDES[@]}" \
	"$LOCAL" "$SSH_HOST:$REMOTE/" | head -60

if [ "$MODE" = "dry" ]; then
	echo
	echo "dry-run complete; no changes pushed."
	exit 0
fi

if [ "$MODE" = "interactive" ]; then
	echo
	read -r -p "Push these changes? [y/N] " ans
	case "$ans" in y|Y|yes|YES) ;; *) echo "aborted."; exit 0 ;; esac
fi

echo
echo "--- syncing ---"
rsync -az --delete "${RSYNC_EXCLUDES[@]}" "$LOCAL" "$SSH_HOST:$REMOTE/"

echo
echo "--- verifying remote theme header ---"
ssh "$SSH_HOST" "head -5 '$REMOTE/style.css'"

echo
echo "done."
