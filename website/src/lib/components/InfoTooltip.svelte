<script lang="ts">
	import type { Snippet } from 'svelte';

	let { label, children }: { label: string; children: Snippet } = $props();

	let detailsEl: HTMLDetailsElement | undefined = $state();

	function close() {
		if (detailsEl) detailsEl.open = false;
	}

	// A <details> only closes on its own toggle click — everything else
	// (clicking elsewhere, Escape) needs to be handled by hand.
	function handleDocumentClick(e: MouseEvent) {
		if (detailsEl?.open && !detailsEl.contains(e.target as Node)) close();
	}
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && detailsEl?.open) close();
	}
</script>

<svelte:document onclick={handleDocumentClick} onkeydown={handleKeydown} />

<details class="info-tooltip" bind:this={detailsEl}>
	<summary aria-label={label}>?</summary>
	<div class="tooltip-body">{@render children()}</div>
</details>

<style>
	.info-tooltip {
		display: inline-block;
		position: relative;
	}
	.info-tooltip summary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.1rem;
		height: 1.1rem;
		border-radius: 50%;
		background: var(--color-border);
		color: var(--color-text-muted);
		font-size: 0.7rem;
		font-weight: 700;
		cursor: pointer;
		list-style: none;
	}
	.info-tooltip summary::-webkit-details-marker {
		display: none;
	}
	.tooltip-body {
		position: absolute;
		z-index: 1;
		top: 100%;
		left: 0;
		margin-top: var(--space-1);
		padding: var(--space-2) var(--space-3);
		font-size: 0.8rem;
		font-weight: normal;
		text-align: left;
		line-height: 1.4;
		color: var(--color-text-muted);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		box-shadow: var(--shadow-md);
		width: max-content;
		max-width: 20rem;
	}
</style>
