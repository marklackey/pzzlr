// Builds the boards in these images from words rather than from hand-set
// colours, so no tile can be coloured in a way the real game wouldn't.

function tile(letter, state) {
	const el = document.createElement('span');
	el.className = state ? `tile ${state}` : 'tile';
	el.textContent = letter;
	return el;
}

// A rung colours each letter already in its place in the target — the rule
// the landing page's COLD to WARM demo follows.
function drawLadder(el, rungs, target) {
	for (const word of rungs) {
		[...word].forEach((letter, i) =>
			el.append(tile(letter, letter === target[i] ? 'correct' : ''))
		);
	}
}

// Exact matches first; then each letter of the secret not yet matched can
// mark one guessed letter as present.
function score(guess, secret) {
	const states = Array(guess.length).fill('absent');
	const left = {};
	[...secret].forEach((letter, i) => {
		if (guess[i] === letter) states[i] = 'correct';
		else left[letter] = (left[letter] || 0) + 1;
	});
	[...guess].forEach((letter, i) => {
		if (states[i] !== 'correct' && left[letter]) {
			states[i] = 'present';
			left[letter]--;
		}
	});
	return states;
}

function drawBoard(el, guesses, secret) {
	for (const guess of guesses) {
		score(guess, secret).forEach((state, i) => el.append(tile(guess[i], state)));
	}
}
