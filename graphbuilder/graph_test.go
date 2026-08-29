package main

import (
	"encoding/json"
	"os"
	"reflect"
	"testing"
)

func neighborsOf(t *testing.T, g *LengthGraph, word string) []string {
	t.Helper()
	idx := -1
	for i, w := range g.Words {
		if w == word {
			idx = i
			break
		}
	}
	if idx == -1 {
		t.Fatalf("word %q not in graph", word)
	}
	var names []string
	for _, j := range g.Adjacency[idx] {
		names = append(names, g.Words[j])
	}
	return names
}

func TestBuildGraphs_OneLetterAway(t *testing.T) {
	words := []string{"port", "pert", "part", "cat", "cot", "cog", "dog"}
	graphs := BuildGraphs(words)

	g4 := graphs[4]
	if g4 == nil {
		t.Fatal("expected a length-4 graph")
	}
	// port/part differ only at position 1 (o/a), port/pert differ only at
	// position 1 (o/e), part/pert differ only at position 1 (a/e) — all
	// three are pairwise one letter apart.
	if got := neighborsOf(t, g4, "port"); !reflect.DeepEqual(got, []string{"part", "pert"}) {
		t.Errorf("port neighbors = %v, want [part pert]", got)
	}
	if got := neighborsOf(t, g4, "pert"); !reflect.DeepEqual(got, []string{"part", "port"}) {
		t.Errorf("pert neighbors = %v, want [part port]", got)
	}

	g3 := graphs[3]
	if got := neighborsOf(t, g3, "cat"); !reflect.DeepEqual(got, []string{"cot"}) {
		t.Errorf("cat neighbors = %v, want [cot]", got)
	}
	if got := neighborsOf(t, g3, "cog"); !reflect.DeepEqual(got, []string{"cot", "dog"}) {
		t.Errorf("cog neighbors = %v, want [cot dog]", got)
	}
}

// A nil [][]int entry marshals to JSON `null`; consumers reading the
// output expect an array (possibly empty) for every word, never null.
func TestBuildGraphs_IsolatedWordMarshalsToEmptyArray(t *testing.T) {
	words := []string{"zzz"} // no other word of this length, so no neighbors
	g := BuildGraphs(words)[3]

	if got := neighborsOf(t, g, "zzz"); len(got) != 0 {
		t.Fatalf("zzz neighbors = %v, want none", got)
	}

	data, err := json.Marshal(g.Adjacency)
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != "[[]]" {
		t.Errorf("Adjacency marshaled to %s, want [[]] (not [null])", data)
	}
}

func TestLoadWords_FiltersNonAlpha(t *testing.T) {
	dir := t.TempDir()
	path := dir + "/words.txt"
	content := "port\npert\nABC\nApple\ncat's\na\ntoolongwordthatexceedsmax\nok\n"
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}

	words, err := LoadWords(path, 2, 6)
	if err != nil {
		t.Fatal(err)
	}
	want := []string{"port", "pert", "ok"}
	if !reflect.DeepEqual(words, want) {
		t.Errorf("LoadWords = %v, want %v", words, want)
	}
}
