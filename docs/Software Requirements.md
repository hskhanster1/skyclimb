# Software Requirements

**Status:** Phase 10 (documented retrospectively against the implemented system, then used to check for gaps; see "Gaps found" at the end)

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

Writing requirements after the system already exists isn't how this is supposed to go. But it did have one upside I'll admit to: it made the gaps between what got built and what a proper spec would demand pretty obvious. Two of them are worth recording instead of just quietly moving on:

- **No requirement was ever written for maximum concurrent rooms or players.** There's no admission control at all. Nothing stops an unbounded number of *simultaneously active* rooms; only abandoned ones (R1) or ones with ghost slots (R12) get cleaned up. I missed this earlier simply because there was no requirement to check the code against. It's logged as a residual gap now. A real requirement (something like "the server shall reject new rooms beyond N concurrent") would be needed before I'd call this complete for anything beyond a portfolio/demo build.
- **No requirement exists for browser/device compatibility beyond "common desktop browsers."** Mobile input never made it onto the design goals and touch controls aren't supported. That should be said outright rather than just left unwritten.
