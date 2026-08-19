/** Wire format produced by graphbuilder's graph-<length>.json files. */
export interface WordGraphData {
	length: number;
	words: string[];
	/** adjacency[i] = indices into words[] of every word one letter away from words[i]. */
	adjacency: number[][];
}
