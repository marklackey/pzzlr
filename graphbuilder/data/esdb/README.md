# ESDB word list

`words-80-A.txt` is generated from the [English Speller Database
(ESDB)](https://github.com/en-wl/wordlist) (formerly SCOWL), pinned at tag
`rel-2026.02.25`.

Regenerate it with `./fetch.sh` (requires git, python3, sqlite3, make).

Extraction parameters: size **80** ("a valid word in current usage" — the
tier ESDB's own docs recommend for word games), spelling **A** (American),
variant-level **1** (excludes most spelling variants), abbreviations
excluded, diacritics stripped.

This is the *raw* ESDB export: 243,121 lines, mixed case, includes
possessives (`cat's`), acronyms (`ABC`), and other entries the loader in
`graphbuilder` filters out at load time (it keeps only plain lowercase
`a-z` words). Kept raw here so re-filtering doesn't require re-fetching.

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
additional notices that apply to Australian English or sizes above 80.)
