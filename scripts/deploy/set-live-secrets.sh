#!/usr/bin/env bash
#
# One-shot secrets injector for the bozzies.org deploy. The owner runs this
# on their Mac after Claude's deploy has written wp-config.php on the
# server with REPLACE_WITH_* placeholders. It prompts (hidden input) for
# three secrets, pushes the DB + SMTP values into the live wp-config.php,
# and sets the live keith admin account password through WP-CLI.
#
# Passwords are never echoed, logged, written to disk, or passed on the
# ssh command line. They always travel through stdin to a small PHP
# helper on the server, which does the file edit (for wp-config) or the
# wp_set_password() call (for keith). Using PHP for the file edit avoids
# sed escaping gymnastics when the password contains /, \, &, newline,
# or a quote.
#
# The script is idempotent and state-aware: on each run it probes the
# server to see which placeholders are still present and whether the
# keith user exists yet. It prompts only for the pieces that still need
# doing. The expected two-pass sequence is:
#
#   1. First run — right after Claude writes wp-config.php. DB and SMTP
#      placeholders get filled in. The keith user does not exist yet
#      (database not imported), so the admin-password prompt is skipped
#      and a note is printed.
#   2. Claude imports the database.
#   3. Second run — only the admin-password step prompts, since the
#      wp-config placeholders are already filled.
#
# Usage:
#   bash scripts/deploy/set-live-secrets.sh
#
# Env overrides:
#   SSH_HOST  SSH destination (default: khalboz@bozzies.org)
#   WP_PATH   WordPress install path on the server
#             (default: /home/khalboz/bozzies.org)

set -euo pipefail

SSH_HOST="${SSH_HOST:-khalboz@bozzies.org}"
WP_PATH="${WP_PATH:-/home/khalboz/bozzies.org}"

die() { echo "ERROR: $*" >&2; exit 1; }

# `read -s` suppresses the password echo. The prompt itself goes to
# stderr so if the caller is capturing stdout the prompt doesn't pollute
# the capture. REPLY is set with the password; caller moves it into a
# local variable immediately.
prompt_hidden() {
	local label="$1"
	local pw=""
	while [ -z "$pw" ]; do
		printf '%s: ' "$label" >&2
		IFS= read -r -s pw
		printf '\n' >&2
		if [ -z "$pw" ]; then
			echo "  (empty — try again)" >&2
		fi
	done
	REPLY="$pw"
}

