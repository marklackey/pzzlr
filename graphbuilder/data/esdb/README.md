# ESDB word list

`words-<SIZE>-A.txt` files are generated from the [English Speller Database
(ESDB)](https://github.com/en-wl/wordlist) (formerly SCOWL), pinned at tag
`rel-2026.02.25`.

Regenerate them with `./fetch.sh` (requires git, python3, sqlite3, make).
Run with no arguments to (re)fetch every tier pzzlr ships (50, 60, 80), or
pass specific sizes, e.g. `./fetch.sh 50` to refresh just one.

Extraction parameters: spelling **A** (American), variant-level **1**
(excludes most spelling variants), abbreviations excluded, diacritics
stripped. Size varies by tier:

- **50** — common, everyday words only. Smallest graphs, easiest games.
- **60** — moderately common words. A step up from 50.
- **80** — "a valid word in current usage", the tier ESDB's own docs
  recommend for word games. The default, and the only tier pzzlr shipped
  before per-game dictionary selection existed.

These are the *raw* ESDB exports: mixed case, include possessives (`cat's`),
acronyms (`ABC`), and other entries the loader in `graphbuilder` filters out
at load time (it keeps only plain lowercase `a-z` words). Kept raw here so
re-filtering doesn't require re-fetching.

## License

Per ESDB's `Copyright` file (Kevin Atkinson, 2000-2026):

> Permission to use, copy, modify, distribute, and sell any part of the
> English Speller Database (ESDB, previously known as SCOWLv2), or word
> lists created from it, is hereby granted without fee, provided that the
> above copyright notice appears in all copies and that both the above
> copyright notice and this notice appear in supporting documentation.
> Kevin Atkinson makes no representations about the suitability of this
> database for any purpose. It is provided "as is" without express or
> implied warranty.

(This is the notice that applies to generated word lists at size 80 or
below in American English — see the upstream `Copyright` file for the
additional notices that apply to Australian English or sizes above 80. All
of pzzlr's tiers — 50, 60, 80 — fall within this notice.)
