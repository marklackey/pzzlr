<svelte:options customElement="pzzlr-ladder" />

<script lang="ts">
	import type { LadderPuzzle, StepValidation } from './types';

	let { apibase = '', length = '5', minsteps = '2' } = $props<{
		apibase?: string;
		length?: string;
		minsteps?: string;
	}>();

	type Status = 'loading' | 'playing' | 'won' | 'error';

	let status = $state<Status>('loading');
	let puzzle = $state<LadderPuzzle | null>(null);
	let path = $state<string[]>([]);
	let guess = $state('');
	let message = $state('');

	async function loadPuzzle() {
		status = 'loading';
		message = '';
		try {
			const res = await fetch(
				`${apibase}/api/ladder/puzzle?length=${length}&minSteps=${minsteps}`
			);
			if (!res.ok) throw new Error(`puzzle request failed: ${res.status}`);
			puzzle = (await res.json()) as LadderPuzzle;
			path = [puzzle.start];
			status = 'playing';
		} catch (err) {
			message = err instanceof Error ? err.message : 'failed to load puzzle';
			status = 'error';
		}
	}

	async function submitGuess() {
		if (!puzzle || status !== 'playing') return;
		const current = path[path.length - 1];
		const next = guess.trim().toLowerCase();
		if (!next) return;

		const res = await fetch(`${apibase}/api/ladder/guess`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ length: Number(length), current, guess: next })
		});
		const result = (await res.json()) as StepValidation;

		if (!result.isNeighbor) {
			message = result.isWord
				? `"${next}" isn't one letter away from "${current}"`
				: `"${next}" isn't a word in this dictionary`;
			return;
		}

		message = '';
		path = [...path, next];
		guess = '';
		if (next === puzzle.end) status = 'won';
	}

	loadPuzzle();
</script>

<div class="ladder">
	{#if status === 'loading'}
		<p>Loading puzzle…</p>
	{:else if status === 'error'}
		<p class="error">{message}</p>
	{:else if puzzle}
		<p>
			<strong>{puzzle.start}</strong> &rarr; <strong>{puzzle.end}</strong>
		</p>
		<ol>
			{#each path as word (word)}
				<li>{word}</li>
			{/each}
		</ol>
		{#if status === 'won'}
			<p class="won">Solved in {path.length - 1} steps!</p>
		{:else}
			<form
				onsubmit={(e) => {
					e.preventDefault();
					submitGuess();
				}}
			>
				<input bind:value={guess} maxlength={Number(length)} autocomplete="off" />
				<button type="submit">Guess</button>
			</form>
			{#if message}
				<p class="error">{message}</p>
			{/if}
		{/if}
	{/if}
</div>

<style>
	.ladder {
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
		max-width: 20rem;
	}
	.error {
		color: #b00020;
	}
	.won {
		color: #087f23;
		font-weight: bold;
	}
	ol {
		padding-left: 1.25rem;
	}
</style>
