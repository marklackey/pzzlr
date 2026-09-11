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

		   The two themes run opposite ways round. On paper a spent key goes
		   dark under a white label: there is nowhere pale for it to recede
		   to, so it steps forward, which is the conventional look. On the dark
		   board it recedes: the untouched keys are pale — the site's primary
		   button colour, --color-primary in app.css, under a dark label — and
		   a spent key sinks to a slate just off the board, so the letters
		   still worth trying are the ones that look like keys. Just off it,
		   not onto it: at the near-black a spent key used to be, about 1.1:1
		   against the board, its shape didn't draw and only its letter was
		   left. */
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
		   loudest thing on the board. On the dark board it is the resting
		   keys' pale, so tiles and keyboard read as one set, and --line-strong
		   goes a step paler again to stay on top. */
		--tile-line: #a6b0be;
		/* Control boundaries need 3:1 against the board to be perceivable. */
		--line-strong: #858e9c;
		--key-bg: #eaecf0;
		--key-bg-hover: #dde0e6;
		/* The label on anything wearing --key-bg: the resting keys and
		   Wordle's hard-mode "?". Plain --ink on paper, but the dark keys are
		   pale and need a dark label, so it is its own token. */
		--key-ink: var(--ink);
		/* The one action colour: Copy result, in all four widgets. These are
		   the site's --color-primary values from app.css, so the button that
		   ends a game is the site's own primary button — the same thing the
		   nav bar's Create is — rather than a colour of its own.

		   It is kept off every board state on purpose. Copy used to wear the
		   correct-tile blue on the wordle family and the target word's orange
		   on the ladder, and a button in a state's colour sits right under a
		   finished board and reads as one more piece of it. The board's
		   colours say what happened; this one only says "press me", and
		   saying it in ink rather than a hue leaves every hue to the game. */
		--primary: #2b3a55;
		--primary-hover: #1f2b41;
		--primary-ink: #ffffff;
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
		   chosen here. See the --goal-text block in Ladder.svelte. */
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
			--miss: #2c323d;
			--miss-ink: #eef0f3;
			--danger: #f08d84;
			--ink: #e8eaee;
			--ink-muted: #9aa2b1;
			--line: #262b35;
			--tile-line: #cdd8ea;
			--line-strong: #e2e9f4;
			--key-bg: #cdd8ea;
			--key-bg-hover: #e2e9f4;
			--key-ink: #101217;
			--primary: #cdd8ea;
			--primary-hover: #e2e9f4;
			--primary-ink: #101217;
			--bg: #171a21;
			--accent: var(--accent-dark);
			--accent-hover: var(--accent-hover-dark);
			--accent-ink: var(--accent-ink-dark);
			--accent-soft: var(--accent-soft-dark);
			--accent-soft-ink: var(--accent-soft-ink-dark);
			--goal-text: var(--goal-text-dark);
		}
	}
	:host([theme='dark']) {
		--hit: #1fbfff;
		--hit-ink: #062441;
		--hit-text: #1fbfff;
		--present: #cc671e;
		--present-ink: #2b1200;
		--miss: #2c323d;
		--miss-ink: #eef0f3;
		--danger: #f08d84;
		--ink: #e8eaee;
		--ink-muted: #9aa2b1;
		--line: #262b35;
		--tile-line: #cdd8ea;
		--line-strong: #e2e9f4;
		--key-bg: #cdd8ea;
		--key-bg-hover: #e2e9f4;
		--key-ink: #101217;
		--primary: #cdd8ea;
		--primary-hover: #e2e9f4;
		--primary-ink: #101217;
		--bg: #171a21;
		--accent: var(--accent-dark);
		--accent-hover: var(--accent-hover-dark);
		--accent-ink: var(--accent-ink-dark);
		--accent-soft: var(--accent-soft-dark);
		--accent-soft-ink: var(--accent-soft-ink-dark);
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
