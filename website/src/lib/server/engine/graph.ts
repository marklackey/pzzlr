import type { WordGraphData } from './types';

/**
 * In-memory index over a single length's one-letter-away word graph.
 * Framework-agnostic: takes already-parsed data, does no I/O of its own.
 */
export class WordGraph {
	readonly length: number;

	private readonly words: string[];
	private readonly adjacency: number[][];
	private readonly indexOf: Map<string, number>;

	constructor(data: WordGraphData) {
		this.length = data.length;
		this.words = data.words;
		this.adjacency = data.adjacency;
		this.indexOf = new Map(data.words.map((w, i) => [w, i]));
	}

	has(word: string): boolean {
		return this.indexOf.has(word);
	}

	neighbors(word: string): string[] {
		const i = this.indexOf.get(word);
		if (i === undefined) return [];
		return this.adjacency[i].map((j) => this.words[j]);
	}

	size(): number {
		return this.words.length;
	}

	allWords(): readonly string[] {
		return this.words;
	}
}
