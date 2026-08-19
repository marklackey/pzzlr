// Public surface of the game engine. Pure TypeScript, no dependency on
// svelte/@sveltejs/kit — this folder is designed to be lift-and-shiftable
// into its own package (or built standalone via @sveltejs/package, since it
// already follows the src/lib convention) once there's a reason to.

export type { WordGraphData } from './types';
export { WordGraph } from './graph';

export type { LadderPuzzle, LadderValidation, PickPuzzleOptions, StepValidation } from './ladder';
export { shortestPath, isSolvable, validateLadder, checkStep, pickPuzzle } from './ladder';

export type { LetterStatus, LetterResult } from './wordle';
export { scoreGuess, isWin } from './wordle';
