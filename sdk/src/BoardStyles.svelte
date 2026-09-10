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
		/* The buttons that aren't keys — copy your result, play again. They used
		   to inherit this from the on-screen keyboard's own `button` rule, back
		   when the keyboard was written out inside each widget; now that it's a
		   component with its own scope, the look lives here instead. Padding is
		   the reason it can't simply be the key rule: that one's side padding is
		   cut for a single glyph in a ten-across row, which leaves a two-word
		   label pressed against the sides of its own button. Each widget still
		   chooses the fill, next to whatever else it colours. */
		.copy,
		.again {
			border: none;
			box-sizing: border-box;
			border-radius: 9px;
			padding: 0.7rem 1.2rem;
			color: var(--ink);
			text-transform: uppercase;
			font-weight: 700;
			font-size: 1.05rem;
			line-height: 1.15;
			cursor: pointer;
			transition: background 0.1s;
			/* Carried over from the key rule these used to inherit rather than
			   dropped on the way out: a two-word label that no longer fits is
			   clipped, not wrapped onto a second line that would change the
			   button's height. */
			overflow: hidden;
			white-space: nowrap;
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
			.copy,
			.again {
				font-size: 1rem;
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
