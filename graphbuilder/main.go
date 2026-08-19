// Command graphbuilder reads an ESDB word-list export and produces, per word
// length, a one-letter-away adjacency graph (for word ladders) plus the
// plain word list itself (reusable as a Wordle-style valid-word dictionary).
//
// This is an occasional/offline tool: run it, commit or ship the resulting
// JSON, and the website reads the JSON at runtime. It's not part of any
// request path.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
)

type graphFile struct {
	Length    int      `json:"length"`
	Words     []string `json:"words"`
	Adjacency [][]int  `json:"adjacency"`
}

type manifestEntry struct {
	Length    int `json:"length"`
	WordCount int `json:"wordCount"`
	EdgeCount int `json:"edgeCount"`
	Isolated  int `json:"isolated"`
}

func main() {
	input := flag.String("input", "data/esdb/words-80-A.txt", "path to raw ESDB word-list export")
	outputDir := flag.String("output", "output", "directory to write graph-<length>.json files into")
	minLen := flag.Int("min-len", 3, "minimum word length to include")
	maxLen := flag.Int("max-len", 8, "maximum word length to include")
	flag.Parse()

	words, err := LoadWords(*input, *minLen, *maxLen)
	if err != nil {
		log.Fatalf("loading words: %v", err)
	}
	if len(words) == 0 {
		log.Fatalf("no words loaded from %s (check -min-len/-max-len)", *input)
	}

	graphs := BuildGraphs(words)

	if err := os.MkdirAll(*outputDir, 0o755); err != nil {
		log.Fatalf("creating output dir: %v", err)
	}

	lengths := make([]int, 0, len(graphs))
	for l := range graphs {
		lengths = append(lengths, l)
	}
	sort.Ints(lengths)

	manifest := make([]manifestEntry, 0, len(lengths))
	fmt.Printf("%-6s %10s %10s %10s\n", "length", "words", "edges", "isolated")
	for _, length := range lengths {
		g := graphs[length]

		edges := 0
		isolated := 0
		for _, adj := range g.Adjacency {
			edges += len(adj)
			if len(adj) == 0 {
				isolated++
			}
		}
		edges /= 2 // each edge counted from both endpoints

		fmt.Printf("%-6d %10d %10d %10d\n", length, len(g.Words), edges, isolated)
		manifest = append(manifest, manifestEntry{
			Length:    length,
			WordCount: len(g.Words),
			EdgeCount: edges,
			Isolated:  isolated,
		})

		out := graphFile{Length: g.Length, Words: g.Words, Adjacency: g.Adjacency}
		data, err := json.Marshal(out)
		if err != nil {
			log.Fatalf("marshaling graph for length %d: %v", length, err)
		}
		path := filepath.Join(*outputDir, fmt.Sprintf("graph-%d.json", length))
		if err := os.WriteFile(path, data, 0o644); err != nil {
			log.Fatalf("writing %s: %v", path, err)
		}
	}

	manifestData, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		log.Fatalf("marshaling manifest: %v", err)
	}
	manifestPath := filepath.Join(*outputDir, "manifest.json")
	if err := os.WriteFile(manifestPath, manifestData, 0o644); err != nil {
		log.Fatalf("writing %s: %v", manifestPath, err)
	}

	fmt.Printf("\nwrote %d length buckets to %s\n", len(lengths), *outputDir)
}
