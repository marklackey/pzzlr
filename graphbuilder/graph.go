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

	adjacency := make([][]int, len(words))
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
