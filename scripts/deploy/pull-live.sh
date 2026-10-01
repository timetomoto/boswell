#!/usr/bin/env bash
#
# Pull the live bozzies.org site's database and uploads down to local
# wp-env, with every URL rewritten back to http://localhost:8888. The
# live DB and files are never mutated — the dump is generated via
# `wp search-replace --export` which transforms in-memory and writes a
# fresh file.
#
# Why this exists at all: once the owner starts editing live, the live
# database becomes the source of truth. If you need the current content
# locally (to try a fix against real data, or snapshot before a
# migration), pull it down. Pushing local → live after launch would
# clobber the owner's edits — don't.
#
# Usage:
#   bash scripts/deploy/pull-live.sh              # DB + uploads
#   bash scripts/deploy/pull-live.sh --db-only    # skip uploads sync
#   bash scripts/deploy/pull-live.sh --uploads-only  # skip DB
#   bash scripts/deploy/pull-live.sh --no-import  # fetch the SQL file
#                                                 # but don't import
#                                                 # it into local wp-env
#
# Env overrides:
#   SSH_HOST       SSH destination  (default: khalboz@bozzies.org)
#   REMOTE_WP      WP install path  (default: /home/khalboz/bozzies.org)
#   LOCAL_URL      Local site URL   (default: http://localhost:8888)
#   LIVE_URL       Live site URL    (default: https://bozzies.org)
#   BACKUP_DIR     Where the fetched SQL goes
#                  (default: $HOME/boswell-backups)
#   WP_ENV_CTN     Local Docker container name
#                  (default: wp-env-boswell-wp-9ff20da0-wordpress-1)
#
# Prerequisites:
#   - Local wp-env is running (`npm start` from the repo root).
#   - SSH to khalboz@bozzies.org works with key auth.
#   - `docker` is on PATH and the WP container is running.

set -euo pipefail

SSH_HOST="${SSH_HOST:-khalboz@bozzies.org}"
REMOTE_WP="${REMOTE_WP:-/home/khalboz/bozzies.org}"
LOCAL_URL="${LOCAL_URL:-http://localhost:8888}"
LIVE_URL="${LIVE_URL:-https://bozzies.org}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/boswell-backups}"
WP_ENV_CTN="${WP_ENV_CTN:-wp-env-boswell-wp-9ff20da0-wordpress-1}"

DO_DB=1
DO_UPLOADS=1
DO_IMPORT=1
for arg in "$@"; do
	case "$arg" in
		--db-only)     DO_UPLOADS=0 ;;
		--uploads-only) DO_DB=0 ;;
		--no-import)   DO_IMPORT=0 ;;
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

mkdir -p "$BACKUP_DIR"
TS=$(date +%Y-%m-%d-%H%M)

# --- Local safety baseline first ----------------------------------------
# Dump whatever local has right now, in case the import goes sideways and
# we want to roll back the local site.
if [ "$DO_DB" = "1" ] && [ "$DO_IMPORT" = "1" ]; then
	BASELINE="$BACKUP_DIR/local-before-pull-$TS.sql"
	echo "--- snapshotting local DB → $BASELINE ---"
	npx wp-env run cli --env-cwd=/var/www/html wp db export - 2>/dev/null \
		| grep -v '^ℹ\|^✔\|^⚠' > "$BASELINE"
fi

# --- Pull the DB -------------------------------------------------------
if [ "$DO_DB" = "1" ]; then
	FETCHED="$BACKUP_DIR/live-pull-$TS.sql"
	REMOTE_TMP="/home/$(ssh "$SSH_HOST" 'whoami' | tr -d '\r')/.live-pull-$$.sql"
	echo "--- exporting live DB via wp search-replace --export (URL rewritten to $LOCAL_URL) ---"
	ssh "$SSH_HOST" "cd '$REMOTE_WP' && \
		wp search-replace '$LIVE_URL' '$LOCAL_URL' \
			--export=$REMOTE_TMP \
			--all-tables --precise --recurse-objects --skip-columns=guid > /dev/null && \
		echo OK"
	echo "--- fetching to $FETCHED ---"
	scp -q "$SSH_HOST:$REMOTE_TMP" "$FETCHED"
	ssh "$SSH_HOST" "rm -f $REMOTE_TMP"

	# Second pass locally on the fetched SQL for any leftover forms. The
	# live DB stores the new prefix (wpboz_); local uses wp_. Rewrite
	# backtick-wrapped table refs in the DDL/DML before import. Only
	# anchored patterns + exact backtick wrapping, so no false positives
	# inside row content.
	echo "--- rewriting live prefix (wpboz_) → local prefix (wp_) in SQL ---"
	sed -E -i.bak 's/`wpboz_([a-z_]+)`/`wp_\1`/g' "$FETCHED"
	rm -f "$FETCHED.bak"

	# Prefix-dependent option / usermeta keys also need to flip back.
	# Insert UPDATE statements at the tail of the file so they run after
	# the data is loaded. (Equivalent to the forward rewrite in
	# scripts/import style; this is the reverse direction.)
	cat >> "$FETCHED" <<SQL

-- Rewrite prefix-dependent option/usermeta keys back to the local wp_ prefix.
UPDATE wp_options  SET option_name = REPLACE(option_name, 'wpboz_user_roles', 'wp_user_roles')               WHERE option_name = 'wpboz_user_roles';
UPDATE wp_usermeta SET meta_key    = REPLACE(meta_key, 'wpboz_capabilities', 'wp_capabilities')              WHERE meta_key    = 'wpboz_capabilities';
UPDATE wp_usermeta SET meta_key    = REPLACE(meta_key, 'wpboz_user_level', 'wp_user_level')                  WHERE meta_key    = 'wpboz_user_level';
UPDATE wp_usermeta SET meta_key    = REPLACE(meta_key, 'wpboz_dashboard_quick_press_last_post_id', 'wp_dashboard_quick_press_last_post_id') WHERE meta_key = 'wpboz_dashboard_quick_press_last_post_id';
UPDATE wp_usermeta SET meta_key    = REPLACE(meta_key, 'wpboz_persisted_preferences', 'wp_persisted_preferences') WHERE meta_key = 'wpboz_persisted_preferences';
SQL

	if [ "$DO_IMPORT" = "1" ]; then
		echo "--- importing into local wp-env ---"
		cat "$FETCHED" | npx wp-env run cli --env-cwd=/var/www/html wp db import - 2>&1 | tail -3
		echo "local siteurl now:"
		npx wp-env run cli --env-cwd=/var/www/html wp option get siteurl 2>/dev/null | tail -1
	else
		echo "SQL fetched; skip --no-import, import manually with:"
		echo "    cat $FETCHED | npx wp-env run cli --env-cwd=/var/www/html wp db import -"
	fi
fi

# --- Pull uploads -------------------------------------------------------
if [ "$DO_UPLOADS" = "1" ]; then
	echo "--- streaming uploads from live into container $WP_ENV_CTN ---"
	ssh "$SSH_HOST" "tar -C '$REMOTE_WP/wp-content' -czf - uploads/" \
		| docker exec -i "$WP_ENV_CTN" tar -C /var/www/html/wp-content -xzf -
	docker exec "$WP_ENV_CTN" bash -c 'du -sh /var/www/html/wp-content/uploads/ && find /var/www/html/wp-content/uploads -type f | wc -l'
fi

echo
echo "done."
