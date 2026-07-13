# Software Requirements

**Status:** Phase 10 (documented retrospectively against the implemented system, then used to check for gaps — see "Gaps found" at the end)

## Functional Requirements

| ID | Requirement | Implemented |
|---|---|---|
| FR-1 | The system shall allow two players to play locally on a single keyboard, with independent control schemes (WASD / Arrow keys) | Yes — `main.js` Local mode |
| FR-2 | The system shall allow two players to play against each other over a network, each on their own device | Yes — Online mode, Socket.IO |
| FR-3 | The system shall let players choose a match duration (30s / 60s / unlimited) in Local mode | Yes — timer picker |
| FR-4 | The system shall track each player's height/score in real time and display it during play | Yes |
| FR-5 | The system shall determine a winner (or draw) when the timer expires | Yes — server-side in Online mode, client-side in Local mode |
| FR-6 | The system shall let players restart a match without reloading the page | Yes — Restart button and `R` key, both modes |
| FR-7 | The system shall let two online players join the same match via a shared room code | Yes |
| FR-8 | The system shall show players whether their opponent is currently connected | Yes — `roomStatus` event |
| FR-9 | The system shall allow a player to resume an in-progress online match after a brief disconnection, without losing position or score | Yes — reconnection token + grace period (R3) |

## Non-Functional Requirements

| ID | Requirement | Implemented / Verified |
|---|---|---|
| NFR-1 | The server shall update game state at a fixed 60Hz tick rate regardless of client frame rate | Yes — `setInterval(..., 1000/60)` |
| NFR-2 | The client shall render correctly across common desktop browser window sizes | Yes — dynamic canvas resize |
| NFR-3 | The server shall remain available to unaffected rooms if one room encounters an error | Yes — verified in Phase 9 (R11 fix: per-handler `try`/`catch`) |
| NFR-4 | The server shall not grow memory usage unbounded from normal or abusive client behavior | Yes — verified in Phase 9 (R1, R12) |
| NFR-5 | The system shall run as a single deployable Node.js process, without requiring a separate frontend host | Yes — Express serves the client; Socket.IO shares the same origin (see Architecture.md) |
| NFR-6 | Code shall be organized by concern (rendering, physics, input, networking) rather than as a monolith | Partially — client is fully modular; server remains a single file by deliberate Phase 6 decision, deferred rather than forgotten |

## Gaps found while writing this document

Writing requirements *after* building the system, rather than before, has one advantage worth naming honestly: it surfaces gaps between what was built and what a complete spec would have required. Two are worth recording rather than quietly ignoring:

- **No requirement was ever written for maximum concurrent rooms or players.** The system has no admission control — nothing stops an unbounded number of *simultaneously active* rooms, only abandoned ones (R1) or ones with ghost slots (R12). This wasn't caught earlier because no requirement existed to catch it against. Logged as a residual gap; would need a real requirement (e.g. "the server shall reject new rooms beyond N concurrent") before this could be called complete for anything beyond portfolio/demo use.
- **No requirement exists for browser/device compatibility beyond "common desktop browsers."** Mobile input (touch controls) was never a design goal and isn't supported — worth stating explicitly rather than leaving implicit.
