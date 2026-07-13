# Threat Model (STRIDE)

**Status:** Phase 7
**Scope:** `server/server.js` and the client/server boundary described in `Architecture.md`
**Methodology:** STRIDE, applied per data flow crossing the trust boundary (see `docs/diagrams/trust-boundary.svg`), not per component in isolation — a threat only matters here if it crosses from the untrusted client into something the trusted server relies on.

This document deliberately builds on the Phase 5 Risk Register rather than starting over: several risks identified there map directly onto a STRIDE category and are cross-referenced by ID. Where STRIDE surfaces something the earlier pass missed entirely, it's logged as a new risk (R8–R10) — which is itself worth noting as evidence that a structured methodology catches things an ad hoc audit doesn't, even when the ad hoc audit was reasonably thorough.

## Assets

What's actually worth protecting here:
- **Game fairness** — the integrity of the match outcome (score, winner)
- **Service availability** — the server staying up and responsive for legitimate players
- **Match integrity** — the guarantee that the two people in a room are the two people who intended to be there

There is no personal data, no accounts, and no payment information in scope — this materially limits how severe most findings can be.

## Threat Actors

- **A player in the match** — has full control over their own client and can modify or replace it (browser devtools, custom scripts). This is the primary actor STRIDE needs to consider, since it's the only actor with any legitimate access at all.
- **An uninvited third party** — someone who obtains or guesses a room code without being invited.
- **An unrelated internet host** — no authentication exists, so any host that can reach the server's port is technically a potential actor for availability threats, even without ever playing.

---

## Spoofing

*Can someone convincingly pretend to be something they're not?*

| Threat | Component | Related Risk |
|---|---|---|
| A stranger who obtains/guesses a room code joins as "Player 2" before the intended friend does, and the real friend is now locked out (`'Room full'`) | Room Manager (`join` handler) | **R6** — no `roomId` validation means codes have no minimum entropy requirement; a short/predictable code is guessable |
| A brief network drop frees a player's slot; a different client (or an attacker who was already probing that room) claims it before the original player reconnects | Room Manager (`disconnect` handler) | **R3** |
| A client claims to be sending genuine keyboard input when it's actually a script | Input Handler | **R7** — accepted as a known limitation, not remediated |

**Assessment:** The core spoofing risk here isn't identity theft in the traditional sense (no accounts to steal) — it's *slot theft*, made possible because room codes double as the only access control and there's no concept of "this player's session" that survives a reconnect.

## Tampering

*Can data be modified in transit or in a way the server shouldn't trust?*

| Threat | Component | Related Risk |
|---|---|---|
| `input` payload sent with non-boolean types for `left`/`right`/`jump` | Socket.IO Handler | **R4** |
| A modified client sends `input` events at a rate far exceeding 60Hz | Socket.IO Handler | **R2** |
| Tampering with position, score, physics constants, or the platform pattern | — | **Not possible** — none of these ever originate from the client (see Trust Boundary diagram) |

**Assessment:** This is the category where the Phase 4 server-authority decision pays off most visibly. The tamperable surface is deliberately tiny — three booleans — precisely because everything else was designed to never trust client input in the first place.

## Repudiation

*Could someone deny having done something, with no way to prove otherwise?*

| Threat | Component | Related Risk |
|---|---|---|
| No persistent, timestamped record of match events (joins, disconnects, match outcomes) — only ephemeral `console.log` output that vanishes on server restart | Server-wide | **R8 (new)** |

**Assessment:** This category wasn't represented at all in the Phase 5 register — it simply isn't a question "can the client cheat?" naturally surfaces, which is exactly why a separate structured pass is worth doing rather than treating Phase 5 as sufficient. If a dispute ever arose ("the server disconnected me unfairly" / "my opponent's win shouldn't count"), there is currently no record to check the claim against. Low severity given the game has no stakes attached to outcomes today, but worth having on record before this becomes a portfolio piece that gets asked about in an interview.

## Information Disclosure

*Could the system reveal something it shouldn't?*

| Threat | Component | Related Risk |
|---|---|---|
| Express's default error handler may return a stack trace (file paths, dependency versions) to a client that triggers an unhandled exception on an HTTP route, if `NODE_ENV` isn't set to `production` | Express Static Server | **R9 (new)** |
| Wide-open CORS lets any origin's script read whatever the server's HTTP responses expose | Express Static Server | **R5** |
| No endpoint exists to enumerate active rooms or connected players | Room Manager | Not applicable — good by omission |

**Assessment:** Low severity — there's no sensitive data in this system to disclose. The main value here is reconnaissance (an attacker learning server internals), not direct harm.

## Denial of Service

*Could the service be made unavailable to legitimate users?*

| Threat | Component | Related Risk |
|---|---|---|
| Unbounded room accumulation from repeated join/abandon cycles | Room Manager | **R1 — mitigated** (SD-001) |
| Flooding `input` or `join` events with no rate limit | Socket.IO Handler | **R2** |
| Opening many socket connections that never call `join` at all — each still consumes a connection handle indefinitely, since there's no idle-connection timeout | Socket.IO Handler | **R10 (new)** |

**Assessment:** This is the category with the most open findings, and rightly so for a real-time server with no authentication layer in front of it — anyone who can reach the port can consume some resource. R1 was the clearest high-severity case and is already fixed; R2 and R10 are related (both are really "no resource-consumption limits") and are appropriately grouped for a single Phase 8 rate-limiting pass rather than treated as unrelated fixes.

## Elevation of Privilege

*Could someone gain capabilities or access beyond what they should have?*

**Assessment:** Largely not applicable by design — there are only two roles in this system (Player 0 / Player 1), no admin interface reachable over the socket, and no privilege hierarchy to escalate into. The closest analogue is slot theft (already covered under Spoofing, R3), which is a lateral access problem rather than a vertical privilege escalation. Documenting "not applicable, and here's why" is deliberate: a threat model that silently skips a STRIDE category is harder to distinguish from one that just forgot to check it.

---

## New risks identified during this pass

Added to `Risk Register.md`:

| ID | Risk | Category | Rating |
|---|---|---|---|
| R8 | No persistent logging of match/connection events — repudiation risk if a dispute ever needs investigating | Repudiation | Low |
| R9 | Default Express error handler may leak stack traces if `NODE_ENV` isn't set to `production` | Information Disclosure | Low |
| R10 | No timeout for connections that never send `join` — each still consumes a connection handle | Availability (DoS) | Low–Medium |

## Summary

Of six applicable STRIDE categories (Elevation of Privilege excluded as not applicable), **Denial of Service has the most open findings**, which tracks with this being an unauthenticated real-time server. **Tampering has the smallest tamperable surface**, which tracks with the deliberate server-authority design from Phase 4. No findings in this pass rise to the severity of R1 — none currently justify remediation ahead of the planned Phase 8 schedule, so no further SD-00x exceptions are being made at this time.
