// index.ts is plain TypeScript, so it needs a type for the four widget
// modules it re-exports. Each of those declares <svelte:options customElement>
// and so compiles to a custom-element class rather than a Svelte component.
//
// Named one by one rather than as a blanket '*.svelte': the widgets now import
// ordinary Svelte components too (Keyboard, Palette, BoardStyles), and a
// catch-all here would type those as custom elements as well, which silently
// switches off prop checking at every one of their call sites.
declare module '*/Ladder.svelte' {
	const CustomElement: CustomElementConstructor;
	export default CustomElement;
}
declare module '*/Wordle.svelte' {
	const CustomElement: CustomElementConstructor;
	export default CustomElement;
}
declare module '*/Quordle.svelte' {
	const CustomElement: CustomElementConstructor;
	export default CustomElement;
}
declare module '*/Absurdle.svelte' {
	const CustomElement: CustomElementConstructor;
	export default CustomElement;
}
