# cozy-tracker

For composing, revising or studying music, read [the mod-music skill](skills/mod-music/SKILL.md).
It is the canonical guide; `.agents/skills/mod-music` and `.claude/skills/mod-music`
point to it. Read its task-specific references, especially effect lifetime and
sample tuning, before borrowing patterns from the old demos.

- Work from the repository root. `songs/*.gen.js` is authoritative when present;
  regenerate the matching JSON after edits. Do not hand-patch generated JSON alone.
- `npm test` runs Node regression tests; `npm run build` compiles the synthesized
  demo. `node tools/json2it.js songs/<name>.json` builds a specific song.
- Validate music with lint, decoded pattern inspection and a libopenmpt render.
  State whether listening actually occurred. Lint/RMS do not establish musical quality.
- **Frozen reference songs:** Night Bus, Paper Hearts, First Light, Winter Orbit,
  Siege Engine and Siege → Night (the first batch, by Claude Fable 5) are kept
  as-is for comparison. Do not edit their generators, JSON or modules. Shared
  code changes must regenerate their JSON unchanged (the generator test checks this).
- Optional `library/` assets are not checked in. Use synthesis for portable examples.
- See [the audit](docs/song-audit.md) for remaining limitations and song studies.
  A source change does not update the prebuilt modules in `demos/`; those are
  release artifacts. Publishing the site is a separate action.
