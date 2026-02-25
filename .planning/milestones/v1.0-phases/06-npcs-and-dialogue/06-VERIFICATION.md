---
phase: 06-npcs-and-dialogue
verified: 2026-02-21T09:40:00Z
status: human_needed
score: 4/4 must-haves verified
re_verification: false
human_verification:
  - test: "Type 'talk to old man' in village_path and enter branching dialogue"
    expected: "Narrator display shows Old Man greeting with numbered choices; typing '1' advances to cave_info knot"
    why_human: "Requires running browser with Phaser/inkjs runtime; cannot verify ink choice routing programmatically"
  - test: "Talk to old man, select 'Ask about the cave' (choice 1), verify knows_cave_name flag gates new option"
    expected: "'Ask about the Screaming Caverns' choice appears after first cave_info conversation"
    why_human: "Flag-gated choice visibility requires live ink runtime execution"
  - test: "Exit dialogue (choose 'Leave') and type 'look'; verify normal command mode resumes"
    expected: "Room description appears; no 'Pick a number' prompt; inDialogue returns to false"
    why_human: "Dialogue mode state machine requires runtime verification"
  - test: "Navigate to another room and back to village_path; observe narrator_history commentary"
    expected: "After visiting cave_entrance and returning, narrator says something referencing cave visit or old man interaction"
    why_human: "Dynamic ink commentary requires game state conditions met in live session"
  - test: "Save, refresh page, load save, talk to old man again"
    expected: "Old man greets with 'Ah, you again' (met_old_man flag persisted); earlier conversation branches still available"
    why_human: "Save/load dialogue state persistence requires full browser session with localStorage"
---

# Phase 6: NPCs and Dialogue Verification Report

**Phase Goal:** NPCs populate the world with personalities, branching conversations, and puzzle-relevant information driven by inkjs narrative scripting
**Verified:** 2026-02-21T09:40:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | NPCs appear in scenes with distinct personalities and authored knowledge that the player can engage through text commands | VERIFIED | `village_path.json` contains old_man NPC with zone, position, interactionPoint. `npcs.json` defines personality/knowledge. `CommandDispatcher.findNpc()` uses triple-resolution. `RoomScene` renders cyan NPC zones. `handleTalk` emits `start-dialogue`. |
| 2 | NPC conversations branch based on player choices and game state, tracked through inkjs story variables | VERIFIED | `old_man.ink` has 8 knots with `hasItem`/`hasFlag` conditionals gating choices. `setFlag` calls (met_old_man, knows_cave_name, etc.) tracked in ink story state. `DialogueManager.choose()` routes to `ChooseChoiceIndex`. `npcStoryStates` Map persists per-NPC state. |
| 3 | Conversation-based puzzles require gathering information from NPCs or persuading them to advance the story | VERIFIED | `old_man.ink` gates `cavern_details` knot behind `hasFlag("warned_about_cave")` -- player must ask about the village before accessing deeper lore. `key_reaction` and `bottle_reaction` knots react to inventory. `setFlag("knows_cavern_secret")` unlocks story progression. Ink EXTERNAL functions (hasItem, hasFlag, setFlag) all bound in `DialogueManager.bindExternalFunctions()`. |
| 4 | The narrator references past player actions and events, showing dynamic awareness of the player's history | VERIFIED | `narrator_history.ink` evaluates `getDeathCount()`, `visitedRoom("cave_entrance")`, `visitedRoom("village_path")`, `hasFlag("met_old_man")`, `hasFlag("knows_cave_name")`. `RoomScene.showEntryNarration()` runs it on every room entry as non-interactive one-shot. Commentary lines displayed via `narratorDisplay.typewrite()` with 1500ms delay. |

