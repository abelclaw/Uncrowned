# Roadmap: Uncrowned

## Milestones

- **v1.0 MVP** (Phases 1-8, 22 plans) -- SHIPPED 2026-02-21 -- [Archive](milestones/v1.0-ROADMAP.md)
- **v2.0 Art & Polish** (Phases 9-13, 32 requirements) -- IN PROGRESS

## Current Milestone: v2.0 Art & Polish

**Milestone Goal:** Replace placeholder assets with Flux-generated pixel art, add progressive hints, death gallery, mobile support, and multiple endings. The game becomes visually complete and polished for real players.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (9.1, 9.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 9: Art Pipeline & Schema Foundation** - Build-time art generation, save migration, MetaGameState, and all 36 room backgrounds replaced with pixel art (completed 2026-02-21)
- [x] **Phase 10: Death Gallery** - Persistent death tracking with collectible gallery UI showing all 43 discoverable deaths (completed 2026-02-21)
- [ ] **Phase 11: Progressive Hints** - Context-aware tiered hint system delivered through the sardonic narrator
- [ ] **Phase 12: Multiple Endings** - 3-4 distinct endings determined by accumulated player choices throughout the game
- [ ] **Phase 13: Mobile Responsive** - Touch controls, verb buttons, and responsive layout for phone and tablet play

## Phase Details

### Phase 9: Art Pipeline & Schema Foundation
**Goal**: The game displays consistent Flux-generated pixel art across all 36 rooms, loads efficiently with lazy loading, and safely migrates v1.0 saves
**Depends on**: Nothing (first v2.0 phase; continues from v1.0 Phase 8)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, ART-01, ART-02, ART-03, ART-04, ART-05, ART-06, ART-07
**Success Criteria** (what must be TRUE):
  1. Player loads a v1.0 save in the v2.0 build and gameplay continues without errors or data loss
  2. Player sees consistent pixel art backgrounds in every room -- no placeholder rectangles remain
  3. Player character, items, and NPCs display as pixel art sprites that match the room art style
  4. Game initial load completes in under 5 seconds on broadband -- rooms load their art on entry, not upfront
  5. Player can export save data to a JSON file and import it back on a different browser
**Plans**: 3 plans

Plans:
- [ ] 09-01-PLAN.md -- Save infrastructure: schema versioning, MetaGameState, export/import (TDD)
- [ ] 09-02-PLAN.md -- Art pipeline tooling: build script, style guide, manifest, workflow template
- [ ] 09-03-PLAN.md -- Art integration: generate all assets, update room JSONs, lazy loading

### Phase 10: Death Gallery
**Goal**: Players can collect and browse all 43 unique deaths as a meta-progression system that persists across playthroughs
**Depends on**: Phase 9 (MetaGameState infrastructure)
**Requirements**: GALR-01, GALR-02, GALR-03, GALR-04, GALR-05, GALR-06
**Success Criteria** (what must be TRUE):
  1. Player dies and sees "X/43 deaths discovered" counter with a "New!" badge on first-time deaths
  2. Player opens Death Gallery from main menu or death screen and sees a grid of all 43 deaths (discovered entries show title and details; undiscovered show cryptic hints)
  3. Player starts a new game and all previously discovered deaths remain in the gallery
  4. Each discovered death entry displays its title, narrator death text, room name, and category
**Plans**: 2 plans

Plans:
- [ ] 10-01-PLAN.md -- Death registry data, RoomScene death recording, DeathScene counter and badge
- [ ] 10-02-PLAN.md -- DeathGalleryScene UI with paginated grid, navigation from menu and death screen

### Phase 11: Progressive Hints
**Goal**: Stuck players can request context-aware hints that escalate from vague nudges to explicit guidance, delivered in the narrator's sardonic voice
**Depends on**: Phase 9 (GameState schema for hint tracking)
**Requirements**: HINT-01, HINT-02, HINT-03, HINT-04, HINT-05
**Success Criteria** (what must be TRUE):
  1. Player types "hint" and receives a context-appropriate hint for the most relevant unsolved puzzle in the current room
  2. Player requests hints repeatedly for the same puzzle and each response is more specific (3 tiers: vague, medium, explicit)
  3. Hints are delivered in the narrator's sardonic voice without breaking immersion
  4. Every puzzle across all 36 rooms has a complete 3-tier hint chain authored
  5. Player who has failed multiple attempts at a puzzle receives more specific hints automatically
**Plans**: 2 plans

Plans:
- [ ] 11-01-PLAN.md -- HintSystem class, GameState v3 schema + migration, hint verb + CommandDispatcher integration, unit tests
- [ ] 11-02-PLAN.md -- Author 3-tier hint chains for all ~44 hintable puzzles across 36 room JSONs

### Phase 12: Multiple Endings
**Goal**: The game has 3-4 distinct endings that reflect accumulated player choices, giving meaningful replayability
**Depends on**: Phase 11 (puzzle flag stability after hints are integrated)
**Requirements**: ENDS-01, ENDS-02, ENDS-03, ENDS-04, ENDS-05
**Success Criteria** (what must be TRUE):
  1. Player reaches the Act 3 climax and experiences one of 3-4 distinct endings based on their accumulated choices
  2. Ending scene displays ending-specific narrator epilogue text and credits
  3. Player replays the game making different choices at key decision points and reaches a different ending
  4. Previously discovered endings are tracked in the gallery across playthroughs (MetaGameState)
  5. Key decision points throughout the game have visible ending-influence moments authored in room/puzzle data
**Plans**: TBD

Plans:
- [ ] 12-01: TBD
- [ ] 12-02: TBD

### Phase 13: Mobile Responsive
**Goal**: Players can comfortably play the full game on phones and tablets using touch controls and verb buttons as primary input
**Depends on**: Phases 10, 11, 12 (all UI surfaces must exist before responsive layout is applied)
**Requirements**: MOBI-01, MOBI-02, MOBI-03, MOBI-04, MOBI-05, MOBI-06
**Success Criteria** (what must be TRUE):
  1. Player opens the game on a phone and the canvas scales correctly in both portrait and landscape orientations
  2. Player taps verb buttons (Look, Take, Use, Go, Talk, Inventory) to interact without needing to type
  3. Player taps a location on screen and the character walks there
  4. Player opens the text input on mobile and the game layout adjusts without the canvas being squished or hidden behind the keyboard
  5. All interactive elements (buttons, hotspots, text input) are comfortably usable on a phone screen without pinch-zooming
**Plans**: TBD

Plans:
- [ ] 13-01: TBD
- [ ] 13-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 9 -> 9.x -> 10 -> 10.x -> 11 -> 12 -> 13

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 9. Art Pipeline & Schema Foundation | v2.0 | Complete    | 2026-02-21 | - |
| 10. Death Gallery | 2/2 | Complete    | 2026-02-21 | - |
| 11. Progressive Hints | 1/2 | In Progress|  | - |
| 12. Multiple Endings | v2.0 | 0/2 | Not started | - |
| 13. Mobile Responsive | v2.0 | 0/2 | Not started | - |

---
*Roadmap created: 2026-02-21*
*Last updated: 2026-02-21*
