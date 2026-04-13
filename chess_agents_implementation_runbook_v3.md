# Chess Agents Arena Engine — Verified Implementation Runbook (v3)

## Status

This runbook is for building a **single-file JavaScript engine** for the live Chess Agents arena using an **adapt-first** strategy.

It is designed to be used by:
- **Architect** — strategy and keep/kill decisions
- **Runbook Author** — milestone prompt generation
- **Builder** — code adaptation and testing
- **Gate Reviewer** — legality, timing, compliance, state-reset checks
- **Arena Analyst** — post-submission match review

This version incorporates post-review improvements:
- adaptive time management instead of flat near-max allocation
- concrete conversion-tuning starting values
- embedded opening book integration
- lightweight endgame knowledge module
- **C1 removed as a submission candidate** and retained only as a local benchmark
- explicit **Lozza Phase 1 I/O risk warning**
- explicit **tomitank faster-to-port fallback path**
- tournament sizing guidance
- move-time distribution analysis after submission

---

## 1) Verified Live Constraints

These are the constraints that should be treated as **confirmed** for the public Chess Agents arena:

- Submissions are **simple Python or JavaScript chess agents**
- The arena probes engines with a **FEN string**
- Engines remain loaded in the worker for the full **10-game match cycles**
- Engines have **5 seconds per move**
- **Standard library only**; **no external packages**
- Matches are scheduled every **30 seconds**
- Unlimited engines per account are allowed, but flooding is not

### Important Note

The public arena page confirms **FEN probing**, but does **not publicly confirm** the exact stdin/readline protocol used internally.

Therefore, the implementation must treat the exact local wrapper contract as a **working harness assumption**, not a public guarantee.

---

## 2) Strategic Decision

### Primary language
Use **JavaScript**.

Reason:
- The strongest adaptation candidates are already JavaScript engines.
- This reduces adaptation risk and preserves more upstream strength.
- Single-file JavaScript is already a natural fit for the arena format.

### Primary engine bases
Build in parallel from two clean upstream families:

- **Lozza**
- **tomitankChess**

Do **not** decide the winner in theory.
Decide it empirically after legality, timing, and local match testing.

### Licensing rule
Keep these engine families fully separate:
- **Lozza** branch stays Lozza-only
- **tomitank** branch stays tomitank-only

Do not mix code between them.

---

## 3) Core Architecture Rule

## The incoming FEN is always authoritative.

Persistent process state is an advantage, but it can also create stale-state bugs.

So the engine must:
- attempt continuity reuse only when continuity is actually proven
- otherwise rebuild the internal board from the incoming FEN
- reset only game-specific history when continuity is broken
- preserve safe long-lived allocations like TT only when appropriate

This rule is non-negotiable.

---

## 4) Branch Plan

Create these branches:

### A1 — Lozza Minimal Port
Thin arena wrapper.
Preserve native search and evaluation as much as possible.

### A2 — Lozza Conversion Tune
Start from A1.
Make only small, measurable changes aimed at reducing sterile draws and improving conversion.

### B1 — tomitank Minimal Port
Thin arena wrapper.
Preserve native search and evaluation as much as possible.

### B2 — tomitank Time/Conversion Tune
Start from B1.
Tune around the arena's 5-second budget and reduce draw bias.

### C1 — Surfing Llama Benchmark Only
Use only as a local sparring partner and sanity check.
Do not invest serious builder time here.
Do not submit it to the arena except as a last-resort emergency fallback if all imported branches fail.

---

## 5) Build Philosophy

### What not to do
- Do not build from scratch first
- Do not rewrite search without evidence
- Do not bolt on random features because they sound strong
- Do not assume every incoming FEN continues the previous position
- Do not overfit to one pretty test position
- Do not spend hours fighting a stubborn I/O layer before switching branches

### What to do
- Preserve upstream engine strength
- Keep the wrapper thin
- Fix legality before strength
- Fix timing before tuning
- Tune conversion only after the port is stable
- Prefer targeted, parameterized changes over large conceptual rewrites
- Fail fast when a branch's I/O architecture resists clean adaptation

---

## 6) Repository Layout

Recommended layout:

```text
/chess-agents-build/
  /lozza-port/
  /tomitank-port/
  /surfing-llama-benchmark/
  /harness/
  /tests/
  /reports/
  /artifacts/
```

Each engine family should also keep:
- untouched upstream snapshot
- working adaptation branch
- final single-file submission build

---

## 7) Phase-by-Phase Build Plan

## Phase 0 — Import and freeze upstreams

