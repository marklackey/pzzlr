// Importing Ladder.svelte runs its compiled custom-element registration
// (customElements.define('pzzlr-ladder', ...)) as a module side effect.
// Consumers can just <script type="module" src=".../pzzlr-sdk.js"> and then
// drop <pzzlr-ladder apibase="https://api.example.com" length="5"></pzzlr-ladder>
// anywhere on the page — no build step, no framework required on their end.
export { default as Ladder } from './Ladder.svelte';

export type { LadderPuzzle, StepValidation } from './types';
