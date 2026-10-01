<?php
/**
 * Owner-role capability tweaks.
 *
 * The site owner is an Editor in production. A couple of plugins we ship
 * with gate common owner-facing screens on admin-only capabilities;
 * remap just those meta-caps here so the owner can do their day-to-day
 * work without an admin account.
 *
 * Related:
 *   - inc/settings.php — "Bozzies" settings screen (Donate URL), already
 *     scoped to `edit_pages` which Editors have.
 *   - CLAUDE.md pre-launch checklist — the policy decision to run the
 *     site under an Editor account.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Flamingo caps.
 *
 * Flamingo's `includes/capabilities.php` maps every meta-cap to
 * `edit_users` (admin-only). Editors should be able to open the "Inbound
 * Messages" screen (which is where CF7 submissions land) so they can
 * read messages from the contact form. The narrowest cut: remap only
 * the two read-level caps that gate the list screen and the per-message
 * view. Delete / spam / unspam / options stay on Flamingo's default
 * `edit_users`, so clearing or bulk-managing submissions still requires
 * admin.
 *
 * WordPress's `admin_menu` handling fills in the top-level menu with the
 * first submenu the user has access to, so Editors see "Flamingo →
 * Inbound Messages" without us touching the top-level menu's own
 * `flamingo_edit_contacts` cap (which stays admin-only — the Address
 * Book stays admin-only).
 */
add_filter( 'flamingo_map_meta_cap', 'bozzies_flamingo_editor_access' );
function bozzies_flamingo_editor_access( $meta_caps ) {
	$meta_caps['flamingo_edit_inbound_messages'] = 'edit_pages';
	$meta_caps['flamingo_edit_inbound_message']  = 'edit_pages';
	return $meta_caps;
}
