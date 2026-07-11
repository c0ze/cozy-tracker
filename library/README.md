# library/ — samples, modules, corpus

Contents are NOT committed to git (too big); this README and `ledger.csv` are.

## Layout

- `samples/akwf/` — AKWF single-cycle waveforms (public domain). https://github.com/KristofferKarlAxelEkstrand/AKWF-FREE
- `samples/sagamusix/` — Saga Musix free sample packs. https://sagamusix.de/en/samples/
- `modules/drozerix/` — Drozerix's public-domain modules. https://modarchive.org/index.php?request=view_profile&query=84702
- `modules/pd/` — other license-verified PD/CC0/CC-BY modules (Mod Archive `view_by_license`, OpenGameArt CC0)
- `corpus/` — **ANALYSIS ONLY, never ship** — Mod Archive torrents, Modland mirrors, etc.

## Rules

1. Everything in `samples/` and `modules/` must be covered by a row in
   `ledger.csv` — per file, or per collection when a whole collection shares
   one source and license (provenance: source URL, author, license, download date).
2. `corpus/` is exempt from the ledger but must never be sampled from or shipped.
3. Old modules' samples may be unlicensed rips even when the module is PD —
   the module license covers the pattern data. Audit before reusing samples.