### Objective
Prepare clean upstream baselines.

### Builder tasks
- Import Lozza into `/lozza-port/upstream`
- Import tomitank into `/tomitank-port/upstream`
- Preserve untouched original files
- Record upstream release/tag/date in notes
- Add local policy note:
  - no external packages
  - no `fs`
  - no `child_process`
  - no sockets/network
  - no debug spam on stdout

### Gate
Pass only if:
- upstream copies are untouched
- engine families are isolated
- working branch starts from clean upstream

---

## Phase 1 — Arena wrapper port

### Objective
Wrap the engine for arena-style repeated FEN requests.

### Required behavior
- accept a FEN from the harness
- build or update engine state from that FEN
- search for one legal move
- print exactly one move
- stay alive across repeated calls

### High-risk note for A1 / A2 (Lozza)
Lozza explicitly presents itself as a JavaScript UCI engine that is easy to deploy using a **Web Worker**, while also saying it can be used with traditional Node-based chess UIs. That means the builder may need to strip or bypass a message-oriented layer cleanly without damaging the search loop.

**Rule:** if the Lozza wrapper adaptation becomes tangled or invasive during Phase 1, do not fight it indefinitely. Move immediately to **B1** and get one stable import through Phase 4 first.

### Lower-risk note for B1 / B2 (tomitank)
tomitank explicitly documents Node/Arena usage and separately documents browser/WebWorker usage. That makes its Node/UCI path a strong fallback if Lozza's I/O boundary proves more awkward than expected.

### Builder instructions
- remove or bypass the UCI shell only as much as necessary
- preserve core search/eval logic
- keep stdout clean
- avoid unnecessary architecture rewrites

### Gate
Must pass:
- start position FEN -> legal move
- repeated same FEN -> legal move, no crash
- unrelated FEN after prior call -> legal move, no stale state
- tactical/check position -> legal move only
- no extra stdout text

---

## Phase 2 — Persistence reconciliation

### Objective
Exploit persistence safely.

### Builder instructions
Implement a reconciliation layer:
- if continuity is proven, reuse position-linked state
- if continuity is not proven, rebuild from FEN
- keep safe long-lived allocations when possible
- reset game-sequence history when continuity breaks

### Gate
Must pass:
- ordered opening sequence test
- unrelated middlegame FEN after sequence
- new start position after deep sequence
- same FEN repeated many times
- no state corruption
- no stale TT-driven illegal output

---

## Phase 3 — Adaptive time management

### Objective
Use the 5-second budget aggressively, not uniformly.

### Principle
Do **not** spend 4 seconds on every move.
Spend time based on position complexity and urgency.

### Initial time buckets
Use these as starting defaults, then tune:

- **Forced / trivial move:** 150ms to 500ms
  - single legal move
  - obvious recapture
  - known book move
  - tablebase / hardcoded won-ending move

- **Simple position:** 500ms to 1200ms
  - low branching factor
  - quiet position with stable evaluation
  - clear principal variation after shallow search

- **Normal position:** 1200ms to 2800ms
  - ordinary middlegame
  - several candidate moves
  - no tactical explosion detected

- **Critical position:** 3200ms to 4600ms
  - large root move ambiguity
  - king attack
  - tactical volatility
  - major evaluation swings between iterations
  - endgame conversion decision that changes result class

### Safety rules
- keep a hard stop below 5000ms
- reserve a final safety buffer
- abort extra iteration if last completed iteration was too expensive
- prefer finishing one more complete iteration over half-starting a doomed one

### Complexity signals for time allocation
Use a weighted mix of:
- legal move count
- root candidate count after ordering
- fail-high / fail-low instability
- best-move changes between iterations
- check status / king exposure
- capture density
- promotion threats
- recent evaluation oscillation

### Fallback if search hooks are unavailable
If the thin-wrapper adaptation does not expose enough internal search signals cleanly, fall back to a simple policy:

- **Opening:** less time because embedded book should cover many early moves
- **Early middlegame / middlegame:** more time
- **Simplified endgame:** less time because fewer pieces and lower branching
- **Forced-check / forced-recapture situations:** minimum bucket

Use piece count, move number, and legal move count as fallback proxies.
Do not invade search internals deeply just to build a fancy complexity meter.

### Builder instructions
Add adaptive time management first as a thin policy layer.
Do not deeply rewrite search unless the engine cannot honor the budget safely.

### Gate
Run at least 10 positions:
- starting position
- quiet middlegame
- tactical middlegame
- endgame
- promotion race
- rook ending
- queen ending
- heavy attack
- forced defense
- awkward king safety position

