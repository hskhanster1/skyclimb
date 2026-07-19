# Project Charter

**Project:** Sky Climb — A Security Engineering Case Study
**Owner:** Rome (Cybersecurity student, Macquarie University)
**Status:** Codebase and documentation complete through Phase 11; live hosting was completed manually outside this project's tooling

## Purpose

Sky Climb is a real-time multiplayer browser game built specifically to demonstrate Security by Design and the Secure Software Development Lifecycle (SSDLC), applied end-to-end on a real client-server application. It's not meant to read like a classroom exercise; it's structured and documented the way a security-conscious engineering organization would actually run a project.

The game itself is the vehicle, not the point. What I actually wanted out of this project was the evidence it generates: architecture decisions made and justified, a risk register that gets used instead of filed away, a threat model that actually changes how the code gets written, and a testing phase that genuinely tries to break what came before it.

## Objectives

1. Build a professional portfolio centred on demonstrating Security by Design and SSDLC principles — not game development skill for its own sake.
2. Develop practical, hands-on experience in the things GRC and security architecture roles actually do: client-server trust boundaries, threat modelling, authentication/session handling, structured logging, risk assessment, and secure coding practices.
3. Document the project the way a real organization would — architecture diagrams, a risk register, security requirements, a threat model, a testing report, and a decision log — as artifacts that stand on their own, not narration written after the fact.
4. Produce evidence-based material for LinkedIn and GitHub that presents this work as a professional case study, not a university assignment.
5. Position for early-career roles in GRC, Security Architecture, Cloud Governance, and Security Consulting — using a software engineering background to demonstrate the ability to design, assess, and secure systems, not just build them.

## Scope

**In scope:**
- A working real-time multiplayer platformer (local same-keyboard mode and online mode)
- A server-authoritative architecture where the client cannot affect game-critical outcomes
- Full SSDLC documentation: charter, requirements, architecture, threat model, risk register, security testing report, decision log, lessons learned
- Security controls proportionate to the system's actual risk profile — this is a real project, not a padded checklist

**Out of scope (deliberately):**
- User accounts, authentication beyond a session-scoped reconnection token, or any persistent user data
- Payment, monetization, or anything involving real financial or personally identifiable data
- Production-scale infrastructure (load balancing, multi-region deployment, managed database) — the project states explicitly where these constraints exist (see Architecture.md) rather than building for a scale this project doesn't need
- Bot/anti-cheat detection beyond what's documented as an accepted risk (R7)

Keeping scope deliberately bounded is itself a documented decision, not an oversight — a system with no real stakes attached shouldn't be over-engineered with controls that exist only to look thorough.

## Stakeholders

| Role | Who | Interest |
|---|---|---|
| Project owner / sole developer | Rome | Builds the system, makes and documents architectural and security decisions |
| Primary audience | Recruiters, hiring managers, technical interviewers | Reads the documentation as evidence of applied security judgement |
| End users | Anyone playing the game locally or online | Expects the game to function correctly and fairly |

## Success Criteria

- The game functions correctly in both Local and Online modes.
- The server is demonstrably authoritative for all game-critical logic (verified, not just claimed — see Risk Register).
- Every phase of the SSDLC plan produces a real, specific artifact grounded in this codebase — no generic or templated security documentation.
- At least one instance exists in the documentation of a decision that deviated from the plan for a defensible reason (see Security Decisions.md), since that's stronger evidence of judgement than perfect schedule adherence.
- The finished documentation set is something Rome could walk a technical interviewer through, phase by phase, and defend every claim in it.

## Constraints

- **Solo project, portfolio timeline.** Decisions are made without a team to review them — documented reasoning substitutes for that review, which is itself a deliberate compensating practice.
- **No real stakes.** There's no user data, no money, and no reputational risk from this system going down — risk ratings throughout this documentation reflect that honestly rather than inflating severity for dramatic effect.
- **Built incrementally, phase by phase**, with each phase's output feeding the next (e.g., the Trust Boundary diagram from Phase 6 directly shaped the STRIDE analysis in Phase 7; the Risk Register from Phase 5 was extended, not replaced, by Phase 7's findings).

## Project Plan Overview

| Phase | Focus | Status |
|---|---|---|
| 1 | Clean project structure, modular code | Complete |
| 2 | Networking foundation (Node/Express/Socket.IO) | Complete |
| 3 | Multiplayer — replace local play with online | Complete |
| 4 | Server authority over game-critical state | Complete |
| 5 | Security by Design — initial risk identification | Complete |
| 6 | Security architecture & diagrams | Complete |
| 7 | STRIDE threat modelling | Complete |
| 8 | Secure development — controls implemented | Complete |
| 9 | Security testing — adversarial verification | Complete |
| 10 | Governance & documentation | Complete |
| 11 | Deployment | Complete — deployed to Render; see Lessons Learned.md for post-deployment findings |
