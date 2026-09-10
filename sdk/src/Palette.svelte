<script lang="ts">
	// No markup and no props: this component exists only to carry the
	// stylesheet below into whichever widget renders it.
</script>

<style>
	/* Every colour and every piece of row geometry the four widgets agree on,
	   in one place. There is no markup here on purpose: the component exists
	   only to carry this stylesheet. Svelte injects a child component's styles
	   into whatever root it renders into, and each widget is a shadow-DOM
	   custom element, so these rules land inside that widget's own shadow root
	   and apply to its own host element.

	   The one thing a game genuinely picks for itself is its accent, so each
	   widget declares just those four values on its own :host —
	   --accent-light/--accent-hover-light and the dark pair — and the blocks
	   below choose between them. That leaves one copy of the dark palette
	   instead of eight, which is what used to let a colour change land in
	   three widgets and quietly miss the fourth. */
	:host {
		/* Correct is the blue a settled ladder rung wears (--accent-soft in
		   Ladder.svelte): a letter in its final place means the same thing in
		   both games, so it is one colour across all four boards rather than a
		   per-game one. It is a fill only — at 2:1 on paper it cannot be read
		   as text, so --hit-text carries the "solved" line and anything else
		   set in it, the same split --goal-text makes on the ladder. */
		/* Present is the far side of the wheel from correct, not a weaker
		   version of it. Both verdicts used to be blue — a bright fill for
		   correct, a dim one for present — and a board read as one state at two
		   brightnesses: five rows of dim first-column tiles look like a locked
		   in column rather than "this letter is somewhere else". Nothing but
		   lightness told them apart, and lightness is what a fill has already
		   spent on being a fill.

		   Read the two in luminance, not in HSL: an orange at the same nominal
		   lightness as a blue is a good deal brighter to the eye, so matching
		   the numbers would hand the wrong-place tiles the louder colour. The
		   blue is the brighter of the two by about a quarter on paper and by
		   half again on the dark board, and it carries the higher chroma as
		   well — correct is the vivid one and present the quieter, with hue
		   keeping them apart even where brightness would not.

		   These are tile FILLS on the wordle-family boards: a board is read as a
		   pattern at a glance, and an outline puts colour on about a sixth of a
		   tile, which was not enough to see the shape of a row on paper. Both
		   fills are bright enough to need a dark label rather than --bg. */
		--hit: #42caff;
		--hit-ink: #062441;
		--hit-text: #0071eb;
		--present: #e49b67;
		--present-ink: #2b1200;
		/* Keyboard only — a spent key is filled with this. An absent tile on
		   the board stays paper with a grey letter: leaving it unfilled is
		   what makes the filled ones read as a pattern.

		   The two themes run the same way round now, by opposite means. On
		   paper a spent key goes dark under a white label: there is nowhere
		   pale for it to recede to, so it steps forward instead, which is the
		   conventional look. On the dark board the two greys were exchanged to
		   reach the same place — the spent key took the mid slate the resting
		   keys used to wear, and the resting keys took the near-black the spent
		   ones had. A used letter is the loud key in both themes and an
		   untouched one is quiet. Note what that costs on the dark board: a
		   resting key is now within about 1.1:1 of the board behind it, so the
		   key's own shape is barely drawn and only its letter really reads. */
		--miss: #6b7280;
		--miss-ink: #ffffff;
		/* Error text inside a widget. Was a hard-coded #b91c1c in all four,
		   which is 2.7:1 on the dark board — legible in one theme only. */
		--danger: #b91c1c;
		--ink: #14161c;
		--ink-muted: #5f6673;
		/* Hairline for containers — the reveal popover's box, and anything
		   else that just needs an edge. Not the board: a tile outline this
		   faint measured 1.26:1 on paper, which next to an 11:1 correct tile
		   read as no outline at all. */
		--line: #e2e5ea;
		/* The resting tile outline. Visible on its own terms, and still a
		   step below --line-strong so the row being typed into stays the
		   loudest thing on the board. */
		--tile-line: #a6b0be;
		/* Control boundaries need 3:1 against the board to be perceivable. */
		--line-strong: #858e9c;
		--key-bg: #eaecf0;
		--key-bg-hover: #dde0e6;
		--bg: #fff;
		--accent: var(--accent-light);
		--accent-hover: var(--accent-hover-light);
		/* A game that fills its tiles needs a label colour for that fill, and
		   a softer fill for a state that is settled rather than final. Only
		   the ladder uses these today — it is the one widget that reads
		   --accent — and like --accent they are chosen by the widget and
		   picked between here. */
		--accent-ink: var(--accent-ink-light);
		--accent-soft: var(--accent-soft-light);
		--accent-soft-ink: var(--accent-soft-ink-light);
		/* The ladder's warm counter-colour, same arrangement: declared there,
		   chosen here. See the --goal block in Ladder.svelte for why light
		   carries a separate --goal-text and dark does not. */
		--goal: var(--goal-light);
		--goal-hover: var(--goal-hover-light);
		--goal-ink: var(--goal-ink-light);
		--goal-text: var(--goal-text-light);
		/* Row geometry, shared by the tiles themselves and by the desktop
		   board height that reserves room for --visible-rows of them. A widget
		   that wants its own — quordle sizes tiles to fit four boards across —
		   overrides these on its own root, which outranks :host. */
		--tile-max: 3.4rem;
		--tile-border: 2px;
		--tile-radius: 9px;
		--tile-font: 1.15rem;
		--row-gap: 0.4rem;
		--visible-rows: 6;
	}
	/* Dark, in the two ways a widget can be asked for it. The website sets
	   `theme` from the reader's own choice (see ThemeToggle), which has to
	   win even when it disagrees with the device — that's the attribute
	   rule. An embed on someone else's site sets nothing, and follows the
	   device — that's the media query, which steps aside the moment a host
	   asks for light outright. */
	@media (prefers-color-scheme: dark) {
		:host(:not([theme='light'])) {
			--hit: #1fbfff;
			--hit-ink: #062441;
			--hit-text: #1fbfff;
			--present: #cc671e;
			--present-ink: #2b1200;
			--miss: #3e4654;
			--miss-ink: #eef0f3;
			--danger: #f08d84;
			--ink: #e8eaee;
			--ink-muted: #9aa2b1;
			--line: #262b35;
			--tile-line: #4f596a;
			--line-strong: #626c7c;
			--key-bg: #1c2029;
			--key-bg-hover: #262b35;
			--bg: #171a21;
			--accent: var(--accent-dark);
			--accent-hover: var(--accent-hover-dark);
			--accent-ink: var(--accent-ink-dark);
			--accent-soft: var(--accent-soft-dark);
			--accent-soft-ink: var(--accent-soft-ink-dark);
			--goal: var(--goal-dark);
			--goal-hover: var(--goal-hover-dark);
			--goal-ink: var(--goal-ink-dark);
			--goal-text: var(--goal-text-dark);
		}
	}
	:host([theme='dark']) {
		--hit: #1fbfff;
		--hit-ink: #062441;
		--hit-text: #1fbfff;
		--present: #cc671e;
		--present-ink: #2b1200;
		--miss: #3e4654;
		--miss-ink: #eef0f3;
		--danger: #f08d84;
		--ink: #e8eaee;
		--ink-muted: #9aa2b1;
		--line: #262b35;
		--tile-line: #4f596a;
		--line-strong: #626c7c;
		--key-bg: #1c2029;
		--key-bg-hover: #262b35;
		--bg: #171a21;
		--accent: var(--accent-dark);
		--accent-hover: var(--accent-hover-dark);
		--accent-ink: var(--accent-ink-dark);
		--accent-soft: var(--accent-soft-dark);
		--accent-soft-ink: var(--accent-soft-ink-dark);
		--goal: var(--goal-dark);
		--goal-hover: var(--goal-hover-dark);
		--goal-ink: var(--goal-ink-dark);
		--goal-text: var(--goal-text-dark);
	}
	/* Phone: the board has to give up some height so the keyboard can stay on
	   screen with it — see the same breakpoint in Keyboard.svelte. */
	@media (max-width: 480px) {
		:host {
			--tile-max: 2.8rem;
			--row-gap: 0.3rem;
		}
	}
</style>