Reject any branch that overruns the local limit.
Also reject branches that waste near-max time on clearly trivial positions.

---

## Phase 4 — Legality gauntlet

### Objective
Make the engine submission-safe.

### Required legality coverage
- castling
- en passant
- promotion
- check evasions
- pinned pieces
- discovered checks
- stalemate
- checkmate
- no-legal-move handling

### Gate
Hard fail on:
- illegal move
- malformed move string
- crash
- undefined output
- extra stdout logging

---

## Phase 5 — Embedded opening book

### Objective
Get zero-cost early-game strength and consistency.

### Rules
- book must be embedded in the single file
- no file loading at runtime
- deterministic by default
- every book move must be legality-verified against the engine's move generator
- easy to disable with a single flag for testing

### Scope
Start with a compact but strong book:
- major e4/e5 structures
- Sicilian main replies
- French / Caro-Kann / Scandinavian coverage
- Queen's Gambit / Slav / Semi-Slav structures
- Indian defenses
- English / Réti coverage

### Target depth
Aim for roughly:
- 5 to 10 plies of reliable, curated lines
- broader coverage preferred over one ultra-deep trap line

### Builder instructions
Implement a small embedded opening book as a deterministic lookup keyed from normalized opening position representation or hash. Keep it compact and easy to audit.

### Gate
- book move must always be legal
- book move lookup must be fast
- book must never emit a move unavailable in the current position
- turning book off must not break normal search flow

---

## Phase 6 — Lightweight endgame knowledge

### Objective
Convert simple wins and avoid unnecessary draws.

### Allowed scope
Do not attempt full tablebase integration.
Use lightweight hardcoded endgame knowledge only.

### First targets
- KPK
- KQK
- KRK

### Optional later targets
- KBNK
- simple opposition / triangulation helpers
- rook-pawn + wrong bishop heuristics if already cheap to encode

### Implementation guidance
This can be:
- explicit hardcoded rules
- tiny lookup logic
- specialized evaluation overrides
- direct move selection in clearly solved micro-endgames

### Builder instructions
Add endgame knowledge only after legality and timing are stable. Keep the module small, deterministic, and isolated.

### Gate
- no regression in legal move output
- no time-management regression
- clearly improved conversion in won micro-endgames
- no false "won" logic in drawn positions

---

## Phase 7 — Minimal strength tuning

### Objective
Increase win conversion without destabilizing the port.

### Rule
All tuning must be:
- small
- isolated
- reversible
- measurable

No giant speculative rewrites.

### Initial concrete tuning values
Use these as **starting points for testing**, not permanent truths:

- **Contempt toward draw scores:** +10, +15, +20 centipawns test set
- **Repetition discouragement at root when eval is positive:** -20, -30, -40 centipawns
- **Only apply repetition discouragement when static or search eval is at least mildly positive**
  - suggested threshold tests: +30cp, +50cp
- **No anti-draw bias when objectively worse**
- **Prefer safer conversion when materially ahead**
  - small bonus tests: +10 to +25 centipawns for simplification into favorable endgames

### A2 tuning priorities
- mild anti-draw bias
- discourage repetition when mildly better
- slightly more assertive root selection in unbalanced equal positions

### B2 tuning priorities
- better usage of full move budget
- reduced passive repetition-seeking
- preserve core search structure unless profiling clearly justifies a change

### Builder instructions
Create a lightly more aggressive conversion-tuned branch using the initial value grid above.
Do not freehand "play more aggressively."
Every tuning change must have:
- parameter name
- tested values
- before/after result notes

### Gate
Compare tuned branch vs minimal parent:
- keep only if score improves or draw rate clearly drops
- reject if timing, legality, or stability regresses
- prefer lower draw rate only when losses do not rise disproportionately

---

## Phase 8 — Compliance flattening

### Objective
Produce final submission file.

### Builder tasks
- flatten to one final JavaScript file
- remove debug hooks
- remove dead code
- remove test harness noise
- confirm clean stdout

### Local house-rule compliance
- single file
- no external packages
- no `fs`
- no `child_process`
- no network access
- no extra output

### Gate
Hard reject if any forbidden dependency or noisy output remains.

---

## Phase 9 — Local tournament selection

### Objective
Choose the first live submissions.

### Internal tournament
Run:
- A1 vs B1
- A2 vs B2
- benchmark matches vs C1 only for sanity
- minimal-port winner vs tuned-port winner

