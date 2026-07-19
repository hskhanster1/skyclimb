# Security Testing Report

**Status:** Phase 9 (Security Testing)
**Scope:** `server/server.js` as hardened through Phase 8
**Methodology:** Adversarial testing against Sky Climb's own controls, using scripted attacks against a live instance of the server through a real Socket.IO client. This is on purpose a different exercise from Phase 8's verification tests. Phase 8 confirmed each control does what it was designed to do. Phase 9 tried to defeat each control, including in ways I didn't originally think of when building them.

All tests are reproducible scripts, not manual one-off checks. Results below are from the actual test runs, not predicted or assumed outcomes.

---

## Test Categories and Results

### A. Modified Client / Unexpected Events

| Test | Result | Severity if failed |
|---|---|---|
| `join` sent with `null`, `undefined`, a number, a bare string, and an array as the payload | **Found critical bug, now fixed (R11)** | Critical |
| `input` event sent before ever calling `join` | Pass — safe no-op | — |
| Undefined/made-up event names (`totallyMadeUpEvent`) | Pass — Socket.IO ignores silently, no crash | — |
| Calling `join` a second time for a different room without disconnecting from the first | **Found bug, now fixed (R12)** | High |

**R11 finding:** `socket.emit('join', null)` crashed the entire Node process. The handler's parameter destructuring (`({ roomId, token } = {}) => ...`) only applies its default for `undefined`, not `null` — an explicit `null` threw an uncaught `TypeError` that terminated the process, ending every match for every player on the server. Trivial to trigger, zero privilege required, total service outage. See SD-002 for the fix and reasoning.

**R12 finding:** joining a second room without disconnecting from the first left a permanently occupied "ghost" slot in the original room. Since no `disconnect` event ever fires for that abandoned room, R1's Phase 5 cleanup fix — which relies on `disconnect` — never runs for it. Confirmed with a script that joined three rooms sequentially from one socket: two of the three rooms were left in memory forever, each with a phantom occupied player. This fully bypasses R1 via a path R1's own verification never tested. See SD-003.

### B. Packet Tampering

| Test | Result |
|---|---|
| Prototype pollution attempt (`{ left: { "__proto__": { polluted: true } } }`) | Pass — `({}).polluted` remained `undefined` afterward |
| Oversized payload (200,000-character string in one field) | Pass — no crash, no slowdown |
| Non-boolean types in `left`/`right`/`jump` | Pass — R4's strict `=== true` coercion holds |

No new findings here. This is the category where the small, fixed-shape input contract (Trust Boundary diagram) pays off most clearly — there's very little surface for tampering to exploit in the first place.

### C. Invalid Inputs

Tested `roomId` values: a number, a 300-character string, an HTML/script-tag string, an emoji string, and an empty string — all five were rejected with an explicit error and no slot assignment, per R6's regex validation.

No new findings.

### D. Spam / Flood

Sent 10 `join` requests in rapid succession (well beyond the 5-per-10-seconds limit). The rate limiter correctly rejected the excess with a `"Too many join attempts"` error after the 5th. R2 holds under direct testing, not just under the "doesn't crash" bar Phase 8 checked — this test specifically confirmed the limiter *rejects*, not merely that the server survives being flooded.

No new findings.

### E. Authentication Failures

Simulated an attacker with a randomly generated 128-bit hex string as a guessed reconnection token, attempting to join a room where a legitimate player was already actively connected (no disconnect, no pending grace period). Result: the attacker was assigned a *different* slot than the legitimate player — the guessed token found no matching `pendingDisconnect` entry and fell through to a normal fresh join, exactly as designed. R3 holds: an active player's slot cannot be hijacked by a token guess.

No new findings. (Token entropy — 128 bits — also makes brute-force guessing computationally infeasible regardless.)

### F. Session Abuse

Reasoned through rather than scripted, since it requires simulating token *leakage* rather than token guessing: if a valid token is somehow exposed (e.g. read from the client's own browser console, or intercepted over an unencrypted connection), it could be used by a second party during an active grace period to also gain control of that slot, since token redemption isn't single-use-enforced. This is a **residual, low-severity risk** — it requires the token to already be compromised through some other means first, which is a precondition none of the tests above were able to achieve from the outside. Logged as a residual note on R3 rather than a new risk ID, since it doesn't change R3's mitigation status — it describes a pre-condition (token leakage) that's out of scope for this server to defend against on its own.

---

## Summary

| Category | Tests run | New findings |
|---|---|---|
| Modified Client | 4 | **2 (R11 critical, R12 high)** |
| Packet Tampering | 3 | 0 |
| Invalid Inputs | 5 | 0 |
| Spam / Flood | 1 | 0 |
| Authentication Failures | 1 | 0 |
| Session Abuse | 1 (reasoned) | 0 (residual note only) |

**12 of 12 scripted checks pass** as of the current codebase (after R11/R12 remediation — the two failures were found, fixed, and re-verified within this same testing pass, not left open).

## What this phase demonstrates

Every finding in this report came from the "Modified Client" category, the one where the test scripts sent payloads no cooperative client would ever construct. Every other category, where Phase 8's controls were built against a specific known risk, held up under direct adversarial pressure. That says something about where a control's own test coverage tends to have blind spots: not in the scenario it was built for, but in the scenarios next to it that nobody wrote a control for, because nobody had thought to attack them yet.
