<script lang="ts">
	import type { ActionData } from './$types';
	import GameForm from '$lib/components/GameForm.svelte';

	let { form }: { form: ActionData } = $props();

	let mode = $state<'ladder' | 'wordle' | 'quordle' | 'absurdle'>('ladder');
	let randomMode = $state(false);
</script>

<div class="container form-page">
	<h1>Create a game</h1>
	<p>
		{#if mode === 'absurdle'}
			No secret is ever picked — the answer narrows down as you guess, and the game always keeps
			whichever words your guesses have ruled out the least.
		{:else if mode === 'quordle'}
			Daily mode — a fresh set of secret words every day, all guessed at once with one shared guess
			stream.
		{:else if mode === 'wordle'}
			{#if randomMode}
				Daily mode — a fresh secret word every day.
			{:else}
				Pick a secret word — players guess it Wordle-style.
			{/if}
		{:else if randomMode}
			Daily mode — start and target both change, picked fresh for every day.
		{:else}
			Pick a target word — that's what every ladder in this game ends at.
		{/if}
	</p>

	<form method="post" class="card">
		<GameForm submitLabel="Create" bind:mode bind:randomMode />
	</form>

	{#if form?.message}
		<p class="error-text">{form.message}</p>
	{/if}
</div>

<style>
	.form-page {
		max-width: 36rem;
	}
	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		margin-top: var(--space-4);
		margin-bottom: var(--space-4);
	}
</style>
