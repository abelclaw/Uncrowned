# Milestones

## v1.0 MVP (Shipped: 2026-02-21)

**Phases completed:** 8 phases, 22 plans, 95 commits
**Delivered:** Full adventure game engine with 5-hour fantasy adventure — 36 rooms, 37 items, 11 NPCs, text parser with LLM fallback, PuzzleEngine, death system, save/load, audio.

---

## v2.0 Art & Polish (Shipped: 2026-02-21)

**Phases completed:** 5 phases (9-13), 12 plans, 58 commits
**Stats:** 209 files changed, 23,793 insertions, 3,946 deletions | 8,084 LOC TypeScript
**Timeline:** 2026-02-21 (single day)

**Key accomplishments:**
- Save versioning with v1->v2->v3 migration chain, MetaGameState for cross-playthrough persistence, and JSON export/import
- ComfyUI + Flux art pipeline with manifest, style guide, and lazy loading (91 placeholder assets at correct dimensions pending real generation)
- Death gallery with 43-death registry, paginated 3x3 grid UI, discovery counter, and "New!" badge animations
- 3-tier progressive hint system with auto-escalation — 41 puzzle hint chains (123 texts) in sardonic narrator voice
- 4 distinct endings via 2x2 flag matrix, EndingScene with epilogue, EndingsGalleryScene, and narrator cues at decision points
- Mobile responsive with VerbBar (6 touch verbs), MobileKeyboardManager, pinch-zoom prevention, and dvh layout
- Cave transition loop bug fixed with spawn-outside-exit guard system

**Known Gaps:**
- ART-02: Room backgrounds still use placeholder PNGs (requires ComfyUI hardware)
- ART-03: Parallax layers still placeholder (requires ComfyUI hardware)
- ART-04: Player sprite still placeholder (requires ComfyUI hardware)
- ART-05: Item sprites still placeholder (requires ComfyUI hardware)
- ART-06: NPC sprites still placeholder (requires ComfyUI hardware)

---

