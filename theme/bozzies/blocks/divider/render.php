<?php
/**
 * Server-side render for bozzies/divider.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/components/SectionDivider.astro lines 19-253:
 *
 *   <div class="divider" role="presentation" style="color:${colorVar}">
 *     <span class="divider__line"></span>
 *     [optional <div class="divider__ornament-wrap">
 *       <svg class="divider__ornament [--wide|--jazz]">…variant-specific…</svg>
 *     </div>]
 *     <span class="divider__line"></span>
 *   </div>
 *
 * All 11 variants + 4 colors are supported; the live site uses jazz + purple
 * everywhere.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'variant' => 'jazz',
		'color'   => 'purple',
	)
);

$variant_allowed = array( 'line', 'jazz', 'second-line', 'bar-line', 'fan', 'step', 'rays', 'fleur', 'deco', 'notes', 'diamond' );
$variant         = in_array( $attrs['variant'], $variant_allowed, true ) ? $attrs['variant'] : 'jazz';
$color_allowed   = array( 'brass', 'purple', 'yellow', 'copper' );
$color           = in_array( $attrs['color'], $color_allowed, true ) ? $attrs['color'] : 'purple';

// Verbatim from SectionDivider.astro L12-17.
$color_vars = array(
	'brass'  => 'var(--brass)',
	'purple' => 'var(--purple)',
	'yellow' => 'var(--yellow)',
	'copper' => 'var(--copper)',
);
$color_var = $color_vars[ $color ];

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';
$align_cls = ( isset( $attributes['align'] ) && $attributes['align'] ) ? ' align' . esc_attr( $attributes['align'] ) : '';
?>
<div<?php echo $anchor; ?> class="divider<?php echo $extra_cls . $align_cls; ?>" role="presentation" style="color:<?php echo esc_attr( $color_var ); ?>">
	<span class="divider__line"></span>
<?php if ( 'line' !== $variant ) : ?>
	<div class="divider__ornament-wrap">
<?php if ( 'fan' === $variant ) : ?>
		<svg class="divider__ornament" viewBox="0 0 40 20" aria-hidden="true">
			<g fill="none" stroke="currentColor" stroke-width="0.7">
				<path d="M20 20 L20 4"/>
				<path d="M20 20 L8 6"/>
				<path d="M20 20 L32 6"/>
				<path d="M20 20 L2 14"/>
				<path d="M20 20 L38 14"/>
				<circle cx="20" cy="20" r="1.2" fill="currentColor" stroke="none"/>
			</g>
		</svg>
<?php elseif ( 'step' === $variant ) : ?>
		<svg class="divider__ornament" viewBox="0 0 60 16" aria-hidden="true">
			<g fill="none" stroke="currentColor" stroke-width="0.8">
				<path d="M0 8 L18 8 L22 4 L38 4 L42 8 L60 8"/>
				<path d="M22 4 L22 12 M38 4 L38 12" opacity="0.55"/>
				<circle cx="30" cy="8" r="1.2" fill="currentColor" stroke="none"/>
			</g>
		</svg>
<?php elseif ( 'rays' === $variant ) : ?>
		<svg class="divider__ornament divider__ornament--wide" viewBox="0 0 90 24" aria-hidden="true">
			<g fill="none" stroke="currentColor" stroke-width="0.6">
				<circle cx="45" cy="12" r="5.2"/>
				<path d="M45 12 L45 0 M45 12 L45 24 M45 12 L34 12 M45 12 L56 12"/>
				<path d="M45 12 L37 4 M45 12 L53 4 M45 12 L37 20 M45 12 L53 20" opacity="0.7"/>
				<path d="M0 12 L28 12 M62 12 L90 12" opacity="0.35"/>
			</g>
		</svg>
<?php elseif ( 'fleur' === $variant ) : ?>
		<svg class="divider__ornament divider__ornament--wide" viewBox="0 0 120 40" aria-hidden="true">
			<g fill="none" stroke="currentColor" stroke-width="0.8">
				<line x1="0" y1="20" x2="42" y2="20"/>
				<line x1="78" y1="20" x2="120" y2="20"/>
				<g transform="translate(60 20)">
					<path d="M0 -14 C 4 -8, 3 -3, 0 0 C -3 -3, -4 -8, 0 -14 Z"/>
					<path d="M0 0 C 8 -6, 12 -2, 9 6 C 6 3, 3 1, 0 -1"/>
					<path d="M0 0 C -8 -6, -12 -2, -9 6 C -6 3, -3 1, 0 -1"/>
					<line x1="-10" y1="6" x2="10" y2="6"/>
					<line x1="0" y1="6" x2="0" y2="14"/>
					<line x1="-5" y1="11" x2="5" y2="11"/>
				</g>
			</g>
		</svg>
<?php elseif ( 'deco' === $variant ) : ?>
		<svg class="divider__ornament divider__ornament--wide" viewBox="0 0 160 32" aria-hidden="true">
			<g fill="none" stroke="currentColor" stroke-width="0.75">
				<path d="M0 16 L34 16"/>
				<path d="M34 16 L42 8 L50 16 L42 24 Z" fill="none"/>
				<path d="M46 8 L54 16 L46 24" opacity="0.55"/>
				<path d="M42 4 L42 28" opacity="0.4"/>
				<g transform="translate(80 16)">
					<path d="M0 -12 L0 12" opacity="0.5"/>
					<circle cx="0" cy="0" r="6"/>
					<path d="M0 -12 L6 -6 M0 -12 L-6 -6 M0 12 L6 6 M0 12 L-6 6"/>
					<path d="M-12 0 L-6 -6 M-12 0 L-6 6 M12 0 L6 -6 M12 0 L6 6" opacity="0.7"/>
					<circle cx="0" cy="0" r="1.4" fill="currentColor" stroke="none"/>
				</g>
				<path d="M118 8 L110 16 L118 24 Z"/>
				<path d="M114 8 L106 16 L114 24" opacity="0.55"/>
				<path d="M118 4 L118 28" opacity="0.4"/>
				<path d="M126 16 L160 16"/>
			</g>
		</svg>
<?php elseif ( 'notes' === $variant ) : ?>
		<svg class="divider__ornament divider__ornament--wide" viewBox="0 0 140 32" aria-hidden="true">
			<g fill="none" stroke="currentColor" stroke-width="0.55">
				<line x1="30" y1="10" x2="110" y2="10"/>
				<line x1="30" y1="14" x2="110" y2="14"/>
				<line x1="30" y1="18" x2="110" y2="18"/>
				<line x1="30" y1="22" x2="110" y2="22"/>
				<line x1="30" y1="26" x2="110" y2="26"/>
				<line x1="30" y1="8" x2="30" y2="28"/>
				<line x1="110" y1="8" x2="110" y2="28"/>
				<ellipse cx="52" cy="22" rx="3.6" ry="2.6" transform="rotate(-18 52 22)" fill="currentColor" stroke="none"/>
				<ellipse cx="68" cy="18" rx="3.6" ry="2.6" transform="rotate(-18 68 18)" fill="currentColor" stroke="none"/>
				<line x1="55" y1="20" x2="55" y2="6" stroke-width="0.7"/>
				<line x1="71" y1="16" x2="71" y2="4" stroke-width="0.7"/>
				<line x1="55" y1="6" x2="72" y2="4" stroke-width="1.6"/>
				<ellipse cx="90" cy="16" rx="3.6" ry="2.6" transform="rotate(-18 90 16)" fill="currentColor" stroke="none"/>
				<line x1="93" y1="14" x2="93" y2="2" stroke-width="0.7"/>
				<line x1="0" y1="18" x2="24" y2="18" opacity="0.55"/>
				<line x1="116" y1="18" x2="140" y2="18" opacity="0.55"/>
			</g>
		</svg>
<?php elseif ( 'diamond' === $variant ) : ?>
		<svg class="divider__ornament" viewBox="0 0 40 20" aria-hidden="true">
			<g fill="none" stroke="currentColor" stroke-width="0.7">
				<path d="M4 10 L20 2 L36 10 L20 18 Z"/>
				<path d="M20 6 L20 14" opacity="0.5"/>
				<circle cx="20" cy="10" r="1.4" fill="currentColor" stroke="none"/>
			</g>
		</svg>
<?php elseif ( 'jazz' === $variant ) : ?>
		<svg class="divider__ornament divider__ornament--jazz" viewBox="0 0 320 44" aria-hidden="true">
			<g fill="none" stroke="currentColor" stroke-width="0.7">
				<line x1="0" y1="12" x2="320" y2="12"/>
				<line x1="0" y1="18" x2="320" y2="18"/>
				<line x1="0" y1="24" x2="320" y2="24"/>
				<line x1="0" y1="30" x2="320" y2="30"/>
				<line x1="0" y1="36" x2="320" y2="36"/>

				<g transform="translate(10 0)" stroke-width="1">
					<path d="M14 6 C 4 14, 4 26, 14 34 C 22 40, 30 34, 26 26 C 22 20, 12 22, 12 30 C 12 40, 24 44, 28 32
					         M20 40 L20 10 C 20 4, 12 2, 10 8"/>
					<circle cx="20" cy="40" r="1.6" fill="currentColor" stroke="none"/>
				</g>

				<g transform="translate(46 14)" font-family="serif" font-size="12" fill="currentColor" stroke="none">
					<text x="0" y="7" text-anchor="middle" font-weight="600">4</text>
					<text x="0" y="18" text-anchor="middle" font-weight="600">4</text>
				</g>

				<g stroke-width="0.9">
					<ellipse cx="78" cy="30" rx="4" ry="2.8" transform="rotate(-18 78 30)" fill="currentColor" stroke="none"/>
					<ellipse cx="98" cy="24" rx="4" ry="2.8" transform="rotate(-18 98 24)" fill="currentColor" stroke="none"/>
					<line x1="81" y1="28" x2="81" y2="8"/>
					<line x1="101" y1="22" x2="101" y2="6"/>
					<line x1="80" y1="8" x2="102" y2="6" stroke-width="2.4"/>
				</g>

				<ellipse cx="128" cy="30" rx="4" ry="2.8" transform="rotate(-18 128 30)" fill="currentColor" stroke="none"/>
				<line x1="131" y1="28" x2="131" y2="10" stroke-width="0.9"/>

				<ellipse cx="156" cy="24" rx="4.2" ry="3" transform="rotate(-18 156 24)"/>
				<line x1="160" y1="22" x2="160" y2="4" stroke-width="0.9"/>

				<line x1="180" y1="12" x2="180" y2="36" stroke-width="0.9"/>

				<g stroke-width="0.9">
					<ellipse cx="200" cy="28" rx="4" ry="2.8" transform="rotate(-18 200 28)" fill="currentColor" stroke="none"/>
					<ellipse cx="218" cy="26" rx="4" ry="2.8" transform="rotate(-18 218 26)" fill="currentColor" stroke="none"/>
					<line x1="203" y1="26" x2="203" y2="8"/>
					<line x1="221" y1="24" x2="221" y2="6"/>
					<line x1="202" y1="8" x2="222" y2="6" stroke-width="2.4"/>
					<line x1="202" y1="12" x2="222" y2="10" stroke-width="2.2" opacity="0.9"/>
				</g>

				<ellipse cx="248" cy="24" rx="4" ry="2.8" transform="rotate(-18 248 24)" fill="currentColor" stroke="none"/>
				<line x1="251" y1="22" x2="251" y2="4" stroke-width="0.9"/>
				<circle cx="256" cy="24" r="1.1" fill="currentColor" stroke="none"/>

				<line x1="278" y1="12" x2="278" y2="36" stroke-width="0.9"/>
				<line x1="283" y1="12" x2="283" y2="36" stroke-width="1.6"/>
			</g>
		</svg>
<?php elseif ( 'second-line' === $variant ) : ?>
		<svg class="divider__ornament divider__ornament--wide" viewBox="0 0 200 40" aria-hidden="true">
			<g fill="none" stroke="currentColor" stroke-width="0.7">
				<line x1="0" y1="20" x2="68" y2="20"/>
				<line x1="132" y1="20" x2="200" y2="20"/>

				<g transform="translate(100 20)">
					<path d="M-22 0 A 22 22 0 0 1 22 0"/>
					<path d="M-16 0 A 16 16 0 0 1 16 0" opacity="0.7"/>
					<path d="M-8 0 A 8 8 0 0 1 8 0" opacity="0.5"/>
					<line x1="-22" y1="0" x2="-22" y2="3"/>
					<line x1="-14" y1="0" x2="-14" y2="3"/>
					<line x1="0" y1="0" x2="0" y2="3"/>
					<line x1="14" y1="0" x2="14" y2="3"/>
					<line x1="22" y1="0" x2="22" y2="3"/>
					<line x1="0" y1="0" x2="0" y2="16" stroke-width="0.9"/>
					<path d="M-3 16 L 3 16" stroke-width="1.4"/>
					<g transform="translate(0 -4)">
						<path d="M0 -6 C 2 -3, 1.5 -1, 0 0 C -1.5 -1, -2 -3, 0 -6 Z"/>
					</g>
				</g>
			</g>
		</svg>
<?php elseif ( 'bar-line' === $variant ) : ?>
		<svg class="divider__ornament divider__ornament--wide" viewBox="0 0 180 28" aria-hidden="true">
			<g fill="none" stroke="currentColor" stroke-width="0.6">
				<line x1="20" y1="8" x2="160" y2="8"/>
				<line x1="20" y1="12" x2="160" y2="12"/>
				<line x1="20" y1="16" x2="160" y2="16"/>
				<line x1="20" y1="20" x2="160" y2="20"/>
				<line x1="20" y1="24" x2="160" y2="24"/>
				<line x1="20" y1="8" x2="20" y2="24" stroke-width="0.9"/>
				<line x1="24" y1="8" x2="24" y2="24" stroke-width="1.6"/>
				<ellipse cx="70" cy="20" rx="3.2" ry="2.2" transform="rotate(-18 70 20)" fill="currentColor" stroke="none"/>
				<line x1="72.5" y1="19" x2="72.5" y2="6" stroke-width="0.75"/>
				<ellipse cx="110" cy="16" rx="3.2" ry="2.2" transform="rotate(-18 110 16)" fill="currentColor" stroke="none"/>
				<line x1="112.5" y1="15" x2="112.5" y2="2" stroke-width="0.75"/>
				<line x1="156" y1="8" x2="156" y2="24" stroke-width="1.6"/>
				<line x1="160" y1="8" x2="160" y2="24" stroke-width="0.9"/>
			</g>
		</svg>
<?php endif; ?>
	</div>
<?php endif; ?>
	<span class="divider__line"></span>
</div>
