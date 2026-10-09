# Art of War — engine additions

The riddles use the existing kidnAPPed puzzle model (`kind: "puzzle"`, per-player components, one `input`, judge `submit` against `games/art-of-war/answers/{stepIndex}`). No engine change is needed for riddles 1, 2 and 4.

Four new component types. Each is gated on its own `type`, so kidnAPPed and Vault.exe never hit the new code.

## Step map

| idx | id | what | input / writer |
|---|---|---|---|
| 0 | story | intro (Vault-style narrBlock) | — |
| 1 | instructions | rules | — |
| 2 | r1 | #FFD700 → זהב | P3 types |
| 3 | t1 | quote + reflection | P1 writes |
| 4 | r2 | acrostics → הונאה | P1 types |
| 5 | t2 | | P2 writes |
| 6 | r3 | camera counting → 100 | P2 types |
| 7 | t3 | | P3 writes |
| 8 | r4 | מגן | P3 types |
| 9 | t4 | | P1 writes |
| 10 | r5 | mini-games → ניצחון (`lastAnswerStep`: finish + coupons) | P2 types |
| 11 | t5 | | P3 writes |
| 12 | finale | oracle + coupon CTA (selfie via `finish.photo`) | — |

## 1. `reflection` (client + judge)

```json
{ "type": "reflection", "visibleTo": "all", "chapter": 1, "writer": 1,
  "minLength": 15, "maxLength": 120, "prompt_key": "t1.ask" }
```

- **Client:**
  - Players whose number equals `writer` and who have no `room.refl[chapter]` see a textarea, a counter and `refl.submit`.
  - Everyone else sees `refl.waiting`.
  - Once `room.refl[chapter]` exists, everyone sees the text, `refl.by`, and a `refl.continue` button (`data-action="advance"`).
- **Judge, new action `reflect` `{ stepId, text }`:**
  - Check that `room.step === stepId`.
  - Check that the caller's player number equals the component's `writer` (admins pass).
  - Trim the text, then enforce min and max length.
  - Write `refl.{chapter} = { text, by: seatName }` to the room, then `instLog` a `{ kind: "reflect", ref: chapter }` entry.
  - Copy it to `instances/{id}.reflections.{chapter}` for the collage and the oracle.
  - It is idempotent: a second write is rejected once `refl.{chapter}` exists.
- Room growth is at most 5 × 120 chars, which keeps the room doc tiny.

## 2. `counting` (client only)

```json
{ "type": "counting", "visibleTo": [1],
  "params": { "item": "assets/games/art-of-war/r3-cookie.png", "count": 10, "size": 16,
              "worldWidth": 300, "seed": 17, "camera": true } }
```

- **Container:** `position: relative`, with `overflow-x: auto` for native touch scroll. Inside it is a layer `worldWidth`% wide.
- **Camera layer:** a `<video playsinline muted autoplay>` fixed behind it.
  - It is fed by a single global `getUserMedia({ video: { facingMode: "environment" } })` stream, started from a `count.start` tap because iOS needs a gesture.
  - **Keep the stream in a module-level variable and reattach `srcObject` after every `render()`.** `innerHTML` rebuilds on every room snapshot.
- **Items:** `count` × `<img>` at seeded pseudo-random positions using mulberry32 with `seed`, rejecting overlaps.
  - `size` is a % of viewport width.
  - The positions are deterministic, so a re-render or refresh shows the same scene.
- **Fallback:** if permission is denied or there is no camera, show a dark gradient plus `count.noCamera`. The puzzle stays identical.
- No AR library and no tracking, so it works on any HTTPS browser.

## 3. `minigame` (client only)

```json
{ "type": "minigame", "visibleTo": [1], "kind": "memory|stars|rps",
  "params": { ... }, "reward_key": "r5.word1", "won_key": "mg.won" }
```

