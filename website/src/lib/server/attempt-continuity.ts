import { getGraph } from './graphs';
import type { WordGraph } from './engine';
import type { AttemptConfig } from './db/schema';

/** Anything carrying the settings a puzzle is built from — a stored game row, or a snapshot merged over one. */
type GameSettings = AttemptConfig & Record<string, unknown>;

/** The subset of a game worth remembering on an attempt — see the config column in schema.ts. */
export function snapshotOf(config: GameSettings): AttemptConfig {
	return {
		mode: config.mode,
		target: config.target,
		length: config.length,
		dictionarySize: config.dictionarySize,
		minSteps: config.minSteps,
		rungsGiven: config.rungsGiven,
		maxGuesses: config.maxGuesses,
		hardMode: config.hardMode
	};
}

/**
 * The settings a given attempt should be played under, and the dictionary
 * that goes with them.
 *
 * An attempt started before an edit keeps the game it began: its guesses
 * were made against that puzzle, and re-deriving today's puzzle from
 * changed settings would leave someone mid-ladder staring at a chain that
 * no longer connects, or mid-wordle with letters scored against a different
 * word. New attempts — including the owner's own once their local one is
 * cleared, see the edit form — get the edited game.
 *
 * A change of game type is the one thing continuity can't span, since the
 * route that serves an attempt is chosen by the game's current mode; those
 * fall back to the current settings.
 */
export function settingsForAttempt<T extends GameSettings>(
	current: T,
	graph: WordGraph,
	attempt: { config?: AttemptConfig | null } | null | undefined
): { config: T; graph: WordGraph } {
	const snapshot = attempt?.config;
	if (!snapshot || snapshot.mode !== current.mode) return { config: current, graph };

	const config = { ...current, ...snapshot };
	if (snapshot.length === current.length && snapshot.dictionarySize === current.dictionarySize) {
		return { config, graph };
	}
	// The dictionary itself moved, so the guesses already made were judged
	// against a different word list — keep judging them by it.
	return { config, graph: getGraph(snapshot.length, snapshot.dictionarySize) ?? graph };
}
