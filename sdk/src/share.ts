// Not a .svelte.ts module: this project's `check` script runs plain tsc, not
// svelte-check, so a shared module can't declare its own $state rune. Each
// component keeps its own `let copied = $state(false)` and hands this the
// setter, which is the only genuinely per-instance part anyway.

/** Copies `getText()`'s current result to the clipboard, flipping `copied` on for 1.5s so a "Copy result" button can show a confirmation. */
export function createShareCopy(getText: () => string, setCopied: (value: boolean) => void) {
	return async function copyShare() {
		await navigator.clipboard.writeText(getText());
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};
}
