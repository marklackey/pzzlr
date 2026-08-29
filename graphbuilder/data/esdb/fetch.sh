#!/usr/bin/env bash
# Reproduces words-<SIZE>-A.txt from the upstream ESDB (English Speller Database)
# source repo: https://github.com/en-wl/wordlist
#
# This is a one-time/occasional step, not part of the normal `go run` build.
# Re-run it when you want to pick up a newer ESDB release, or to add another
# size tier.
#
# Requires: git, python3 (>=3.7), sqlite3, make.
#
# Usage: ./fetch.sh [SIZE...]   (defaults to the tiers pzzlr ships: 50 60 80)

set -euo pipefail

if [ "$#" -eq 0 ]; then
	SIZES=(50 60 80)
else
	SIZES=("$@")
fi

TAG="${ESDB_TAG:-rel-2026.02.25}"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

echo "Cloning en-wl/wordlist @ ${TAG} into ${WORKDIR}..."
git clone --depth 1 --branch "${TAG}" https://github.com/en-wl/wordlist.git "${WORKDIR}/wordlist"

echo "Building scowl.db (this takes a minute)..."
make -C "${WORKDIR}/wordlist"

DEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for SIZE in "${SIZES[@]}"; do
	OUT="${DEST_DIR}/words-${SIZE}-A.txt"
	echo "Extracting American, size ${SIZE}, variant-level 1 word list..."
	(
		cd "${WORKDIR}/wordlist"
		./scowl --db scowl.db word-list "${SIZE}" A 1 --wo-poses=abbr --deaccent
	) >"${OUT}"
	echo "Wrote $(wc -l <"${OUT}" | tr -d ' ') lines to ${OUT}"
done

echo "Note: these are raw ESDB exports (mixed case, includes possessives/acronyms)."
echo "graphbuilder itself filters down to plain lowercase a-z words at load time."
