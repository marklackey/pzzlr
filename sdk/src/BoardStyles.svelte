<script lang="ts">
	// No markup and no props: this component exists only to carry the
	// stylesheet below into whichever widget renders it.
</script>

<style>
	/* The board CSS all four widgets agree on. Like Palette.svelte this has no
	   markup — it exists to put one copy of these rules in each widget's shadow
	   root. The elements they style belong to the widget that renders them, not
	   to this component, which is why the block below is :global; Svelte scopes
	   a component's own rules to its own markup, and there isn't any here.

	   That leaves every widget still able to overrule any of it: Svelte tacks a
	   scoping class onto the widget's own selectors, so `.tile` written in
	   Ladder.svelte outranks the plain `.tile` here no matter which stylesheet
	   the browser saw first. Anything a board wants to say differently — the
	   ladder's dashed given rungs, quordle's smaller tiles — it says at home.

	   Geometry comes from the tokens in Palette.svelte (--tile-max, --row-gap,
	   --tile-border, --tile-radius, --tile-font, --visible-rows) so a widget
	   changes the shape of its board by changing those, not this. */
	:global {
		.board {
			display: flex;
			flex-direction: column;
			gap: var(--row-gap);
			margin-bottom: 1rem;
		}
		/* Off the phone layout there's no host-given height to divide up, so the
		   board would otherwise grow with every guess — to the game's full guess
		   count, or without limit in absurdle — and push the keyboard down with
		   it. Pinning it to exactly --visible-rows rows keeps the keyboard put
		   from first paint and scrolls anything past that. The arithmetic is the
		   rows themselves — tile, its two borders, and the gaps between — so it
		   doesn't depend on whatever the heading above happens to measure. Rows
		   shorter than --tile-max (long words squeeze the tiles) just leave
		   slack: a stable board area, not a snug one. */
		@media (min-width: 481px) {
			.board {
				height: calc(
					var(--visible-rows) * (var(--tile-max) + 2 * var(--tile-border) + var(--row-gap)) -
						var(--row-gap)
				);
				overflow-y: auto;
			}
		}
		/* A revealed board isn't being played on any more, so it has no reason
		   to hold itself to a fixed number of rows — and every reason not to,
		   since the answer is drawn after the last one and a scrollbar is a poor
		   way to announce it. */
		.board.revealed {
			height: auto;
			overflow: visible;
		}
		.row {
			display: flex;
			gap: var(--row-gap);
			width: 100%;
		}
		.tile {
			flex: 1 1 0;
			max-width: var(--tile-max);
			min-width: 0;
			aspect-ratio: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			border: var(--tile-border) solid var(--tile-line);
			border-radius: var(--tile-radius);
			font-weight: 700;
			font-size: var(--tile-font);
		}
		.tile.input {
			border-color: var(--line-strong);
		}
		/* The two verdicts fill; a dead letter does not. A row is read as a
		   pattern at a glance and an outline colours about a sixth of a tile,
		   which on paper was not enough to see the shape of a row — that is
		   what this replaced. Leaving absent tiles as paper is what keeps the
		   board off the solid-grid look and lets the filled ones carry the
		   pattern: they are the most numerous tile on a finished board and
		   have the least to say. */
		.tile.filled.correct {
			background: var(--hit);
			border-color: var(--hit);
			color: var(--hit-ink);
		}
		.tile.filled.present {
			background: var(--present);
			border-color: var(--present);
			color: var(--present-ink);
		}
		.tile.filled.absent {
			border-color: var(--tile-line);
			color: var(--ink-muted);
		}
		/* The answer opens as one circle growing out of the middle of the word,
		   rather than flipping letter by letter, so the whole word arrives as a
		   single shape instead of being spelled out.

		   The circle is a hole in a cover the colour of the board, and the only
		   thing that moves is that cover's transform. Transform and opacity are
		   the two properties a browser animates off the main thread, so the row
		   underneath is painted once and never touched again while the circle
		   grows. clip-path is the obvious way to write this and is what it used
		   to do — but Chrome doesn't hardware-accelerate clip-path yet, so every
		   frame repainted the row's text and rounded tiles, four rows at a time
		   on a quordle, which is exactly where it stuttered. */
		.row.opening {
			position: relative;
			/* Keeps the cover's ring inside the row it belongs to. */
			overflow: hidden;
			/* A flex item only gets an automatic minimum size while its overflow
			   is visible, so the line above hands this row a minimum height of
			   zero — and a board that has filled its own height then flattens it
			   to nothing. This is what keeps the row the height of its tiles. */
			flex-shrink: 0;
		}
		.sweep {
			/* The middle of the word, which is not the middle of the row: a row is
			   as wide as the board, while the word only runs as far as its tiles,
			   and those stop growing at --tile-max. The first half of the min() below
			   is for a row whose tiles have filled it, the second for one they
			   haven't. A tile's cap is on its content box, hence the borders. */
			--word: min(
				100%,
				calc(
					var(--tiles) * (var(--tile-max) + 2 * var(--tile-border)) + (var(--tiles) - 1) *
						var(--row-gap)
				)
			);
			position: absolute;
			top: 50%;
			left: calc(var(--word) / 2);
			width: var(--word);
			aspect-ratio: 1;
			margin: calc(var(--word) / -2) 0 0 calc(var(--word) / -2);
			border-radius: 50%;
			/* The ring that hides the rest of the row. It scales along with the
			   hole, so its width here and the starting scale below together decide
			   how much is still covered on the first frame: 8000 × 0.08 is 640px
			   out from a hole a fifth of a tile wide, which buries any row the
			   board can produce. Bigger numbers only hand the compositor a bigger
			   layer to carry. */
			box-shadow: 0 0 0 8000px var(--bg);
			animation: sweep-open 1000ms cubic-bezier(0.4, 0, 0.2, 1) var(--delay, 0ms) both;
			pointer-events: none;
		}
		@media (prefers-reduced-motion: reduce) {
			.sweep {
				animation: none;
				transform: scale(1.15);
			}
		}
		/* The buttons that aren't keys — copy your result, play again — are the
		   site's buttons rather than the keyboard's: the nav bar's pill (.btn
		   in app.css, sized by .btn-sm in +layout.svelte), at its padding, size
		   and weight, in sentence case. They used to be keys with longer
		   labels — the keyboard's rounded square, its uppercase, its weight —
		   which is a leftover from inheriting the key rule, not a choice.

		   The shape is what separates them from the game. Tiles and keys are
		   rounded squares, so a button drawn as one more rounded square under
		   a finished board reads as part of the board; a pill doesn't. It is
		   also the one shape every button on the site now has, so the button
		   that ends a game looks like the one that started it. */
		.copy,
		.again {
			border: 1px solid transparent;
			box-sizing: border-box;
			border-radius: 999px;
			padding: 0.65rem 1.25rem;
			font: inherit;
			font-size: 1rem;
			font-weight: 600;
			/* The site's body line-height, which is what sizes its buttons —
			   this is the line box, not a spacing choice, and matching it is
			   what makes these the nav's buttons in height as well as shape. */
			line-height: 1.6;
			cursor: pointer;
			transition:
				background 0.15s,
				border-color 0.15s;
			/* Carried over from the key rule these used to inherit rather than
			   dropped on the way out: a two-word label that no longer fits is
			   clipped, not wrapped onto a second line that would change the
			   button's height. */
			overflow: hidden;
			white-space: nowrap;
		}
		/* Primary: see --primary in Palette.svelte for why it is ink and not
		   one of the board's colours. */
		.copy {
			background: var(--primary);
			color: var(--primary-ink);
		}
		.copy:hover {
			background: var(--primary-hover);
		}
		/* Secondary, the way the site's .btn-secondary is: unfilled, with an
		   edge. The edge is --line-strong rather than the faint --line because
		   a control boundary has to clear 3:1 to be seen as one, and this
		   button has nothing but its edge to say it is a button. */
		.again {
			background: transparent;
			border-color: var(--line-strong);
			color: var(--ink);
		}
		.again:hover {
			background: var(--line);
		}
		/* Phone: the page scrolls as one and the keyboard sticks to the bottom
		   of it (see Keyboard.svelte), so the board gives up what height it can
		   — the two at full size were taller than a phone screen between them.
		   Tile size and row gap give up theirs through the tokens in
		   Palette.svelte. */
		@media (max-width: 480px) {
			.board {
				margin-bottom: 0.6rem;
			}
		}
	}
	/* Named globally so the rule above can reach it: Svelte hashes a
	   component's keyframes along with its selectors, and the elements this
	   one animates live in another component's markup. */
	@keyframes -global-sweep-open {
		from {
			/* A dot rather than nothing, so the ring above still has some
			   width to hide the row with on the first frame. */
			transform: scale(0.08);
		}
		to {
			/* Past 1, so the hole clears the corners of the run of tiles
			   instead of stopping just short of the first and last letters. */
			transform: scale(1.15);
		}
	}
</style>
