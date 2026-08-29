import type { WordGraphData } from './types';

/**
 * In-memory index over a single length's one-letter-away word graph.
 * Framework-agnostic: takes already-parsed data, does no I/O of its own.
 */
export class WordGraph {
	readonly length: number;

	private readonly words: string[];
	private readonly adjacency: number[][];
	private readonly wordIndex: Map<string, number>;

	constructor(data: WordGraphData) {
		this.length = data.length;
		this.words = data.words;
		this.adjacency = data.adjacency;
		this.wordIndex = new Map(data.words.map((w, i) => [w, i]));
	}

	has(word: string): boolean {
		return this.wordIndex.has(word);
	}

	neighbors(word: string): string[] {
		const i = this.wordIndex.get(word);
		if (i === undefined) return [];
		return this.adjacency[i].map((j) => this.words[j]);
	}

	size(): number {
		return this.words.length;
	}

	allWords(): readonly string[] {
		return this.words;
	}

	/** This word's position in `allWords()`, stable for this instance's lifetime (graphs are loaded once and cached — see graphs.ts) — or undefined if it isn't in the graph. */
	indexOf(word: string): number | undefined {
		return this.wordIndex.get(word);
	}

	/**
	 * Component id per word, built on first use and kept for the graph's
	 * lifetime (graphs are cached — see graphs.ts), so the O(words + edges)
	 * flood fill happens at most once per graph rather than per request.
	 */
	private componentIds?: Int32Array;
	private componentSizes?: number[];

	private buildComponents(): void {
		const ids = new Int32Array(this.words.length).fill(-1);
		const sizes: number[] = [];
		const queue: number[] = [];

		for (let i = 0; i < this.words.length; i++) {
			if (ids[i] !== -1) continue;
			const id = sizes.length;
			let size = 0;
			ids[i] = id;
			queue.length = 0;
			queue.push(i);
			for (let head = 0; head < queue.length; head++) {
				size++;
				for (const n of this.adjacency[queue[head]]) {
					if (ids[n] === -1) {
						ids[n] = id;
						queue.push(n);
					}
				}
			}
			sizes.push(size);
		}

		this.componentIds = ids;
		this.componentSizes = sizes;
	}

	/**
	 * How many words are mutually reachable from this one, itself included —
	 * 1 for a word with no neighbours at all.
	 *
	 * This is the ceiling on any ladder through the word: a ladder is a walk
	 * along edges, so it can never leave the word's component or visit more
	 * words than the component holds. Callers building a puzzle use it to
	 * skip words whose island is too small to hold one (see pickDailyPuzzle)
	 * rather than discovering it by failing a path search. Returns 0 for a
	 * word that isn't in this graph.
	 */
	componentSize(word: string): number {
		const i = this.wordIndex.get(word);
		if (i === undefined) return 0;
		if (!this.componentIds || !this.componentSizes) this.buildComponents();
		return this.componentSizes![this.componentIds![i]];
	}

	/** Whether both words sit in the same component, i.e. whether any ladder between them can exist at all. */
	sameComponent(a: string, b: string): boolean {
		const i = this.wordIndex.get(a);
		const j = this.wordIndex.get(b);
		if (i === undefined || j === undefined) return false;
		if (!this.componentIds) this.buildComponents();
		return this.componentIds![i] === this.componentIds![j];
	}
}
