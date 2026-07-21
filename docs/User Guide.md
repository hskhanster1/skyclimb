# User Guide

How to actually play Sky Climb. For how it's built, see `Architecture.md`; this is just the game.

## The goal

Two players climb the same cave shaft at the same time, jumping between procedurally generated platforms. Whoever is highest when the timer runs out wins. Both players climb an identical platform layout, so neither side gets an easier route.

## Modes

**Local:** both players share one keyboard, side by side on screen.
**Online:** each player is on their own device, connected through a shared room code.

Pick a mode from the title screen.

### Local mode

- Player 1: `W` `A` `D` (jump / left / right)
- Player 2: `↑` `←` `→` (jump / left / right)

Click **CLICK TO START** once both players are ready, then climb. Restart at any time with the **RESTART** button, or go back to the mode picker with **MENU**.

### Online mode

1. Enter a room code (or use the default one shown) and hit **CONNECT**.
2. Share that same code with whoever you're playing against. The second person to connect with it joins your match.
3. Once both players are in, the match starts automatically.
4. Move with `A`/`D` or `←`/`→`, jump with `W` or `↑`.

**RESTART** resets the match in place: fresh platforms, both players back to 0m, timer reset. It doesn't touch your connection, so it works mid-match without triggering a reconnect. **MENU** disconnects and takes you back to the mode picker.

**If your connection drops mid-match:** you have 15 seconds to reconnect with the same room code and reclaim your exact spot, position and score included. Your opponent sees a "connection dropped, waiting" message during that window. If you don't reconnect in time, the slot opens up and the match can't be resumed from where it left off.

**Room codes aren't private lobbies.** Anyone with the code can join. Treat it like a shared password: pick something specific between you and whoever you're playing, not something guessable.

### Mobile controls

On a touch device, Online mode shows on-screen controls automatically: two arrow buttons in the bottom-left for movement, one larger jump button in the bottom-right. Same input as the keyboard underneath; nothing server-side treats a tap any differently from a keypress. Works with either thumb held down at once, so moving and jumping at the same time is fine.

Local mode doesn't get touch controls. It's built around two people sharing one keyboard, which doesn't translate to one phone screen; play that mode on a desktop or laptop instead.

## Timer

Choose 30 seconds, 60 seconds, or unlimited (∞) before a match starts. In timed modes, whoever's climbed higher when time runs out wins; equal height is a draw. Unlimited mode has no automatic winner; it's for casual/practice climbing, and a match only ends when someone hits Restart.

In Online mode, whoever creates the room sets the timer; the second player inherits that setting.

## Scoring

Height is measured in metres and shown live for both players in the HUD. It only ever goes up. Falling doesn't cost you height, it just costs you time getting back to where you were.

## Notes

- Crystal-lit platforms are visual variety only, no gameplay effect; they're the same as any other platform.
- Both players always see the identical platform pattern; it's generated once per match and shared, not rolled separately per player.
