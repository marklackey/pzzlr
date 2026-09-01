<script lang="ts">
	import { theme, THEMES, type Theme } from '$lib/theme.svelte';

	const LABEL: Record<Theme, string> = {
		light: 'Light',
		dark: 'Dark',
		system: 'System'
	};
</script>

<div class="theme">
	<span class="theme-label" id="theme-label">Theme</span>
	<div class="options" role="group" aria-labelledby="theme-label">
		{#each THEMES as option (option)}
			<button
				type="button"
				class="option"
				class:on={theme.current === option}
				aria-pressed={theme.current === option}
				onclick={() => theme.set(option)}
			>
				{LABEL[option]}
			</button>
		{/each}
	</div>
</div>

<style>
	.theme {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
	}
	.theme-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-muted);
	}
	/* One control, three states — a segment each rather than a switch,
	   because "system" isn't a midpoint between the other two. */
	.options {
		display: flex;
		padding: 2px;
		gap: 2px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-sunk);
	}
	.option {
		flex: 1;
		padding: 0.3rem 0.4rem;
		border: none;
		border-radius: calc(var(--radius-sm) - 2px);
		background: none;
		color: var(--color-text-muted);
		font: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}
	.option:hover {
		color: var(--color-text);
	}
	.option.on {
		background: var(--color-surface);
		color: var(--color-text);
		box-shadow: var(--shadow-sm);
	}
	.option:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}
</style>
