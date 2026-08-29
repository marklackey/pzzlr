import { WordGraph, type WordGraphData } from './engine';
import { DEFAULT_DICTIONARY_SIZE } from '$lib/types';

// Picks up every graph-<length>.json under every data/graphs/<size>/
// directory at build time — see graphbuilder's -size flag and the
// website's sync-graphs script, which is what populates these
// subdirectories. Using a glob here (rather than named imports per file)
// means adding a new dictionary size tier only requires regenerating and
// syncing graphs, not touching this file.
const modules = import.meta.glob<WordGraphData>('./data/graphs/*/graph-*.json', {
	eager: true,
	import: 'default'
});

const pathPattern = /data\/graphs\/(\d+)\/graph-(\d+)\.json$/;

function key(size: number, length: number): string {
	return `${size}:${length}`;
}

const raw = new Map<string, WordGraphData>();
for (const [path, data] of Object.entries(modules)) {
	const match = path.match(pathPattern);
	if (!match) continue;
	const [, size, length] = match;
	raw.set(key(Number(size), Number(length)), data);
}

const cache = new Map<string, WordGraph>();

// size takes a plain number (not DictionarySize) because it's most often
// called with a DB row's dictionarySize column, which drizzle infers as
// number rather than the narrower literal union — an unrecognized size
// just falls through to the `!data` check below like any other miss.
/** Lazily builds and caches the WordGraph for a given word length and dictionary size tier. */
export function getGraph(length: number, size: number = DEFAULT_DICTIONARY_SIZE): WordGraph | null {
	const k = key(size, length);
	const data = raw.get(k);
	if (!data) return null;
	let graph = cache.get(k);
	if (!graph) {
		graph = new WordGraph(data);
		cache.set(k, graph);
	}
	return graph;
}
