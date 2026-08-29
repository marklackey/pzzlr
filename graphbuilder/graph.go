package main

import "sort"

// LengthGraph is the one-letter-away adjacency graph for all words of a
// single length. Adjacency[i] lists the indices (into Words) of every word
// that differs from Words[i] in exactly one letter position.
type LengthGraph struct {
	Length    int
	Words     []string
	Adjacency [][]int
}

// BuildGraphs buckets words by length and builds a LengthGraph for each
// bucket. words must already be filtered to same-case, plain a-z entries
// (see LoadWords) — BuildGraphs assumes every word in a bucket has the same
// length and treats bytes as single letters (no unicode handling needed
// since input is a-z only).
func BuildGraphs(words []string) map[int]*LengthGraph {
	byLength := make(map[int][]string)
	for _, w := range words {
		byLength[len(w)] = append(byLength[len(w)], w)
	}

	graphs := make(map[int]*LengthGraph, len(byLength))
	for length, ws := range byLength {
		sort.Strings(ws)
		graphs[length] = buildGraphForLength(length, ws)
	}
	return graphs
}

// buildGraphForLength connects every pair of words that share a "wildcard
// pattern" — the word with one position blanked out. Two distinct words
// sharing a pattern are equal everywhere except that one position, i.e.
// exactly one letter apart. This is O(words * length) to bucket plus
// O(group size^2) per pattern group to connect, instead of comparing every
// pair of words directly.
func buildGraphForLength(length int, words []string) *LengthGraph {
	patterns := make(map[string][]int)
	for i, w := range words {
		for pos := 0; pos < length; pos++ {
			pattern := w[:pos] + "*" + w[pos+1:]
			patterns[pattern] = append(patterns[pattern], i)
		}
	}

	// A nil slice marshals to JSON `null`, not `[]` — words with no
	// neighbors need an explicit empty slice here so consumers reading the
	// output always get an array back, never null, for every word.
	adjacency := make([][]int, len(words))
	for i := range adjacency {
		adjacency[i] = []int{}
	}
	for _, group := range patterns {
		if len(group) < 2 {
			continue
		}
		for a := 0; a < len(group); a++ {
			for b := a + 1; b < len(group); b++ {
				i, j := group[a], group[b]
				adjacency[i] = append(adjacency[i], j)
				adjacency[j] = append(adjacency[j], i)
			}
		}
	}
	// A pair of distinct words can share at most one wildcard pattern
	// (sharing two would force them identical), so adjacency lists come
	// out duplicate-free already — just sort for deterministic output.
	for i := range adjacency {
		sort.Ints(adjacency[i])
	}

	return &LengthGraph{Length: length, Words: words, Adjacency: adjacency}
}

// ComponentStats counts the graph's connected components and measures its
// largest, by flood-filling from each unvisited word.
//
// A word ladder is a walk along edges, so it can only ever run between two
// words in the same component — words in different ones are unreachable
// from each other however many steps you allow. That makes these the
// numbers that say whether a given length is really playable: an isolated
// word is just a component of size one, and a length whose largest
// component holds a small share of its words is mostly unusable even
// though the word count looks healthy.
func ComponentStats(g *LengthGraph) (components int, largest int) {
	seen := make([]bool, len(g.Words))
	queue := make([]int, 0, len(g.Words))

	for i := range g.Words {
		if seen[i] {
			continue
		}
		components++
		size := 0
		seen[i] = true
		queue = append(queue[:0], i)
		for head := 0; head < len(queue); head++ {
			size++
			for _, n := range g.Adjacency[queue[head]] {
				if !seen[n] {
					seen[n] = true
					queue = append(queue, n)
				}
			}
		}
		if size > largest {
			largest = size
		}
	}
	return components, largest
}
