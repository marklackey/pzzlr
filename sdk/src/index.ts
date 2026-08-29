// Importing Ladder.svelte runs its compiled custom-element registration
// (customElements.define('pzzlr-ladder', ...)) as a module side effect.
// Consumers can just <script type="module" src=".../pzzlr-sdk.js"> and then
// drop <pzzlr-ladder apibase="https://api.example.com" game="<id>"></pzzlr-ladder>
// anywhere on the page — no build step, no framework required on their end.
// `game` is required: one engine, and every game it serves is identified by
// a config id created via POST /api/games.
export { default as Ladder } from './Ladder.svelte';
export { default as Wordle } from './Wordle.svelte';
export { default as Quordle } from './Quordle.svelte';
export { default as Absurdle } from './Absurdle.svelte';

export type {
	StepValidation,
	DailyPuzzle,
	LetterStatus,
	LetterResult,
	DailyWordle,
	WordleGuessResponse,
	DailyQuordle,
	QuordleGuessResponse,
	StartAbsurdle,
	AbsurdleGuessResponse
} from './types';
