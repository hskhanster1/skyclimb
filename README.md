# Sky Climb

A real-time multiplayer platformer built as a **security engineering case study**. The game itself is the vehicle, not the point. This project demonstrates Security by Design and the Secure Software Development Lifecycle (SSDLC) applied to a client-server application: architecture decisions, threat modelling, server-authoritative design, and secure coding practices, all documented the way a real organisation would do it.

## What this is

Two players race to climb as high as possible before time runs out, playing either on one keyboard or over the internet against a friend. Under the hood, the server is authoritative for all game-critical logic (positions, physics, timer, win conditions); the client only renders and sends input, which is the same trust model any real-time networked application needs to defend against a modified or malicious client.

## Project structure

```
skyclimb/
├── client/       # Browser game: HTML, CSS, and modular JS (rendering, input, physics)
├── server/       # Node.js + Express + Socket.IO server, authoritative game state
├── docs/         # Architecture, risk, and threat-modelling documentation (SSDLC artifacts)
├── render.yaml   # One-click deploy blueprint for Render
├── README.md
├── LICENSE
└── package.json
```

## Running it locally

```bash
npm install
npm start
```

Then open `http://localhost:3000` in a browser. Pick **Local** to play both players on one keyboard, or **Online** to open a room and connect from a second browser/device.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `ALLOWED_ORIGIN` | `*` | Restricts CORS / Socket.IO origin. Should be set to the deployed client's domain in production (see Risk Register R5). |

## Notable behavior

- **Reconnection:** if a player's connection drops mid-match, the match pauses (not ends) for up to 15 seconds while they reconnect. A reconnection token issued on join lets them reclaim their exact slot: position, height, and the timer all resume untouched. See Risk Register R3.
- **Logging:** connection and match events are logged to `server/logs/events.log` as newline-delimited JSON, in addition to the console. See Risk Register R8.

## Project plan

This project was built in phases, moving from a working local game through networking, server authority, and a full security engineering pass (threat modelling, secure coding controls, security testing, and governance documentation). See `docs/Project Charter.md` for the full phase plan and status.

## Documentation

Everything below is a real artifact grounded in this specific codebase, not templated security documentation:

| Document | What it covers |
|---|---|
| [User Guide](docs/User%20Guide.md) | How to actually play — modes, controls, timer, scoring |
| [Project Charter](docs/Project%20Charter.md) | Purpose, objectives, scope, and the 11-phase plan |
| [Software Requirements](docs/Software%20Requirements.md) | Functional/non-functional requirements, plus gaps found writing them retrospectively |
| [Security Requirements](docs/Security%20Requirements.md) | Testable SHALL statements, each traced to a Risk Register ID and its verification |
| [Architecture](docs/Architecture.md) | 5 diagrams — high-level, data flow, trust boundary, component, network — with decisions and trade-offs |
| [Threat Model](docs/Threat%20Model.md) | STRIDE analysis, built on top of (not separate from) the Risk Register |
| [Risk Register](docs/Risk%20Register.md) | All 12 identified risks, their status, and how each was verified |
| [Security Testing Report](docs/Security%20Testing.md) | Adversarial test results — including two critical bugs found by trying to break the system, not just verify it |
| [Security Decisions](docs/Security%20Decisions.md) | A log of decisions that deviated from the plan, and why — including two real production-crashing bugs fixed on the spot |
| [Lessons Learned](docs/Lessons%20Learned.md) | What worked, what was harder than expected, what would change next time |

Worth reading first if you're short on time: **Security Testing.md**, specifically the finding that a single malformed packet (`socket.emit('join', null)`) crashed the entire server. Found and fixed during a dedicated adversarial-testing phase that Phase 8's own verification testing never would have caught.

## License

MIT. See `LICENSE`.
