# Vibe Cup v1 — Base Challenge

This is the challenger-facing repository for the Vibe Cup chess competition.

## Challenge

You are building a chess agent that plays full standard chess games against other submissions in a round robin tournament.

### Input
Your program receives a single chess position in [**FEN**](https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation) on stdin.

Example FEN:

```text
rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
```

FEN fields:
1. Piece placement
2. Side to move (`w` or `b`)
3. Castling availability
4. En passant target square or `-`
5. Halfmove clock
6. Fullmove number

### Output
Your program must print **one UCI move** on stdout, for example:

```text
e2e4
```

Other valid examples:
- `g1f3`
- `e7e8q` for promotion to queen
- `e1g1` for king-side castling

Only one move should be printed per turn.

## Submission structure

Your submission repo must contain a **single runnable TypeScript entry file** at the root:

```text
agent.ts
```

The file must be directly runnable by the tournament harness. No extra source tree is required.

### Dependency policy
- **No external runtime dependencies** are allowed by default.
- Use the Node.js standard library only.
- You may bundle or transpile locally, but the submitted repo/artifact must remain small and self-contained.
- Recommended size cap: **10 MB zipped** total repository size.

## Time limits

The event is optimized for a full round robin that should finish in roughly 30 minutes.

Recommended defaults:
- **Think time per move:** `250 ms`
- **Hard per-move timeout:** `1000 ms`
- **Total compute budget per submission:** `25 minutes`

If a submission exceeds the hard timeout, it loses that move.
If it exceeds the total budget, remaining games may be forfeited or capped by the admin harness.

## Game rules

Standard chess rules apply.

Edge cases:
- **Illegal move:** immediate loss
- **Timeout:** immediate loss
- **Crash / invalid output / malformed UCI:** immediate loss
- **Checkmate:** normal win/loss
- **Stalemate:** draw
- **Threefold repetition:** draw
- **50-move rule:** draw
- **Insufficient material:** draw
- **Resignation:** loss

Initial implementation should use standard chess only. If the event proves too easy, the rules can be tightened later.

## Sample agent

This repo includes a sample TypeScript agent that:
1. parses the FEN position
2. generates all legal moves
3. picks one at random
4. prints exactly one UCI move

That is the starting point challengers will fork and improve.

## Expected repo layout

```text
agent.ts
README.md
```

Optional local files such as `package.json` or a build config may exist, but the judge should only require the runnable entry point.

## Example invocation

```bash
node agent.js < input.fen
```

or, if TypeScript execution is wired directly:

```bash
npx tsx agent.ts < input.fen
```

The harness should document the exact runtime it uses.
