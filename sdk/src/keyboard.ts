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
