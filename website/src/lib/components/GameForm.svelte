<script lang="ts">
	import { untrack } from 'svelte';
	import {
		DICTIONARY_SIZES,
		DICTIONARY_LABELS,
		DEFAULT_DICTIONARY_SIZE,
		isDictionarySize
	} from '$lib/types';
	import InfoTooltip from './InfoTooltip.svelte';

	interface GraphStat {
		size: number;
		length: number;
		wordCount: number;
		isolated: number;
		components: number;
		largestComponent: number;
	}

	interface Props {
		/** Connectivity per (dictionary, length) — see $lib/server/graph-stats. */
		graphStats?: GraphStat[];
		mode?: 'ladder' | 'wordle' | 'quordle' | 'absurdle';
		target?: string | null;
		length?: number;
		dictionarySize?: number;
		minSteps?: number;
		rungsGiven?: number;
		maxGuesses?: number;
		boardCount?: number;
		hardMode?: boolean;
		name?: string | null;
		submitLabel: string;
		randomMode?: boolean;
		isPrivate?: boolean;
	}

	let {
		graphStats = [],
		mode = $bindable('ladder'),
		target = null,
		length = 4,
		dictionarySize = DEFAULT_DICTIONARY_SIZE,
		minSteps = 4,
		rungsGiven = 0,
		maxGuesses = 6,
		boardCount = 4,
		hardMode = false,
		name = null,
		submitLabel,
		randomMode = $bindable(target === null),
		isPrivate = $bindable(false)
	}: Props = $props();

	// A wizard step only ever shows fields relevant to choices already made
	// on earlier steps, so nothing here needs to grey itself out or swap its
	// own label depending on state elsewhere in the form — that's the
	// problem this replaces (see the single-page version this superseded).
	// Every field is real $state (not a one-time initial value) so the
	// review step can display live values and nothing resets when a step's
	// markup is hidden and re-shown.
	let nameInput = $state(untrack(() => name ?? ''));
	let targetInput = $state(untrack(() => target ?? ''));
	let lengthInput = $state(untrack(() => length));
	let minStepsInput = $state(untrack(() => minSteps));
	let rungsGivenInput = $state(untrack(() => rungsGiven));
	let maxGuessesInput = $state(untrack(() => maxGuesses));
	let boardCountInput = $state(untrack(() => boardCount));
	let hardModeInput = $state(untrack(() => hardMode));

	const hasFixedTarget = $derived(mode === 'ladder' || mode === 'wordle');

	// Only ladders care about connectivity: they walk one letter at a time,
	// so both ends have to sit in the same island of mutually reachable
	// words. The guessing modes just need the word to exist, and are
	// unaffected however fragmented the graph is.
	const effectiveLength = $derived(
		hasFixedTarget && !randomMode ? targetInput.trim().length : lengthInput
	);
	const connectivity = $derived(
		graphStats.find((s) => s.size === dictionarySize && s.length === effectiveLength)
	);
	// What the typed-in target can actually support. Fetched rather than
	// computed here because the dictionary lives on the server; debounced so
	// typing a word doesn't fire a request per keystroke, and the in-flight
	// one is abandoned when the answer would already be stale.
	interface TargetReach {
		known: boolean;
		inDictionary?: boolean;
		anchors?: string[];
		anchorCount?: number;
		longestLadder?: number;
		possiblePuzzles?: number;
	}
	let targetReach = $state<TargetReach | null>(null);
	const possiblePuzzles = $derived(targetReach?.possiblePuzzles ?? null);
	let checkingTarget = $state(false);

	$effect(() => {
		const word = targetInput.trim().toLowerCase();
		const size = dictionarySize;
		const steps = minStepsInput;
		const rungs = rungsGivenInput;

		if (mode !== 'ladder' || randomMode || word.length < 4 || word.length > 8) {
			targetReach = null;
			checkingTarget = false;
			return;
		}

		const controller = new AbortController();
		checkingTarget = true;
		const timer = setTimeout(async () => {
			try {
				const params = new URLSearchParams({
					target: word,
					dictionarySize: String(size),
					minSteps: String(steps),
					rungsGiven: String(rungs)
				});
				const res = await fetch(`/api/target-reach?${params}`, { signal: controller.signal });
				targetReach = res.ok ? await res.json() : null;
			} catch {
				// Aborted, or offline — leaving the previous answer up would be
				// worse than showing nothing.
				targetReach = null;
			} finally {
				checkingTarget = false;
			}
		}, 300);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});

	const ladderWarning = $derived.by(() => {
		if (mode !== 'ladder' || !connectivity) return null;
		if (!randomMode && targetInput.trim().length >= 4) return null;
		const share = connectivity.largestComponent / connectivity.wordCount;
		if (share >= 0.5) return null;
		return `At ${connectivity.length} letters only ${Math.round(share * 100)}% of this dictionary's words connect into one group — the rest sit in fragments too small to build a ladder through. Puzzles will repeat sooner, and some target words won't be usable at all.`;
	});

	type StepId = 'basics' | 'puzzle' | 'difficulty' | 'visibility' | 'review';
	const STEP_LABEL: Record<StepId, string> = {
		basics: 'Basics',
		puzzle: 'Puzzle',
		difficulty: 'Difficulty',
		visibility: 'Visibility',
		review: 'Review'
	};
	// Absurdle has nothing to configure in Difficulty (no guess cap, no
	// secret) — skipped outright rather than shown empty or disabled.
	const steps = $derived(
		mode === 'absurdle'
			? (['basics', 'puzzle', 'visibility', 'review'] as StepId[])
			: (['basics', 'puzzle', 'difficulty', 'visibility', 'review'] as StepId[])
	);
	let stepIndex = $state(0);
	const currentStep = $derived(steps[stepIndex] ?? steps[steps.length - 1]);

	// Mode can only be changed on the first step, so there's no case where a
	// later step's fields are showing for a mode that's since changed out
	// from under them.
	function goNext(e: MouseEvent) {
		// A `hidden` field is still a candidate for constraint validation in
		// most browsers (it's just not focusable), so form.reportValidity()
		// would block on a required-but-empty field on a step the user
		// hasn't even reached yet. Scope the check to the visible section's
		// own controls instead.
		const wizard = (e.currentTarget as HTMLElement).closest('.game-form');
		const active = wizard?.querySelector('section:not([hidden])');
		const invalid = active?.querySelector<HTMLInputElement | HTMLSelectElement>(':invalid');
		if (invalid) {
			invalid.reportValidity();
			return;
		}
		stepIndex = Math.min(stepIndex + 1, steps.length - 1);
	}
	function goBack() {
		stepIndex = Math.max(stepIndex - 1, 0);
	}
	function goToStep(i: number) {
		if (i < stepIndex) stepIndex = i;
	}

	function dictionaryLabel(size: number): string {
		return isDictionarySize(size) ? DICTIONARY_LABELS[size] : `size ${size}`;
	}
