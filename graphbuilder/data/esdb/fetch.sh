#!/usr/bin/env bash
# Reproduces words-80-A.txt from the upstream ESDB (English Speller Database)
# source repo: https://github.com/en-wl/wordlist
#
# This is a one-time/occasional step, not part of the normal `go run` build.
# Re-run it when you want to pick up a newer ESDB release.
#
# Requires: git, python3 (>=3.7), sqlite3, make.

set -euo pipefail

TAG="${ESDB_TAG:-rel-2026.02.25}"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

echo "Cloning en-wl/wordlist @ ${TAG} into ${WORKDIR}..."
git clone --depth 1 --branch "${TAG}" https://github.com/en-wl/wordlist.git "${WORKDIR}/wordlist"

echo "Building scowl.db (this takes a minute)..."
make -C "${WORKDIR}/wordlist"

OUT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/words-80-A.txt"

echo "Extracting American, size 80, variant-level 1 word list..."
(
  cd "${WORKDIR}/wordlist"
  ./scowl --db scowl.db word-list 80 A 1 --wo-poses=abbr --deaccent
) > "${OUT}"

echo "Wrote $(wc -l < "${OUT}" | tr -d ' ') lines to ${OUT}"
echo "Note: this is the raw ESDB export (mixed case, includes possessives/acronyms)."
echo "graphbuilder itself filters down to plain lowercase a-z words at load time."
