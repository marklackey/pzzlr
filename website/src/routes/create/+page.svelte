<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import GameForm from '$lib/components/GameForm.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="container form-page">
	<h1>Create a game</h1>

	<form method="post" class="card">
		<GameForm submitLabel="Create" graphStats={data.graphStats} />
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
