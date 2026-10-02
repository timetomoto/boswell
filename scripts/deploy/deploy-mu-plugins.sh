#!/usr/bin/env bash
#
# Push `mu-plugins/*.php` from the repo to the live site at
# `/home/khalboz/bozzies.org/wp-content/mu-plugins/`.
#
# WordPress loads every top-level .php file in `wp-content/mu-plugins/`
# unconditionally on every request. The admin cannot deactivate these
# through the Plugins screen — which is why we use mu-plugins for
# site-wide security hardening: one accidental click shouldn't be able
# to turn protections off.
#
# `deploy-theme.sh` only touches `wp-content/themes/bozzies/`, so a
# separate script handles the mu-plugins folder. Scope stays small on
# both sides.
#
# Usage:
#   bash scripts/deploy/deploy-mu-plugins.sh         # dry-run then prompt
#   bash scripts/deploy/deploy-mu-plugins.sh --yes   # non-interactive
#   bash scripts/deploy/deploy-mu-plugins.sh --dry   # dry-run only
#
# Env overrides:
#   SSH_HOST   SSH destination (default: khalboz@bozzies.org)
#   REMOTE     Remote mu-plugins path
#              (default: /home/khalboz/bozzies.org/wp-content/mu-plugins)

set -euo pipefail

SSH_HOST="${SSH_HOST:-khalboz@bozzies.org}"
REMOTE="${REMOTE:-/home/khalboz/bozzies.org/wp-content/mu-plugins}"
HERE="$(cd "$(dirname "$0")/../.." && pwd)"
LOCAL="$HERE/mu-plugins/"

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
	--exclude '.DS_Store'
	--exclude '*.log'
)

echo "deploying $LOCAL → $SSH_HOST:$REMOTE/"
echo "mode: $MODE"
echo

# Ensure the target dir exists (first-time deploy creates it).
ssh "$SSH_HOST" "mkdir -p '$REMOTE'"

echo "--- dry run ---"
rsync -az --itemize-changes "${RSYNC_EXCLUDES[@]}" \
	"$LOCAL" "$SSH_HOST:$REMOTE/" | head -40

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

# NOTE: no --delete here. If someone ever manually drops a one-off
# mu-plugin on the server (e.g. an emergency patch), a stray deploy
# shouldn't nuke it. Explicit cleanup is a separate conscious step.
echo
echo "--- syncing ---"
rsync -az "${RSYNC_EXCLUDES[@]}" "$LOCAL" "$SSH_HOST:$REMOTE/"

echo
echo "--- remote mu-plugins/ now ---"
ssh "$SSH_HOST" "ls -la '$REMOTE'"
echo
echo "done."
