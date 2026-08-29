import { DICTIONARY_SIZES } from '$lib/types';

/** One entry per (dictionary size, word length) the graphbuilder emitted. */
export interface GraphStat {
	size: number;
	length: number;
	wordCount: number;
	/** Words with no one-letter neighbour at all — each its own component. */
	isolated: number;
	components: number;
	/** Biggest set of mutually reachable words; the pool ladders come from. */
	largestComponent: number;
}

// Same glob approach as graphs.ts: a new dictionary tier only needs
// regenerating and syncing, not an edit here.
const modules = import.meta.glob<Omit<GraphStat, 'size'>[]>('./data/graphs/*/manifest.json', {
	eager: true,
	import: 'default'
});

const stats: GraphStat[] = [];
for (const [path, entries] of Object.entries(modules)) {
	const size = Number(path.match(/data\/graphs\/(\d+)\/manifest\.json$/)?.[1]);
	if (!Number.isFinite(size)) continue;
	for (const entry of entries) stats.push({ size, ...entry });
}

/**
 * Connectivity stats for every built graph, safe to hand to the browser —
 * it's a few dozen numbers, and the create/edit form needs them to warn
 * before someone builds a ladder game at a length where most words can't
 * reach each other. See ComponentStats in graphbuilder/graph.go.
 */
export function graphStats(): GraphStat[] {
	return stats.filter((s) =>
		DICTIONARY_SIZES.includes(s.size as (typeof DICTIONARY_SIZES)[number])
	);
}