# --- Probe server state ---------------------------------------------------
echo "Probing $SSH_HOST ..."
STATUS=$(ssh -o BatchMode=yes "$SSH_HOST" "
cd '$WP_PATH' 2>/dev/null || { echo FAIL=1; exit 0; }
test -f wp-config.php || { echo FAIL=1; exit 0; }
if grep -q 'REPLACE_WITH_DB_PASSWORD'   wp-config.php; then echo DB=todo;   else echo DB=done;   fi
if grep -q 'REPLACE_WITH_SMTP_PASSWORD' wp-config.php; then echo SMTP=todo; else echo SMTP=done; fi
# wp user get needs DB creds. If DB password is still placeholder, treat
# keith as unknown and skip the admin prompt until DB is wired up.
if grep -q 'REPLACE_WITH_DB_PASSWORD' wp-config.php; then
    echo KEITH=unknown
elif wp user get keith --field=ID --path='$WP_PATH' --skip-plugins --skip-themes >/dev/null 2>&1; then
    echo KEITH=present
else
    echo KEITH=missing
fi
" 2>/dev/null) || die "ssh to $SSH_HOST failed"

eval "$STATUS"
if [ "${FAIL:-0}" = "1" ]; then
	die "server state unreadable — is $WP_PATH/wp-config.php in place?"
fi

echo "  DB placeholder:   $DB"
echo "  SMTP placeholder: $SMTP"
echo "  keith user:       $KEITH"
echo

if [ "$DB" = "done" ] && [ "$SMTP" = "done" ] && [ "$KEITH" = "present" ]; then
	# All three slots already filled on previous runs. The script was
	# re-run with nothing to do — print and exit 0 so re-invocation is
	# harmless.
	:
elif [ "$DB" = "done" ] && [ "$SMTP" = "done" ] && [ "$KEITH" = "missing" ]; then
	echo "keith user not found on the live DB. Was the database imported?"
	echo "If import is still pending, let Claude continue; if it has run,"
	echo "the keith user may be under a different login — check with wp"
	echo "user list on the server."
	exit 1
fi

# --- Collect secrets, one prompt per outstanding slot ---------------------
DB_PW=""
SMTP_PW=""
ADMIN_PW=""

if [ "$DB" = "todo" ]; then
	prompt_hidden "DreamHost DB password (user bozzies_wp_user)"
	DB_PW="$REPLY"
fi
if [ "$SMTP" = "todo" ]; then
	prompt_hidden "SMTP password (contact@bozzies.org DreamHost mailbox)"
	SMTP_PW="$REPLY"
fi
if [ "$KEITH" = "present" ]; then
	prompt_hidden "New password for live keith admin account"
	ADMIN_PW="$REPLY"
elif [ "$KEITH" = "unknown" ]; then
	echo "keith lookup deferred (DB password still a placeholder); the"
	echo "admin-password prompt will run on the next pass, after the DB"
	echo "import. For now this run will inject DB + SMTP only."
	echo
fi

# --- Upload a one-shot PHP helper -----------------------------------------
# The helper lives in /home/khalboz/ (NOT under the web root) for the
# duration of this run and is removed by the EXIT trap. It takes two
# commands:
#
#   php helper.php replace-marker <MARKER_SUFFIX> <WP_CONFIG_PATH>
#       → reads password from stdin, replaces REPLACE_WITH_<MARKER_SUFFIX>
#         in the given file. No-op if the marker is already gone.
#
#   php helper.php set-admin-password <WP_PATH>
#       → loads WordPress, reads password from stdin, calls
#         wp_set_password() for the keith user.
HELPER_SRC="$(mktemp -t bzh.XXXXXX.php)"
# shellcheck disable=SC2064
trap "rm -f '$HELPER_SRC'; ssh -o BatchMode=yes '$SSH_HOST' 'rm -f ~/.bozzies-set-live-secrets.php' 2>/dev/null || true" EXIT

cat > "$HELPER_SRC" <<'PHP'
<?php
// Owner-side secrets helper — uploaded by scripts/deploy/set-live-secrets.sh,
// deleted on script exit. Receives one secret via stdin, writes it to the
// right place, prints a one-line status to stdout.

$cmd = $argv[1] ?? '';

if ( 'replace-marker' === $cmd ) {
	$suffix = $argv[2] ?? '';
	$path   = $argv[3] ?? '';
	if ( '' === $suffix || '' === $path ) {
		fwrite( STDERR, "usage: replace-marker <SUFFIX> <WP_CONFIG>\n" );
		exit( 2 );
	}
	$marker = 'REPLACE_WITH_' . $suffix;
	$pw     = stream_get_contents( STDIN );
	if ( '' === $pw ) {
		fwrite( STDERR, "empty password on stdin\n" );
		exit( 3 );
	}
	$cfg = file_get_contents( $path );
	if ( false === $cfg ) {
		fwrite( STDERR, "cannot read $path\n" );
		exit( 4 );
	}
	if ( false === strpos( $cfg, $marker ) ) {
		echo "marker $marker already replaced\n";
		exit( 0 );
	}
	// Rewrite in place; file ownership stays with khalboz.
	file_put_contents( $path, str_replace( $marker, $pw, $cfg ) );
	echo "replaced $marker\n";
	exit( 0 );
}

if ( 'set-admin-password' === $cmd ) {
	$wp_path = $argv[2] ?? '';
	if ( '' === $wp_path ) {
		fwrite( STDERR, "usage: set-admin-password <WP_PATH>\n" );
		exit( 2 );
	}
	// Fake a web environment so wp-load doesn't short-circuit on CLI.
	// WP's bootstrap is happy as long as HTTP_HOST is non-empty.
	$_SERVER['HTTP_HOST']   = 'bozzies.org';
	$_SERVER['REQUEST_URI'] = '/';
	define( 'WP_USE_THEMES', false );
	require $wp_path . '/wp-load.php';
	$u = get_user_by( 'login', 'keith' );
	if ( ! $u ) {
		fwrite( STDERR, "keith user not found\n" );
		exit( 1 );
	}
	$pw = stream_get_contents( STDIN );
	if ( '' === $pw ) {
		fwrite( STDERR, "empty admin password on stdin\n" );
		exit( 3 );
	}
	wp_set_password( $pw, $u->ID );
	echo "admin password updated for user keith (ID {$u->ID})\n";
	exit( 0 );
}

fwrite( STDERR, "unknown command: $cmd\n" );
exit( 2 );
PHP

# Push helper to server (lives outside web root).
scp -q "$HELPER_SRC" "$SSH_HOST:~/.bozzies-set-live-secrets.php"
ssh -o BatchMode=yes "$SSH_HOST" "chmod 600 ~/.bozzies-set-live-secrets.php"

# --- Inject each secret ---------------------------------------------------
if [ -n "$DB_PW" ]; then
	printf '%s' "$DB_PW" | ssh "$SSH_HOST" \
		"php ~/.bozzies-set-live-secrets.php replace-marker DB_PASSWORD '$WP_PATH/wp-config.php'"
fi

if [ -n "$SMTP_PW" ]; then
	printf '%s' "$SMTP_PW" | ssh "$SSH_HOST" \
		"php ~/.bozzies-set-live-secrets.php replace-marker SMTP_PASSWORD '$WP_PATH/wp-config.php'"
fi

if [ -n "$ADMIN_PW" ]; then
	printf '%s' "$ADMIN_PW" | ssh "$SSH_HOST" \
		"php ~/.bozzies-set-live-secrets.php set-admin-password '$WP_PATH'"
fi

echo
if [ "$KEITH" != "present" ] && [ "$KEITH" != "missing" ]; then
	echo "First pass done — DB + SMTP are in. Tell Claude to continue with"
	echo "the DB import. When the import is finished, re-run this script"
	echo "to set the admin password."
else
	echo "Done."
fi