### Match count guidance
Use:
- **50 games minimum per pairing**
- **100 games preferred per pairing**

Do not read too much into tiny samples.

### Runtime planning
These runs are likely long enough to justify:
- overnight batches
- automated reporting
- crash / timeout logging
- draw-rate and move-time summaries

### Selection rule
First wave should submit:
1. strongest stable branch
2. strongest lower-draw alternative branch

Do not submit C1 unless every imported branch catastrophically fails.
Do not spam submissions.
Use the arena to compare purposeful variants, not random churn.

---

## 8) Builder Prompts

## Prompt 1 — Harness Port
Port this engine to the Chess Agents arena model with the thinnest possible wrapper. Treat every incoming FEN as authoritative. Preserve native search and evaluation. Keep the process alive across repeated calls. Output exactly one legal move and nothing else.

## Prompt 2 — Persistence Reconciliation
Add a reconciliation layer that opportunistically reuses state only when FEN continuity is proven. Otherwise rebuild board state from FEN and reset only game-specific history, not all long-lived engine allocations.

## Prompt 3 — Adaptive Time Layer
Add adaptive time management for a 5-second-per-move budget. Use small time buckets for forced or trivial positions and spend the full budget only on complex or critical positions. If search-internal complexity hooks are not cleanly available, fall back to a simple move-number, piece-count, and legal-move-count policy.

## Prompt 4 — Legality Fixes
Fix only legality, malformed move output, stale-state issues, and no-move handling. Do not make speculative strength edits.

## Prompt 5 — Embedded Opening Book
Add a compact embedded opening book with deterministic lookup and full legality verification. No runtime file access. Keep the book easy to disable for testing.

## Prompt 6 — Lightweight Endgame Knowledge
Add a small isolated endgame module for KPK, KQK, and KRK only if it stays legal, fast, and deterministic.

## Prompt 7 — Concrete Conversion Tune
Create a lightly more aggressive branch using explicit tested values for draw contempt, repetition discouragement when better, and endgame simplification preference. Record the tested parameter values and outcomes.

## Prompt 8 — Submission Flattening
Produce a single-file submission build with no external dependencies, no debug output, and clean stdout.

---

## 9) Gate Reviewer Rubric

### Immediate reject reasons
- illegal move
- crash
- timeout
- stale-state bug after unrelated FEN
- extra stdout text
- cross-family code mixing
- compliance failure

### Positive signals
- lower draw rate
- strong tactical conversion
- good endgame stability
- calm time behavior
- minimal invasive edits
- reproducible local behavior
- fast trivial-move handling
- strong opening consistency without book bugs

---

## 10) Arena Analysis After Submission

Once live, review each engine for:

- opening leaks
- tactical blindness
- poor king safety handling
- weak endgame conversion
- draw bias
- time trouble
- stale-state behavior not seen locally

### Also track move-time distribution
Do not look only at wins and losses.
Track whether the engine is:
- consistently using too little time
- over-spending in trivial positions
- under-spending in critical positions
- showing unstable timing by phase of game

Move-time distribution is a tuning signal, not just a diagnostic footnote.

Use arena results to decide:
- keep
- tune
- retire

---

## 11) Final Recommendation

First wave:
- Build **A1**
- Build **A2**
- Build **B1**
- Build **B2**
- Keep **C1** only as benchmark

Then:
- pass local legality
- pass timing
- pass persistence reset tests
- pass book legality checks
- pass micro-endgame checks
- submit the strongest safe branch and the strongest low-draw branch

That is the highest-probability path to getting on ladder quickly without sabotaging a strong upstream engine.

---

## 12) Verified Source Notes for the Team

### Chess Agents arena
Publicly confirmed:
- Python/JavaScript agents
- FEN validation
- persistent runtimes across 10-game cycles
- 5 seconds per move
- standard library only
- unlimited engines allowed
- 30-second scheduling cadence

### Lozza
Publicly stated:
- JavaScript UCI engine
- single-file `lozza.js`
- MIT license
- can be deployed using a Web Worker
- can also be used with traditional chess user interfaces via Node
- quantized 768->(256*2)->1 NNUE
- trained on about 600M positions

### tomitankChess
Publicly stated:
- pure JavaScript engine
- GPL-3.0 license
- runs with Node and UCI GUI
- also supports browser/WebWorker usage
- v6.0 estimated around 3020 CCRL 40/40
- notes mention faster NPS and better draw detection
- notes mention short-time-control lag subtraction
- TODO still mentions better time management

---

End of runbook.
