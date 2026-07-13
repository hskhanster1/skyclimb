# Security Decisions

A running log of security-relevant decisions made during this project, including cases where the response to a risk deviated from the phase plan. Each entry records what was decided, why, and what it traded off — the point is to leave evidence of judgement, not just a list of finished tasks.

---

## SD-001 — Immediate Remediation of Risk R1 (Unbounded Room Memory Growth)

**Date:** Phase 5 (Security by Design)
**Risk reference:** R1, Risk Register.md
**Status:** Implemented

### Context

During Phase 5's initial risk identification pass, R1 was logged: the server never removed room state after both players disconnected, meaning any client repeatedly joining and abandoning rooms could grow server memory without bound. This is a classic resource-exhaustion denial-of-service pattern, and it required no special tooling or privileged access to trigger — a handful of lines of client-side script would do it.

Per the project plan, secure coding controls are formally scheduled for Phase 8 (Secure Development), after architecture (Phase 6) and threat modelling (Phase 7). R1 was identified before either of those phases had been done.

### Decision

R1 was remediated immediately, rather than left open until Phase 8, on the basis of three factors considered together:

- **High impact** — left unaddressed, this could exhaust server memory and take the application down for every user, not just a misbehaving client.
- **High likelihood** — no authentication or special access is needed to trigger it; it's reachable by anyone who can open a WebSocket connection.
- **Low implementation cost** — the fix is a few lines in an existing event handler (delete room state once both player slots are empty), with no architectural prerequisites from Phase 6 or 7.

The fix was implemented and verified with a scripted test (5 rooms created and abandoned; 0 remained in server memory afterward) before being logged as mitigated in the Risk Register.

### Rationale

This reflects a deliberate choice to let risk severity drive remediation timing rather than following the phase plan rigidly. A structured SSDLC gives the project order and rigour, but treating every phase boundary as a hard gate — even for a fix this cheap and this severe — would be schedule adherence for its own sake rather than actual risk management. Real security programs work the same way: a critical, low-cost fix doesn't wait for the next sprint boundary just because a roadmap says so.

### What this doesn't change

Phases 6–8 still proceed as planned for everything else. This was a deliberate, narrow exception for one specific high/high/low-cost risk — not a decision to abandon the phased approach or start remediating every finding as it's discovered. Most items in the Risk Register (R2–R7) remain correctly deferred to Phase 8, where they'll be addressed alongside formal threat modelling context from Phase 7.

---

## SD-002 — Immediate Remediation of a Critical Crash Vulnerability Found in Phase 9

**Date:** Phase 9 (Security Testing)
**Risk reference:** R11 (new — see Risk Register.md)
**Status:** Implemented

### Context

During adversarial testing, `socket.emit('join', null)` — a single malformed packet, requiring no authentication, no rate-limit bypass, and no special access — crashed the entire Node process. The handler destructured its argument directly in the function signature (`({ roomId, token } = {}) => ...`), which only supplies the default when the argument is `undefined`; an explicit `null` throws a `TypeError` that Node treats as an unhandled exception, terminating the process and ending every match for every player on the server.

### Decision

Remediated immediately, on the same basis as SD-001: this is about as severe as a finding in this system can be (total service outage, for everyone, triggered by any single client at any time) at essentially zero cost to fix (a null-safe destructure plus a `try`/`catch` around the handler). Waiting for a scheduled phase to fix a proven denial-of-service that any player can trigger by accident, let alone on purpose, would not have been a defensible engineering decision.

The fix went further than the single line that caused the crash: every Socket.IO event handler (`join`, `input`, `disconnect`) was wrapped in `try`/`catch`, and a process-level `uncaughtException` listener was added as a last-resort net. This is deliberately defense-in-depth rather than a single patch, because Phase 9 exists precisely to find failure modes like this one, and there was no reason to assume this was the only handler with an unguarded exception path.

### Rationale

This is the clearest possible illustration of why Phase 9 (Security Testing) is a distinct phase from Phase 8 (Secure Development) rather than a formality after it: Phase 8's own verification tests never sent a bare `null` payload, because verification tests confirm a control does what it was designed to do — they don't try to break things the designer didn't think of. Phase 9's job is adversarial thinking, and it found something Phase 8's thorough-but-cooperative testing did not.

---

## SD-003 — Immediate Remediation of a Room-Cleanup Bypass Found in Phase 9

**Date:** Phase 9 (Security Testing)
**Risk reference:** R12 (new — see Risk Register.md)
**Status:** Implemented

### Context

R1 (unbounded room memory growth) was fixed in Phase 5 by deleting room state on `disconnect` once both slots are empty. Adversarial testing in Phase 9 found a second path to the same underlying problem: a socket that calls `join` a second time for a *different* room, without ever disconnecting from the first, leaves a permanently occupied "ghost" slot in the original room. Since no `disconnect` event ever fires for that original room, R1's cleanup logic never runs for it — the room accumulates in server memory forever, exactly like the original R1 finding, just reached by a different route.

A scripted test confirmed this directly: a single socket joining three rooms in sequence, without disconnecting between joins, left two of the three rooms permanently in memory with a phantom occupied slot each.

### Decision

Remediated immediately, for the same reasons as SD-001: this is a variant of a risk already rated High, it fully defeats a control that was believed complete, the likelihood is not theoretical (a scripted test triggered it on the first attempt, with no special conditions required), and the fix is small — free the previous room's slot before assigning a new one, exactly as if the socket had disconnected from it first.

### Rationale

This finding is also a useful data point on Phase 9's value specifically: R1's *original* fix was correctly verified against the failure mode it was designed for (join-then-disconnect). It was never tested against join-then-join-elsewhere, because that wasn't the scenario the fix was written to address. Phase 9 treating "can I defeat this control a different way" as the actual test — rather than re-running the same scenario the fix already handles — is what surfaced it.

### What this means for the Risk Register going forward

Two high-severity findings from one adversarial pass, on a codebase that had already been through Phase 5 (risk identification), Phase 7 (STRIDE), and Phase 8 (controls implemented and individually verified), is worth stating plainly rather than glossing over: **verification that a control works is not the same exercise as trying to defeat it.** Phase 9 is not a formality that comes after the real security work — for this project, it was where two of the most severe findings actually came from.
