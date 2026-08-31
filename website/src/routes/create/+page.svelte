<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import GameForm from '$lib/components/GameForm.svelte';
	import { resolve } from '$app/paths';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="container form-page">
	<h1>Create a game</h1>

	{#if !data.signedIn}
		<!-- What the form would let them do, for someone who can't use it yet.
		     Sign-in returns here (see /login), so this is the start of making
		     a game rather than a detour away from it. -->
		<div class="card signed-out">
			<p class="lead">Make your own word games.</p>
			<p>
				Build a ladder, a Wordle, a Quordle, or an Absurdle. You set the word, the dictionary, and
				how hard it plays, and Pzzlr generates a fresh puzzle from it every day.
			</p>
			<p>
				Every game gets a link of its own and a snippet for embedding it in your site. Sign in and
				the ones you make will live on your games page.
			</p>
			<div class="actions">
				<a class="btn btn-primary" href={resolve('/login')}>Sign in or create an account</a>
				<a class="btn btn-secondary" href={resolve('/explore')}>Browse games instead</a>
			</div>
		</div>
	{:else}
		<form method="post" class="card">
			<GameForm submitLabel="Create" graphStats={data.graphStats} />
		</form>

		{#if form?.message}
			<p class="error-text">{form.message}</p>
		{/if}
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
	.signed-out {
		margin-top: var(--space-4);
	}
	.signed-out p {
		margin: 0 0 var(--space-3);
	}
	.lead {
		font-weight: 600;
		font-size: 1.05rem;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}
</style>
