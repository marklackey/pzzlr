import { WordGraph, type WordGraphData } from './engine';

import graph3 from './data/graphs/graph-3.json';
import graph4 from './data/graphs/graph-4.json';
import graph5 from './data/graphs/graph-5.json';
import graph6 from './data/graphs/graph-6.json';
import graph7 from './data/graphs/graph-7.json';
import graph8 from './data/graphs/graph-8.json';

const raw: Record<number, WordGraphData> = {
	3: graph3 as WordGraphData,
	4: graph4 as WordGraphData,
	5: graph5 as WordGraphData,
	6: graph6 as WordGraphData,
	7: graph7 as WordGraphData,
	8: graph8 as WordGraphData
};

const cache = new Map<number, WordGraph>();

/** Lazily builds and caches the WordGraph for a given word length. */
export function getGraph(length: number): WordGraph | null {
	if (!(length in raw)) return null;
	let graph = cache.get(length);
	if (!graph) {
		graph = new WordGraph(raw[length]);
		cache.set(length, graph);
	}
	return graph;
}

export function availableLengths(): number[] {
	return Object.keys(raw)
		.map(Number)
		.sort((a, b) => a - b);
}
