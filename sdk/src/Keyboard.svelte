<script lang="ts">
	import type { LetterStatus } from './types';
	import { KEYBOARD_ROWS } from './keyboard';

	let {
		keyStatus = () => null,
		onLetter,
		onEnter,
		onBackspace
	} = $props<{
		/**
		 * Colour for a letter key: the best result that letter has scored so
		 * far, or null while it's untouched. Ladder scores words rather than
		 * letters and has nothing to say here, so it leaves this at the default
		 * and its keys stay plain.
		 */
		keyStatus?: (key: string) => LetterStatus | null;
		onLetter: (key: string) => void;
		onEnter: () => void;
		onBackspace: () => void;
	}>();

	// A tapped key shouldn't keep the focus: a player who clicks their way
	// through a word and then reaches for Enter on their own keyboard would
	// otherwise press whichever key they last clicked as well. Preventing the
	// mousedown default stops the button taking focus without stopping the
	// click, and leaves tabbing to the keys working as it did.
	function keepFocusOffKeys(e: MouseEvent) {
		e.preventDefault();
	}
</script>

<div class="keyboard">
	{#each KEYBOARD_ROWS as krow, i (i)}
		<div class="krow">
			{#each krow as key (key)}
				{#if key === 'enter'}
					<button
						type="button"
						class="wide enter"
						aria-label="Enter"
						onmousedown={keepFocusOffKeys}
						onclick={onEnter}
					>
						<span class="glyph">&#9166;</span>
					</button>
				{:else if key === 'back'}
					<button
						type="button"
						class="wide back"
						aria-label="Delete"
						onmousedown={keepFocusOffKeys}
						onclick={onBackspace}
					>
						<span class="glyph">&#9003;</span>
					</button>
				{:else}
					<button
						type="button"
						class={keyStatus(key)}
						onmousedown={keepFocusOffKeys}
						onclick={() => onLetter(key)}
					>
						{key}
					</button>
				{/if}
			{/each}
		</div>
	{/each}
</div>

<style>
	.keyboard {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 0 0 auto;
		/* As wide as the widget, up to --keyboard-max when a widget sets one,
		   centred under the board. Only quordle does: its root is wider than
		   the other games' to fit four boards, and without a cap its keys
		   stretched with it. A width cap rather than a wrapper, so this stays
		   the widget's last flex child and the phone rule below can still pin
		   it to the bottom of the screen. */
		width: 100%;
		max-width: var(--keyboard-max, none);
		margin-inline: auto;
		box-sizing: border-box;
		/* Last child of the flex column, and the only one that doesn't flex —
		   so it takes its natural height off the bottom and .scroll-area gets
		   the rest. That's what puts it on the viewport's bottom edge when
		   the host gives this widget the viewport's height. */
		background: var(--bg);
		padding: 0.6rem 0 0.2rem;
	}
	.krow {
		display: flex;
		gap: 0.35rem;
	}
	/* Home row is narrower and centered, same as a physical keyboard —
	   Enter/Backspace already bookend the bottom row edge-to-edge, so it
	   needs no inset of its own. */
	.krow:nth-child(2) {
		padding: 0 4%;
	}
	.krow button {
		flex: 1 1 0;
		min-width: 0;
	}
	button {
		/* Narrow side padding: these are single glyphs, and every pixel
		   spent here across ten keys comes out of the row's shared width —
		   which is what leaves the two wide keys room to sit at either end
		   of the bottom row. */
		padding: 1.1rem 0.2rem;
		border: none;
		box-sizing: border-box;
		border-radius: 9px;
		background: var(--key-bg);
		color: var(--key-ink);
		text-transform: uppercase;
		font-weight: 700;
		font-size: 1.05rem;
		/* Pinned rather than left at `normal`, which is read off whichever
		   font draws the key: ⏎ and ⌫ come from a fallback symbol face with
		   taller metrics than the letters', and a line box that grows with the
		   glyph would make those two keys decide the whole row's height. */
		line-height: 1.15;
		cursor: pointer;
		transition: background 0.1s;
		overflow: hidden;
		white-space: nowrap;
	}
	button:hover {
		background: var(--key-bg-hover);
	}
	button.wide {
		flex: 1.9 1 0;
	}
	/* Both wide keys are a single symbol rather than a word — ⏎ and ⌫ — and
	   both draw a good deal smaller than a capital letter does at the same
	   type size, so they get scaled up to read as the letters' equals.
	   Scaling the glyph rather than raising the font size leaves the line box
	   alone, so these keys and their row stay exactly the size the letter
	   keys lay them out at. */
	button.wide .glyph {
		display: inline-block;
		transform: scale(1.45);
	}
	/* The keys stay filled — they're a tally of what's been used, not part
	   of the board, and the fill is what makes a spent letter read as spent
	   at a glance. Each state brings its own label colour: --present is a
	   pale fill in light mode and a deep one in dark, so neither white nor
	   --bg is right for it in both. */
	button.correct {
		background: var(--hit);
		color: var(--hit-ink);
	}
	button.present {
		background: var(--present);
		color: var(--present-ink);
	}
	button.absent {
		background: var(--miss);
		color: var(--miss-ink);
	}
	/* Phone: the website's game page lets the whole page scroll instead of
	   handing the widget the viewport's height (see .board-card in
	   g/[id]/+page.svelte), so board and keyboard have to earn their space
	   — at full size the two together were taller than a phone screen on
	   their own, which is what made a second, inner scroller necessary in
	   the first place. Shorter keys, tighter gaps: the same layout, roughly
	   a third less tall, and the page scrolls as one. */
	@media (max-width: 480px) {
		.keyboard {
			gap: 0.35rem;
			padding: 0.4rem 0 0.4rem;
			/* Pinned to the bottom edge of the screen for as long as any part of
			   the puzzle is on screen. Sticky rather than fixed on purpose: it
			   keeps its place in the flow, so nothing is ever hidden underneath
			   it, and it doesn't sit on top of whatever else the page has below
			   the game. This is why the board scrolls with the page instead of
			   inside its own pane — the keyboard staying put was the thing that
			   layout was for, and it has to hold now that the page owns the
			   scroll. */
			position: sticky;
			bottom: 0;
			z-index: 2;
		}
		.krow {
			gap: 0.25rem;
		}
		button {
			padding: 0.85rem 0.2rem;
			font-size: 1rem;
		}
	}
</style>
