# Security Requirements

**Status:** Phase 10; derived retrospectively from the Risk Register and Threat Model, then used to check every requirement traces to an implemented, verified control
**Format:** Each requirement is a testable SHALL statement, traced to the Risk Register ID it addresses and the phase/test that verified it.

I want to be upfront that writing these after the fact, instead of before Phase 5, isn't how it should go on a real project. Security requirements should exist before implementation starts. Here, they're extracted from decisions that were already made and tested, specifically so I could check this document for gaps afterward. See the end of this file.

## Trust & Authority

| ID | Requirement | Traces to | Verified |
|---|---|---|---|
| SR-1 | The server SHALL be the sole authority for player position, physics, collision, score, and win conditions. The client SHALL NOT be able to influence any of these by any message it sends. | Phase 4 design decision; Trust Boundary diagram | Yes — architecture review, Phase 9 adversarial testing found no bypass |
| SR-2 | The client SHALL be permitted to send only a fixed-shape input payload (`left`, `right`, `jump`), and nothing else SHALL be trusted from it. | Phase 4; Trust Boundary diagram | Yes |

**On least privilege:** there's no role hierarchy, no admin surface, and no persistent identity in this system to scope permissions against, so least privilege in the traditional sense doesn't map cleanly onto it. This is a deliberate scope call (see Project Charter, "Out of scope"), not an oversight. The closest analogue is the trust boundary itself: SR-2 already gives the client exactly the privilege it needs, the ability to send input intent, and nothing more. That's least privilege applied at the only boundary this system actually has.

## Input Validation

| ID | Requirement | Traces to | Verified |
|---|---|---|---|
| SR-3 | The server SHALL coerce all client-supplied input fields to strict booleans before use, regardless of the type actually received. | R4 | Yes — Phase 8 implementation, Phase 9 adversarial test (non-boolean/object payloads) |
| SR-4 | The server SHALL validate `roomId` against a fixed charset and length before use, and SHALL reject anything that doesn't match. | R6 | Yes — Phase 8, Phase 9 adversarial test (5 invalid formats, all rejected) |
| SR-5 | The server SHALL treat every incoming socket event payload as untrusted, including its absence or unexpected type (`null`, `undefined`, wrong type), and SHALL NOT allow a malformed payload to crash the process. | R11 | Yes — Phase 9 found this violated (see SD-002), fixed and re-verified in the same phase |

## Availability

| ID | Requirement | Traces to | Verified |
|---|---|---|---|
| SR-6 | The server SHALL free all resources (room state, slots) associated with a client that disconnects or otherwise leaves a room, including if it leaves by joining a different room rather than disconnecting. | R1, R12 | Yes — Phase 5 (R1) and Phase 9 (R12, see SD-003) |
| SR-7 | The server SHALL rate-limit `join` and `input` events per connection. | R2 | Yes — Phase 8, Phase 9 (flood test confirmed rejection, not just non-crash) |
| SR-8 | The server SHALL disconnect any socket that does not join a room within a bounded time window. | R10 | Yes — Phase 8 |
| SR-9 | An unhandled exception in one connection's event handling SHALL NOT terminate the process or affect other active connections/rooms. | R11 | Yes — Phase 9 (per-handler `try`/`catch` + process-level safety net) |

## Session Integrity

| ID | Requirement | Traces to | Verified |
|---|---|---|---|
| SR-10 | A disconnected player SHALL be able to reclaim their exact match state (position, score) within a bounded grace period, using a token issued only to them. | R3 | Yes — Phase 8, Phase 9 (token-guessing attack against an active slot failed) |
| SR-11 | A guessed or stolen-but-inactive token SHALL NOT grant access to an actively-connected player's slot. | R3 | Yes — Phase 9 adversarial test |

## Information Disclosure

| ID | Requirement | Traces to | Verified |
|---|---|---|---|
| SR-12 | The server SHALL NOT return internal error details (stack traces, file paths) to a client under any configuration. | R9 | Yes — Phase 8 (explicit error handler, not dependent on `NODE_ENV`) |
| SR-13 | The server SHALL NOT advertise its underlying framework via HTTP headers. | R9 | Yes — Phase 8 (`x-powered-by` disabled) |

## Accountability

| ID | Requirement | Traces to | Verified |
|---|---|---|---|
| SR-14 | The server SHALL maintain a persistent, timestamped log of connection and match lifecycle events, surviving a process restart. | R8 | Yes — Phase 8 |

## Deployment

| ID | Requirement | Traces to | Verified |
|---|---|---|---|
| SR-15 | The server SHALL restrict cross-origin access to the deployed client's actual origin in any environment other than local development. | R5 | Yes — `ALLOWED_ORIGIN` set to the live deployed domain post-launch; see Lessons Learned for post-deployment findings |

## Gaps found while writing this document

- **No requirement exists for token confidentiality in transit.** SR-10/SR-11 assume the token isn't already compromised, but nothing in these requirements addresses *how* it's protected in transit (i.e., requiring HTTPS/WSS). That's implicitly a Phase 11 deployment concern, but it should have an explicit requirement here rather than living only in Architecture.md's network diagram.
- **No requirement addresses maximum concurrent rooms.** Same gap identified independently in Software Requirements.md; recorded here too since it's a security-relevant capacity limit (R1/R12 fix rooms that get abandoned, not rooms that are merely numerous).
