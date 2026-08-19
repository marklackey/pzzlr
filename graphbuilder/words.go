package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

// LoadWords reads a raw ESDB word-list export and returns the subset usable
// for word games: already-lowercase, alphabetic-only (a-z) entries within
// [minLen, maxLen], deduplicated.
//
// ESDB lowercases genuine dictionary words and capitalizes proper nouns and
// acronyms (e.g. "apple" the fruit vs. "Apple" the brand, "ABC" the
// initialism). So entries are kept only if they're *already* all-lowercase
// in the source — lowercasing them ourselves before filtering would let
// "ABC" slip in disguised as "abc". Possessives (cat's) and anything else
// with non a-z characters are dropped for the same reason: they don't
// behave sensibly under "differs by one letter, same length".
func LoadWords(path string, minLen, maxLen int) ([]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("opening word list: %w", err)
	}
	defer f.Close()

	seen := make(map[string]bool)
	var words []string

	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for scanner.Scan() {
		word := strings.TrimSpace(scanner.Text())
		if !isPlainAlpha(word) {
			continue
		}
		if len(word) < minLen || len(word) > maxLen {
			continue
		}
		if seen[word] {
			continue
		}
		seen[word] = true
		words = append(words, word)
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("reading word list: %w", err)
	}
	return words, nil
}

// isPlainAlpha reports whether s is non-empty and contains only a-z.
// Any word with digits, spaces, hyphens, apostrophes, or non-ASCII letters
// is rejected — those don't behave sensibly under "differs by one letter,
// same length".
func isPlainAlpha(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if r < 'a' || r > 'z' {
			return false
		}
	}
	return true
}