**Score:** 4/4 truths verified (automated evidence)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/game/types/NpcData.ts` | NpcDefinition and RoomNpcData interfaces | VERIFIED | Exports both interfaces with all required fields: id, name, personality, knowledge, dialogueKey, defaultGreeting, position, interactionPoint, zone, conditions |
| `src/game/dialogue/DialogueManager.ts` | inkjs Story management with EXTERNAL binding, state save/restore | VERIFIED | 187 lines; imports `{ Story } from 'inkjs'`; binds all 7 EXTERNAL functions; `npcStoryStates` Map; `startConversation`, `continueAll`, `choose`, `endConversation`, `isActive`, `getActiveNpcId`, `getDialogueStates`, `loadDialogueStates` |
| `src/game/dialogue/DialogueUI.ts` | Choice rendering and dialogue mode text formatting | VERIFIED | 117 lines; `showDialogueLine`, `showChoices`, `showDialogueWithChoices`, `clearDialogue`, `parseTags`; reuses NarratorDisplay with 50-char threshold |
| `src/game/state/GameStateTypes.ts` | Extended GameStateData with dialogueStates field | VERIFIED | `dialogueStates: Record<string, string>` in interface and `dialogueStates: {}` in `getDefaultState()` |
| `src/game/state/GameState.ts` | getDialogueStates and setDialogueStates methods | VERIFIED | Both methods present at lines 77-83 |
| `public/assets/data/npcs/npcs.json` | NPC registry with old_man definition | VERIFIED | Contains old_man with personality, knowledge array (5 topics), dialogueKey: "dialogue-old_man", defaultGreeting |
| `public/assets/data/dialogue/old_man.ink.json` | Compiled ink JSON for old man NPC dialogue | VERIFIED | Valid JSON with inkVersion field; compiled from old_man.ink with 8 knots and EXTERNAL calls |
| `public/assets/data/dialogue/narrator_history.ink.json` | Narrator history-aware commentary ink script | VERIFIED | Valid JSON with inkVersion field; compiled from narrator_history.ink |
| `public/assets/data/rooms/village_path.json` | NPC placement data in room JSON | VERIFIED | Contains `npcs` array with old_man entry: position {x:700,y:400}, interactionPoint {x:670,y:430}, zone {x:680,y:370,w:40,h:80} |
| `src/game/scenes/Preloader.ts` | NPC and dialogue asset loading | VERIFIED | Loads `npcs` (npcs.json), `dialogue-old_man`, `dialogue-narrator_history` via `this.load.json` |
| `src/game/systems/CommandDispatcher.ts` | handleTalk delegates to DialogueManager for NPC targets | VERIFIED | `findNpc()` with triple-resolution and condition checks; emits `start-dialogue` event before hotspot fallback |
| `src/game/scenes/RoomScene.ts` | Dialogue mode input routing, NPC zone rendering, DialogueManager lifecycle, narrator_history invocation | VERIFIED | `inDialogue` boolean; number input routed before HybridParser; DialogueManager/DialogueUI initialized; NPC zones as synthetic hotspots; `showEntryNarration()` runs narrator_history one-shot |
| `src/game/types/RoomData.ts` | RoomData extended with optional npcs field | VERIFIED | `npcs?: RoomNpcData[]` at line 119; imports RoomNpcData from NpcData |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `DialogueManager.ts` | inkjs | `import { Story } from 'inkjs'` | WIRED | Named import confirmed at line 1; `new Story(compiledJsonString)` in `startConversation` |
| `DialogueManager.ts` | `GameState.ts` | `BindExternalFunction` callbacks | WIRED | All 7 functions bound: hasItem, hasFlag, setFlag, addItem, removeItem, visitedRoom, getDeathCount |
| `GameStateTypes.ts` | `GameState.ts` | `dialogueStates` field | WIRED | `getDialogueStates()` returns `this.data.dialogueStates`; `setDialogueStates()` sets it |
| `npcs.json` | `old_man.ink.json` | `dialogueKey: "dialogue-old_man"` | WIRED | npcs.json dialogueKey matches Preloader cache key; RoomScene does `cache.json.get(npcDef.dialogueKey)` |
| `village_path.json` | `npcs.json` | `npcs[].id === "old_man"` | WIRED | village_path.json npcs array id "old_man" matches npcs.json NpcDefinition.id |
| `Preloader.ts` | `dialogue/*.ink.json` | `this.load.json` with `dialogue-` prefix | WIRED | Lines 74-75: `dialogue-old_man` and `dialogue-narrator_history` loaded |
| `RoomScene.ts` | `DialogueManager.ts` | `startConversation/continueAll/choose/endConversation` | WIRED | `dialogueManager.startConversation`, `advanceDialogue`, `dialogueManager.choose`, `dialogueManager.endConversation` all present |
| `RoomScene.ts` | `DialogueUI.ts` | `showDialogueWithChoices` | WIRED | `dialogueUI.showDialogueWithChoices` called in `advanceDialogue`; `dialogueUI.parseTags` for speaker extraction |
| `CommandDispatcher.ts` | `RoomScene.ts` | `EventBus 'start-dialogue'` event with npcId | WIRED | `EventBus.emit('start-dialogue', npcId)` in handleTalk; `EventBus.on('start-dialogue', this.startDialogueHandler)` in RoomScene create |
| `RoomScene.ts` | `GameState.ts` | `setDialogueStates` on save/load | WIRED | `setDialogueStates` called in commandSubmittedHandler (before dispatch), advanceDialogue (on end), shutdown handler |
| `RoomScene.ts` | `narrator_history.ink.json` | Cache key `dialogue-narrator_history` | WIRED | `cache.json.get('dialogue-narrator_history')` in `showEntryNarration()` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| NPC-01 | 06-01 | NPCs exist in scenes with authored knowledge and personalities | SATISFIED | old_man NPC in village_path; NpcDefinition with personality/knowledge; cyan debug zone renders |
| NPC-02 | 06-03 | Player can talk to NPCs via text commands | SATISFIED | `handleTalk` detects NPC via `findNpc`; emits `start-dialogue`; dialogue mode routes number input |
| NPC-03 | 06-01 | NPC dialogue supports branching conversation trees | SATISFIED | old_man.ink has 8 knots; choices loop back to greeting; hasItem/hasFlag gate choices; DialogueManager.choose() |
| NPC-04 | 06-02 | NPCs provide information, hints, and advance the plot | SATISFIED | cave_info reveals "Screaming Caverns"; key_reaction explains key purpose; bottle_reaction warns about bottle; knows_cavern_secret flag unlocks story |
| PUZ-03 | 06-02 | Conversation-based puzzles -- gather info from NPCs, persuade, negotiate | SATISFIED | cavern_details requires prior village_info; knows_cave_name flag gates Screaming Caverns option; conversation sequence required to unlock full lore |
| PUZ-06 | 06-02 | Puzzles advance the story and connect to player goals (no arbitrary filler) | SATISFIED | met_old_man, knows_cave_name, warned_about_cave, knows_key_purpose, bottle_identified, knows_cavern_secret flags all semantically connected to cave/puzzle progression |
| NARR-06 | 06-02, 06-03 | Narrator references past events and player actions (dynamic personality) | SATISFIED | narrator_history.ink queries deathCount, visitedRoom, hasFlag; runs on every room entry; commentary changes based on accumulated state |
| NARR-07 | 06-01 | Narrative scripted with inkjs for complex branching dialogue and story state | SATISFIED | inkjs@2.4.0 installed; DialogueManager wraps inkjs Story; EXTERNAL functions bridge ink to GameState; per-NPC state save/restore |

All 8 required requirement IDs from plans (NPC-01, NPC-02, NPC-03, NPC-04, PUZ-03, PUZ-06, NARR-06, NARR-07) are accounted for. No orphaned requirements found.

### Anti-Patterns Found

No anti-patterns detected. Scanned all 5 key phase files:
- No TODO/FIXME/PLACEHOLDER comments
- No empty return stubs (return null, return {}, return [])
- No console.log-only implementations
- No static hardcoded responses bypassing the ink runtime

### Human Verification Required

All automated checks pass. The following items require live browser testing to confirm the full NPC dialogue system works end-to-end.

#### 1. NPC Talk Command Triggers Ink Dialogue

**Test:** Start game, navigate to village_path, type "talk to old man"
**Expected:** Narrator display shows greeting from old_man.ink with numbered choice list (Ask about the cave, Ask about the village, Leave)
**Why human:** Live Phaser scene with inkjs Story instantiation from Phaser-cached JSON cannot be verified statically

#### 2. Number Input Selects Ink Choices and Advances Conversation

**Test:** During dialogue, type "1" to select "Ask about the cave"
**Expected:** cave_info knot text appears; conversation cycles back to greeting; new choice "Ask about the Screaming Caverns" now available
**Why human:** Ink story state machine, choice index routing (choiceNum - 1), and flag mutation require runtime

#### 3. Dialogue Mode Exit Returns to Normal Commands

**Test:** Select "Leave" (the farewell knot); then type "look"
**Expected:** Normal room look response, not "Pick a number to choose a response."
**Why human:** inDialogue boolean state transition requires runtime verification

#### 4. Narrator History Commentary on Room Entry

**Test:** Visit cave_entrance, return to village_path
**Expected:** After room description, narrator commentary appears within ~1.5 seconds referencing cave visit or old man interaction (if met_old_man flag is set)
**Why human:** Ink one-shot evaluation and delayedCall timing require live session

#### 5. Dialogue State Persists Through Save/Load

**Test:** Talk to old_man (sets met_old_man flag), save game (slot 1), refresh page, load slot 1, talk to old_man
**Expected:** Old man responds with "Ah, you again" branch (met_old_man flag restored from saved dialogueStates)
**Why human:** localStorage save/load persistence requires full browser session

### Gaps Summary

No gaps. All observable truths have full artifact and wiring evidence. 104 tests pass. TypeScript compiles with zero errors. The phase goal is achieved at the code level -- NPCs exist in scenes with authored personalities (old_man in village_path), conversations branch via inkjs with EXTERNAL function bridging to GameState, conversation puzzles require gathering information to unlock progression flags, and the narrator references past player actions dynamically on every room entry.

The 5 human verification items are confirmation checks for live runtime behavior that cannot be verified programmatically. They are not expected gaps -- the implementation is complete.

---

_Verified: 2026-02-21T09:40:00Z_
_Verifier: Claude (gsd-verifier)_
