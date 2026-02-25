---
phase: 05-llm-integration
plan: 01
subsystem: parser
tags: [ollama, llm, fetch, abort-signal, json-schema, prompt-engineering, noun-resolution]

# Dependency graph
requires:
  - phase: 03-text-parser
    provides: NounResolver for noun-to-entity-ID resolution
  - phase: 04-core-gameplay
    provides: GameAction/ParseResult types, Verb enum, inventory item types
provides:
  - OllamaClient HTTP wrapper with availability check, timeout, abort, warm-up
  - PromptBuilder context-aware prompt assembly for LLM parser
  - ResponseMapper LLM JSON to ParseResult mapping via NounResolver
  - GAME_ACTION_SCHEMA JSON schema for Ollama format constraint
affects: [05-llm-integration plan 02 (HybridParser orchestration)]

# Tech tracking
tech-stack:
  added: []
  patterns: [raw fetch over npm wrappers, AbortSignal.any for composite abort, JSON schema constrained LLM output]

key-files:
  created:
    - src/game/llm/OllamaClient.ts
    - src/game/llm/PromptBuilder.ts
    - src/game/llm/ResponseMapper.ts
  modified: []

key-decisions:
  - "Raw fetch over ollama npm package -- single endpoint wrapper doesn't justify 15KB dependency"
  - "AbortSignal.any combines timeout + manual abort for race condition prevention on rapid input"
  - "GAME_ACTION_SCHEMA excludes save/load meta-commands from LLM verb space"
  - "NounResolver reused from parser module -- no duplication of noun resolution logic"

patterns-established:
  - "LLM integration via raw fetch with JSON schema constraint (no SDK dependencies)"
  - "Composite AbortSignal pattern for timeout + cancel in browser environment"

requirements-completed: [PARSE-03, PARSE-05, PARSE-06]

# Metrics
duration: 2min
completed: 2026-02-21
---

# Phase 5 Plan 1: LLM Foundation Modules Summary

**OllamaClient fetch wrapper, PromptBuilder context-aware prompts, and ResponseMapper JSON-to-ParseResult with NounResolver noun resolution**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-21T13:39:51Z
- **Completed:** 2026-02-21T13:41:39Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- OllamaClient with availability check, 2-second timeout enforcement, pending request abort, and model warm-up
- PromptBuilder assembles minimal scene-context prompts with room name, hotspot IDs, exit directions, inventory items
- ResponseMapper validates LLM verbs, resolves nouns via existing NounResolver, returns ParseResult
- GAME_ACTION_SCHEMA constrains Ollama output to valid verb/subject/target JSON structure
- Zero new npm dependencies -- entire LLM layer uses native browser fetch and AbortSignal

## Task Commits

Each task was committed atomically:

1. **Task 1: Create OllamaClient fetch wrapper** - `415238c` (feat)
2. **Task 2: Create PromptBuilder and ResponseMapper** - `0a2ade9` (feat)

## Files Created/Modified
- `src/game/llm/OllamaClient.ts` - HTTP wrapper for Ollama /api/chat with availability, timeout, abort, warm-up (145 lines)
- `src/game/llm/PromptBuilder.ts` - Context-aware prompt construction with verb rules and scene context (89 lines)
- `src/game/llm/ResponseMapper.ts` - LLM JSON response to ParseResult mapping with NounResolver noun resolution (107 lines)

## Decisions Made
- Raw fetch over ollama npm package -- single endpoint wrapper doesn't justify 15KB dependency
- AbortSignal.any combines timeout + manual abort for race condition prevention on rapid input
- GAME_ACTION_SCHEMA excludes save/load meta-commands from LLM verb space
- NounResolver reused from parser module -- no duplication of noun resolution logic
- Temperature 0 for deterministic LLM output (command parsing should be consistent)
- keep_alive '30m' to avoid model reload latency between commands

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Ollama availability is checked at runtime.

## Next Phase Readiness
- All three foundation modules ready for HybridParser orchestration in Plan 02
- OllamaClient, PromptBuilder, and ResponseMapper are isolated, testable units
- GAME_ACTION_SCHEMA ready to pass as Ollama format parameter

## Self-Check: PASSED

- [x] src/game/llm/OllamaClient.ts exists (145 lines)
- [x] src/game/llm/PromptBuilder.ts exists (89 lines)
- [x] src/game/llm/ResponseMapper.ts exists (107 lines)
- [x] Commit 415238c exists (Task 1)
- [x] Commit 0a2ade9 exists (Task 2)
- [x] TypeScript compiles with zero errors

---
*Phase: 05-llm-integration*
*Completed: 2026-02-21*