</script>

<div class="game-form">
	<div class="stepper">
		<div class="stepper-dots">
			{#each steps as s, i (s)}
				<button
					type="button"
					class="dot"
					class:done={i < stepIndex}
					class:active={i === stepIndex}
					disabled={i >= stepIndex}
					onclick={() => goToStep(i)}
					aria-label={`Go back to ${STEP_LABEL[s]}`}
				></button>
			{/each}
		</div>
		<p class="step-label">Step {stepIndex + 1} of {steps.length} · {STEP_LABEL[currentStep]}</p>
	</div>

	<section hidden={currentStep !== 'basics'}>
		<label>
			Name
			<input name="name" placeholder="e.g. Cakeward" bind:value={nameInput} />
		</label>
		<label>
			<span class="label-row">
				What kind of game
				<InfoTooltip label="What do the game types mean?">
					<ul class="tooltip-list">
						<li>
							<strong>Ladder</strong> — chain from a start word to a target, one letter at a time.
						</li>
						<li>
							<strong>Wordle</strong> — guess a secret word; each guess shows which letters are right.
						</li>
						<li>
							<strong>Quordle</strong> — several secret words guessed at once, one shared guess stream.
						</li>
						<li>
							<strong>Absurdle</strong> — adversarial: no secret is ever picked, the game narrows itself
							down as you play.
						</li>
					</ul>
				</InfoTooltip>
			</span>
			<select name="mode" bind:value={mode}>
				<option value="ladder">Ladder</option>
				<option value="wordle">Wordle</option>
				<option value="quordle">Quordle</option>
				<option value="absurdle">Absurdle</option>
			</select>
		</label>

		{#if hasFixedTarget}
			<label class="checkbox">
				<input type="checkbox" name="randomTarget" bind:checked={randomMode} />
				Daily mode
				<InfoTooltip label="What does daily mode mean?">
					No fixed {mode === 'wordle' ? 'secret' : 'target'} — a new one is picked for every day instead.
				</InfoTooltip>
			</label>
		{/if}
	</section>

	<section hidden={currentStep !== 'puzzle'}>
		<label>
			Dictionary
			<select name="dictionarySize" bind:value={dictionarySize}>
				{#each DICTIONARY_SIZES as size (size)}
					<option value={size}>{DICTIONARY_LABELS[size]}</option>
				{/each}
			</select>
		</label>

		{#if hasFixedTarget && !randomMode}
			<label>
				{mode === 'wordle' ? 'Secret word' : 'Target word'}
				<input name="target" bind:value={targetInput} required minlength="4" maxlength="8" />
			</label>
		{:else}
			<label>
				Word length
				<input name="length" type="number" min="4" max="8" bind:value={lengthInput} required />
			</label>
		{/if}

		{#if mode === 'ladder'}
			<label>
				<span class="label-row">
					Minimum steps
					<InfoTooltip label="What do minimum steps mean?">
						The shortest possible ladder from the start word to the target, counting both ends. A
						higher number means a longer walk — and fewer start words far enough away to manage it.
					</InfoTooltip>
				</span>
				<input name="minSteps" type="number" min="1" bind:value={minStepsInput} required />
			</label>
		{/if}

		{#if ladderWarning}
			<p class="warning">{ladderWarning}</p>
		{/if}

		{#if mode === 'ladder' && !randomMode && targetReach?.known}
			{#if possiblePuzzles === 0}
				<p class="warning error">
					{targetReach.anchorCount === 0
						? `No word in this dictionary is one letter from "${targetInput.trim().toUpperCase()}", so no ladder can ever reach it.`
						: `"${targetInput.trim().toUpperCase()}" can't support a ladder this long — the longest ending there is ${targetReach.longestLadder} words. Lower the minimum steps.`}
				</p>
			{:else}
				<p class="reach" class:warning={possiblePuzzles !== null && possiblePuzzles < 20}>
					<strong>{(possiblePuzzles ?? 0).toLocaleString()}</strong>
					possible {possiblePuzzles === 1 ? 'puzzle' : 'puzzles'} for this target
					{#if possiblePuzzles !== null && possiblePuzzles < 20}
						— few enough that days will repeat quickly.
					{/if}
					{#if !targetReach.inDictionary}
						<br />
						Not a dictionary word, so players reach it from
						<strong>{targetReach.anchors?.slice(0, 3).join(', ').toUpperCase()}</strong
						>{(targetReach.anchorCount ?? 0) > 3
							? ` and ${(targetReach.anchorCount ?? 0) - 3} more`
							: ''}. Only that last step escapes the dictionary.
					{/if}
				</p>
			{/if}
		{:else if checkingTarget && mode === 'ladder' && !randomMode}
			<p class="reach muted">Checking that target…</p>
		{/if}
	</section>

	<section hidden={currentStep !== 'difficulty'}>
		{#if mode === 'wordle' || mode === 'quordle'}
			<label class="checkbox">
				<input type="checkbox" name="hardMode" bind:checked={hardModeInput} />
				Hard mode
				<InfoTooltip label="What is hard mode?">
					Every hint has to be reused: a green letter stays where it is, and a yellow one appears
					somewhere in each later guess.
				</InfoTooltip>
			</label>
		{/if}
		{#if mode === 'ladder'}
			<div class="field-grid">
				<label>
					<span class="label-row">
						Rungs given away
						<InfoTooltip label="What does rungs given away mean?">
							Words after the start handed over for free before the player has to guess anything
							(0–4).
						</InfoTooltip>
					</span>
					<input
						name="rungsGiven"
						type="number"
						min="0"
						max="4"
						bind:value={rungsGivenInput}
						required
					/>
				</label>
			</div>
		{:else if mode === 'quordle'}
			<div class="field-grid">
				<label>
					Guesses allowed
					<input
						name="maxGuesses"
						type="number"
						min="1"
						max="15"
						bind:value={maxGuessesInput}
						required
					/>
				</label>
				<label>
					<span class="label-row">
						Boards
						<InfoTooltip label="What does boards mean?">
							How many secret words are guessed at once, sharing one guess stream.
						</InfoTooltip>
					</span>
					<input
						name="boardCount"
						type="number"
						min="2"
						max="64"
						bind:value={boardCountInput}
						required
					/>
				</label>
			</div>
		{:else if mode === 'wordle'}
			<label>
				Guesses allowed
				<input
					name="maxGuesses"
					type="number"
					min="1"
					max="15"
					bind:value={maxGuessesInput}
					required
				/>
			</label>
		{/if}
	</section>

	<section hidden={currentStep !== 'visibility'}>
		<label class="checkbox">
			<input type="checkbox" name="private" bind:checked={isPrivate} />
			Private
			<InfoTooltip label="What does private mean?">
				Only playable with an embed key you get after saving — anyone without the key sees a missing
				game, and it's left out of Explore.
			</InfoTooltip>
		</label>
	</section>

	<section hidden={currentStep !== 'review'}>
		<dl class="summary">
			{#if nameInput}
				<div>
					<dt>Name</dt>
					<dd>{nameInput}</dd>
				</div>
			{/if}
			<div>
				<dt>Type</dt>
				<dd>{mode[0].toUpperCase() + mode.slice(1)}</dd>
			</div>
			{#if hasFixedTarget}
				<div>
					<dt>{mode === 'wordle' ? 'Secret' : 'Target'}</dt>
					<dd>{randomMode ? 'Daily (a new one every day)' : targetInput}</dd>
				</div>
			{/if}
			<div>
				<dt>Dictionary</dt>
				<dd>{dictionaryLabel(dictionarySize)}</dd>
			</div>
			{#if mode === 'ladder'}
				<div>
					<dt>Minimum steps</dt>
					<dd>{minStepsInput}</dd>
				</div>
				<div>
					<dt>Rungs given away</dt>
					<dd>{rungsGivenInput}</dd>
				</div>
			{:else if mode === 'wordle' || mode === 'quordle'}
				<div>
					<dt>Guesses allowed</dt>
					<dd>{maxGuessesInput}</dd>
				</div>
				{#if mode === 'quordle'}
					<div>
						<dt>Boards</dt>
						<dd>{boardCountInput}</dd>
					</div>
				{/if}
			{/if}
			<div>
				<dt>Visibility</dt>
				<dd>{isPrivate ? 'Private' : 'Public'}</dd>
			</div>
		</dl>
	</section>

	<div class="wizard-nav">
		{#if stepIndex > 0}
			<button type="button" class="btn btn-secondary" onclick={goBack}>Back</button>
		{:else}
			<span></span>
		{/if}
		{#if currentStep === 'review'}
			<button type="submit" class="btn btn-primary">{submitLabel}</button>
		{:else}
			<button type="button" class="btn btn-primary" onclick={goNext}>Next</button>
		{/if}
	</div>
</div>

<style>
	.game-form {
		container-type: inline-size;
		container-name: game-form;
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}
	.stepper {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.stepper-dots {
		display: flex;
		gap: var(--space-2);
	}
	.dot {
		width: 1.5rem;
		height: 0.4rem;
		padding: 0;
		border: none;
		border-radius: 999px;
		background: var(--color-border);
		cursor: default;
	}
	.dot.done {
		background: var(--color-primary);
		cursor: pointer;
	}
	.dot.active {
		background: var(--color-primary);
	}
	.step-label {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-muted);
	}
	/* :not([hidden]) matters here — an unqualified `display: flex` on
	   `section` would win over the browser's default `[hidden] { display:
	   none }` (author CSS always beats the UA stylesheet, regardless of
	   specificity), silently defeating every step's hidden attribute. */
	section:not([hidden]) {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
	.label-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.field-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}
	.checkbox {
		flex-direction: row;
		align-items: center;
		gap: var(--space-2);
	}
	.checkbox input {
		width: auto;
	}
	/* Every field here holds a short word, a number, or one of a handful of
	   options — letting them stretch to fill a wide container (the default
	   for a block-level input/select) leaves a lot of dead space around 1-2
	   characters. Name is the one field with genuinely unpredictable length,
	   so it's excluded. */
	input:not([name='name']):not([type='checkbox']) {
		max-width: 8rem;
	}
	select {
		max-width: 12rem;
	}
	.tooltip-list {
		margin: 0;
		padding-left: 1.1rem;
	}
	.tooltip-list li + li {
		margin-top: var(--space-2);
	}
	.summary {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.summary > div {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
		font-size: 0.9rem;
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--color-border);
	}
	.summary dt {
		color: var(--color-text-muted);
	}
	.summary dd {
		margin: 0;
		font-weight: 600;
	}
	.wizard-nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	@container game-form (min-width: 28rem) {
		.field-grid {
			grid-template-columns: 1fr 1fr;
		}
	}
	.warning {
		margin: var(--space-3) 0 0;
		padding: var(--space-3);
		border-radius: var(--radius-sm);
		background: #fdf6e3;
		border: 1px solid #e6d9a8;
		color: #6b5518;
		font-size: 0.85rem;
		line-height: 1.5;
	}
	.reach {
		margin: var(--space-3) 0 0;
		padding: var(--space-3);
		border-radius: var(--radius-sm);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		font-size: 0.85rem;
		line-height: 1.5;
	}
	.reach.muted {
		color: var(--color-text-muted);
	}
	.warning.error {
		background: #fdecea;
		border-color: #f0c2bd;
		color: #8a2c20;
	}
</style>
