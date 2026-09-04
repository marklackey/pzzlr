// Shared on-screen/physical keyboard behavior for every game widget. Pure
// TypeScript — each component wires it to its own reactive currentGuess
// state via the getter/setter pair below, since a shared module can't hold
// Svelte state on a caller's behalf.

// Same layout as the standard on-screen Wordle keyboard: the top two rows
// are bare qwerty/asdf, and Enter + Backspace frame the bottom row instead
// of trailing the two rows above it.
export const KEYBOARD_ROWS = [
	['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
	['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
	['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'back']
];

export interface GuessInputBinding {
	/** Whether typing/backspace/submit should currently do anything. */
	isActive: () => boolean;
	currentGuess: () => string;
	setCurrentGuess: (value: string) => void;
	maxLength: () => number;
	submit: () => void;
}

// A widget's key listener sits on the window, so a widget embedded beside
// other controls (the game page puts its edit form next to the board) hears
// every keystroke on the page. A keystroke aimed at a text field belongs to
// that field — typing a game's name shouldn't also spell it out on the
// board. Checkboxes, buttons and the like are deliberately not excluded:
// letters mean nothing to them, so the board is still the right home for a
// letter typed while one has focus.
const NON_TEXT_INPUT_TYPES = new Set([
	'button',
	'checkbox',
	'color',
	'file',
	'image',
	'radio',
	'range',
	'reset',
	'submit'
]);

function isTextEntry(node: unknown): boolean {
	if (!(node instanceof HTMLElement)) return false;
	if (node.isContentEditable) return true;
	if (node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement) return true;
	if (node instanceof HTMLInputElement) return !NON_TEXT_INPUT_TYPES.has(node.type);
	return false;
}

// A keystroke aimed at a focused button is that button's own press: the
// browser turns Enter into a click on it. Handling it here as well runs the
// press twice — and since the on-screen Enter key is a button a player can
// leave focused by clicking it, that meant one Enter submitting the same
// guess twice. Let the button have it.
function activatesFocusedButton(e: KeyboardEvent, target: unknown): boolean {
	return e.key === 'Enter' && target instanceof HTMLButtonElement;
}

export function createKeyboardHandlers(binding: GuessInputBinding) {
	function typeLetter(letter: string) {
		if (!binding.isActive()) return;
		if (binding.currentGuess().length < binding.maxLength()) {
			binding.setCurrentGuess(binding.currentGuess() + letter);
		}
	}

	function backspace() {
		if (!binding.isActive()) return;
		binding.setCurrentGuess(binding.currentGuess().slice(0, -1));
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!binding.isActive()) return;
		// A shortcut (⌘A, Ctrl+C) is not a guess.
		if (e.metaKey || e.ctrlKey || e.altKey) return;
		// composedPath() sees through a shadow root, so an input inside one
		// on the host page is recognised as well; e.target would have been
		// retargeted to its host element by the time it reaches the window.
		const target = e.composedPath?.()[0] ?? e.target;
		if (isTextEntry(target)) return;
		if (activatesFocusedButton(e, target)) return;
		if (e.key === 'Enter') {
			binding.submit();
		} else if (e.key === 'Backspace') {
			backspace();
		} else if (/^[a-zA-Z]$/.test(e.key)) {
			typeLetter(e.key.toLowerCase());
		}
	}

	return { typeLetter, backspace, handleKeydown };
}
