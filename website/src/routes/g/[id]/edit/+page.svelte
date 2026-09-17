<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import GameForm from '$lib/components/GameForm.svelte';

	let { data, form } = $props();

	const gameHref = $derived(resolve('/g/[id]', { id: data.config.id }));
	const tagName = $derived(`pzzlr-${data.config.mode}`);

	// A save goes straight back to the board, as a fresh attempt at the
	// edited game.
	$effect(() => {
		if (!form?.saved) return;
		resetOwnAttempt();
		goto(gameHref, { replaceState: true });
	});

	/**
	 * Drops this browser's attempt token for the game just edited, so the
	 * widget starts a fresh attempt on the edited version instead of resuming
	 * one played against the old settings.
	 *
	 * Only this browser: an attempt is keyed by a token in local storage
	 * rather than an account (see the widgets' attemptToken), so there's no
	 * server-side way to pick out "the owner's" attempt — and no reason to,
	 * since anyone else mid-puzzle is meant to keep the game they started
	 * (see attempt-continuity.ts). The person who just edited it is the one
	 * at this keyboard. No widget is mounted on this page, so the one the
	 * game page mounts reads its token after this has run.
	 */
	function resetOwnAttempt() {
		for (const mode of ['ladder', 'wordle', 'quordle', 'absurdle']) {
			try {
				localStorage.removeItem(`pzzlr-${mode}-token:${data.config.id}`);
			} catch {
				// Storage unavailable (private browsing) means there was no
				// stored attempt to clear either.
			}
		}
	}

	let copied = $state(false);
	async function copySnippet() {
		const origin = page.url.origin;
		// Built from pieces that never spell out "<script" or "</script" in
		// one contiguous literal — Svelte's parser scans .svelte source
		// text for those tags before it understands JS, so a literal
		// occurrence (even inside a string) breaks parsing of this file.
		const scriptTag =
			'<scr' + `ipt type="module" src="${origin}/sdk/pzzlr-sdk.js">` + '</scr' + 'ipt>';
		const snippet = [
			scriptTag,
			`<${tagName} apibase="${origin}" game="${data.config.id}" apikey="${data.config.embedKey}"></${tagName}>`
		].join('\n');
		await navigator.clipboard.writeText(snippet);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<svelte:head>
	<title>Edit · {data.config.name ?? 'Pzzlr'}</title>
</svelte:head>

<div class="container form-page">
	<nav class="crumb">
		<a href={gameHref}>← {data.config.name ?? 'Back to the game'}</a>
	</nav>

	<h1>Edit game</h1>

	<form method="post" action="?/update" class="card edit-form">
		<GameForm
			graphStats={data.graphStats}
			submitLabel="Save changes"
			mode={data.config.mode}
			target={data.config.target}
			length={data.config.length}
			dictionarySize={data.config.dictionarySize}
			minSteps={data.config.minSteps}
			rungsGiven={data.config.rungsGiven}
			maxGuesses={data.config.maxGuesses}
			boardCount={data.config.boardCount}
			hardMode={data.config.hardMode}
			name={data.config.name}
			isPrivate={!data.config.public}
		/>
	</form>

	{#if form?.message}
		<p class="error-text">{form.message}</p>
	{/if}

	{#if !data.config.public}
		<section class="card embed-key">
			<h2>Embed key</h2>
			<p>
				This game is private — the widget only loads for whoever has this key. Paste the snippet
				below into any site.
			</p>
			<pre>{`<${tagName} apibase="${page.url.origin}" game="${data.config.id}" apikey="${data.config.embedKey}"></${tagName}>`}</pre>
			<div class="key-actions">
				<button type="button" class="btn btn-secondary btn-sm" onclick={copySnippet}>
					{copied ? 'Copied!' : 'Copy embed snippet'}
				</button>
				<form method="post" action="?/regenerateKey">
					<button type="submit" class="btn btn-secondary btn-sm">
						Regenerate key (invalidates the old one)
					</button>
				</form>
			</div>
		</section>
	{/if}

	<form
		method="post"
		action="?/remove"
		class="remove"
		onsubmit={(e) => {
			if (!confirm('Delete this game? This cannot be undone.')) e.preventDefault();
		}}
	>
		<button type="submit" class="btn btn-danger">Delete game</button>
	</form>
</div>

<style>
	.form-page {
		max-width: 36rem;
	}
	.crumb {
		font-size: 0.9rem;
		margin-bottom: var(--space-4);
	}
	h1 {
		margin: 0;
	}
	.edit-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		margin-top: var(--space-4);
		margin-bottom: var(--space-4);
	}
	.embed-key {
		margin-bottom: var(--space-4);
	}
	.embed-key h2 {
		font-size: 0.95rem;
		margin: 0 0 var(--space-2);
	}
	.embed-key p {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		margin: 0 0 var(--space-2);
	}
	.embed-key pre {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: var(--space-2);
		font-size: 0.75rem;
		overflow-x: auto;
		white-space: pre-wrap;
		word-break: break-all;
	}
	.key-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-top: var(--space-2);
	}
	.key-actions form {
		margin: 0;
	}
	.remove {
		margin-top: var(--space-6);
	}
</style>