- **Kinds:**
  - `memory {pairs: 3}`: 6 face-down cards using emoji faces; flip two, and a match stays open.
  - `stars {target: 5}`: stars fall from random x positions over ~3s, and each tap catches one. A miss costs nothing.
  - `rps {wins: 2, pityAfter: 3}`: play against random picks. After `pityAfter` consecutive non-wins, the system's next pick loses, so nobody gets stuck on luck.
- **On win:** show `won_key` and a large `reward_key` word. Persist `localStorage["tt.mg." + room + "." + id] = 1` so a refresh keeps the word.
- **In-progress state:** keep it in the global `W` map so it survives snapshot re-renders.
- There is no server involvement. The words are in the locale anyway, and the puzzle is the relationship between them, not secrecy.

## 4. `oracle` (client + judge + secret)

```json
{ "type": "oracle", "visibleTo": "all", "chapters": [1,2,3,4,5] }
```

- **Client:** on render, call judge `oracle`.
  - On `{ status: "pending" }`, poll every 3s and show `oracle.loading`.
  - On `{ status: "ready", result }`, render `opening`, then 5 cards (principle word + their reflection + `perStrategy[i]`), then `cookies` under `oracle.cookies`.
- **Judge action `oracle`:**
  1. Cache doc `oracles/{roomCode}`. Use a transaction: if it is `ready`, return it. If it is `pending` and less than 60s old, return pending. Otherwise set `pending` and continue. Only the first caller ever hits Gemini.
  2. Build the input:
     - the challenge: `instance.customization[game.oracle.challengeField]`, or else `locale["custom.business_challenge.default"]`;
     - for each `game.oracle.principles` entry, its word, its quote, and `room.refl[chapter].text`;
     - the system prompt from `locale[game.oracle.system_key]`.
  3. Call Gemini with `responseMimeType: "application/json"` and a `responseSchema` of `{ opening: string, perStrategy: string[5], cookies: string[2..3] }`. Set a 20s timeout.
  4. **On any failure** (timeout, bad JSON, wrong lengths), write a fallback result built from `oracle.fallback.*` keys. **The finale never hangs.**
  5. Write `{ status: "ready", result, model, at }`, and copy `result` to `instances/{id}.oracle` for the collage.
- **Secret:** `defineSecret("GEMINI_API_KEY")`, already in Secret Manager. Declare it on `judge` with `onCall({ secrets: [GEMINI_KEY] }, …)`.
- **Model:** `config/platform.oracle.model`. **Confirm the current Gemini model id before deploy.**
- `oracles/{code}` is server-only, with no client rule, because the result reaches clients through the callable.

## 5. Collage card 2: "Our 5 Strategies" (later)

- `buildCollage` also renders `collage-strategies.jpg` (1080×1350) when `instance.reflections` exists.
- Content: the title, then 5 × (word + quote + reflection), then the cookies.
- **Hebrew needs RTL shaping in the opentype path.** Test it before anything else in this piece.

## Build order

1. `reflection`
2. `counting`
3. `oracle`, tested alone against ~10 fixture challenges first
4. `minigame`
5. Collage card

## Assets to produce (`public/assets/games/art-of-war/`)

| file | content |
|---|---|
| `r1-fastforward.jpg` | fast-forward ⏩ icon |
| `r1-chess-d7.jpg` | board, all pieces fallen, queen alone on D7 (coordinates visible) |
| `r1-toilet.jpg` | toilet (reads as "00") |
| `r3-cookie.png` | fortune cookie, transparent PNG |
| `r3-fan.png` | Chinese fan, transparent PNG |
| `r3-x.png` | big X, transparent PNG |
| `r4-p1-player.jpg` / `r4-p1-series.jpg` | defender + "המגן" series image (CC-licensed) |
| `r4-p2-player.jpg` / `r4-p2-series.jpg` | defender + series image (CC-licensed) |
| `r4-p3-player.jpg` / `r4-p3-ambulance.jpg` | defender + MDA ambulance (CC-licensed) |
| `cover.jpg` | already exists |

Riddle 2 has no images, by design: the poems are the visual.
