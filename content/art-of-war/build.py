# Generates game.json + answers.private.json. Locale is authored by hand in locales/he.json.
import json
A = "assets/games/art-of-war/"
ALL = "all"
def C(id, type, vis, **kw): return {"id": id, "type": type, "visibleTo": vis, **kw}
def title(id, vis): return C(id, "title", vis, text_key=id)
def sub(id, vis):   return C(id, "subtitle", vis, text_key=id)
def text(id, vis):  return C(id, "text", vis, text_key=id)
def img(id, vis, src): return C(id, "image", vis, src=A + src)
def inp(id, vis, r): return C(id, "input", vis, placeholder_key="common.answer",
                              hints=[f"{r}.h1", f"{r}.h2"], outcome_key=f"{r}.out")

def player_block(r, p, image=None, images=()):
    out = [title(f"{r}.p{p}.t", [p]), text(f"{r}.p{p}.b", [p])]
    for i, s in enumerate(([image] if image else []) + list(images)):
        out.append(img(f"{r}.p{p}.img{i+1}", [p], s))
    return out

def riddle(r, submitter, blocks):
    comps = []
    for b in blocks: comps += b
    comps.append(sub(f"{r}.q", ALL))
    comps.append(inp(f"{r}.in", [submitter], r))
    return {"id": r, "kind": "puzzle", "advanceOnSolve": True, "components": comps}

def tzu(n, writer):
    t = f"t{n}"
    return {"id": t, "kind": "screen", "components": [
        title(f"{t}.t", ALL),
        C(f"{t}.quote", "quote", ALL, text_key=f"{t}.quote", who_key="tzu.who"),
        text(f"{t}.prompt", ALL),
        C(f"{t}.refl", "reflection", ALL, chapter=n, writer=writer,
          minLength=15, maxLength=120, prompt_key=f"{t}.ask"),
    ]}

def counting(id, p, item, emoji, count, size, world=300):
    return C(id, "counting", [p], params={"item": A + item, "emoji": emoji, "count": count, "size": size,
                                          "worldWidth": world, "seed": p * 17, "camera": True})

def minigame(id, p, kind, params, reward):
    return C(id, "minigame", [p], kind=kind, params=params, reward_key=reward,
             won_key="mg.won", name_key=f"{id}.name")

steps = [
  {"id": "story", "kind": "screen", "components": [
      C("st.c", "cta", ALL, action="advance", label_key="screens.story.ready")]},
  {"id": "instructions", "kind": "screen", "components": [
      C("in.c", "cta", ALL, action="advance", label_key="screens.instructions.ready")]},

  # Riddle 1 — FF + D7 + 00 = #FFD700 = gold. P3 types.
  riddle("r1", 3, [player_block("r1", 1, "r1-fastforward.jpg"),
                   player_block("r1", 2, "r1-chess-d7.jpg"),
                   player_block("r1", 3, "r1-toilet.jpg")]),
  tzu(1, 1),

  # Riddle 2 — acrostics שלוש / ארבע → line 3, word 4 of P1's poem = הונאה. P1 types. No images.
  riddle("r2", 1, [player_block("r2", 1), player_block("r2", 2), player_block("r2", 3)]),
  tzu(2, 2),

  # Riddle 3 — camera counting: 10 cookies × 10 fans = 100. P2 types.
  riddle("r3", 2, [player_block("r3", 1) + [counting("r3.count1", 1, "r3-cookie.png", "🥠", 10, 16)],
                   player_block("r3", 2) + [counting("r3.count2", 2, "r3-x.png", "❌", 1, 60, 100)],
                   player_block("r3", 3) + [counting("r3.count3", 3, "r3-fan.png", "🪭", 10, 16)]]),
  tzu(3, 3),

  # Riddle 4 — מגן (defender / series / MDA). P3 types.
  riddle("r4", 3, [player_block("r4", 1, images=["r4-p1-player.jpg", "r4-p1-series.jpg"]),
                   player_block("r4", 2, images=["r4-p2-player.jpg", "r4-p2-series.jpg"]),
                   player_block("r4", 3, images=["r4-p3-player.jpg", "r4-p3-ambulance.jpg"])]),
  tzu(4, 1),

  # Riddle 5 — three mini-games → שער / נאום / מצעד → ניצחון. P2 types.
  riddle("r5", 2, [player_block("r5", 1) + [minigame("r5.mg1", 1, "memory", {"pairs": 3}, "r5.word1")],
                   player_block("r5", 2) + [minigame("r5.mg2", 2, "stars", {"target": 5}, "r5.word2")],
                   player_block("r5", 3) + [minigame("r5.mg3", 3, "rps", {"wins": 2, "pityAfter": 3}, "r5.word3")]]),
  tzu(5, 3),

  {"id": "finale", "kind": "screen", "components": [
      C("fin.oracle", "oracle", ALL, chapters=[1, 2, 3, 4, 5]),
      C("fin.cta", "cta", ALL, action="coupon", label_key="finale.button")]},
]

idx = {s["id"]: i for i, s in enumerate(steps)}
game = {
  "gameId": "art-of-war",
  "title_key": "meta.title",
  "N": 3,
  "defaultLanguage": "he",
  "published": False,
  "stepCount": len(steps),
  "lastAnswerStep": idx["r5"],
  "finish": {"photo": True},
  "scoring": {"start": 100, "solve": 100, "mistake": -5, "hints": [-10, -15],
              "timeBonus": [{"underMin": 30, "bonus": 100}, {"underMin": 60, "bonus": 50}]},
  "store": {"seatOptions": [3, 6], "testRoom": "AOW1", "cover": "assets/games/art-of-war/cover.jpg",
            "blurb_key": "store.blurb"},
  "texts": {s: {"plot": f"{s}.plot"} for s in ["story", "instructions", "finale"]},
  "oracle": {
      "system_key": "oracle.system",
      "fallback_keys": ["oracle.fallback.cookie1", "oracle.fallback.cookie2", "oracle.fallback.cookie3"],
      "principles": [{"chapter": n, "word_key": f"t{n}.word", "quote_key": f"t{n}.quote"} for n in range(1, 6)],
      "challengeField": "business_challenge",
  },
  "customizable": [
    {"key": "team_name", "label_key": "custom.team_name", "type": "text",
     "default_key": "custom.team_name.default", "maxLength": 30},
    {"key": "business_challenge", "label_key": "custom.business_challenge", "type": "text",
     "default_key": "custom.business_challenge.default", "maxLength": 200, "multiline": True},
  ],
  "steps": steps,
}
answers = {
  str(idx["r1"]): {"values": ["זהב"]},
  str(idx["r2"]): {"values": ["הונאה"]},
  str(idx["r3"]): {"values": ["100", "מאה"]},
  str(idx["r4"]): {"values": ["מגן", "המגן"]},
  str(idx["r5"]): {"values": ["ניצחון", "נצחון"]},
}
for a in answers.values(): a.update({"value": a["values"][0], "match": "exact", "normalize": ["trim", "caseInsensitive"]})
json.dump(game, open("game.json", "w"), ensure_ascii=False, indent=2)
json.dump(answers, open("answers.private.json", "w"), ensure_ascii=False, indent=2)
print({s["id"]: i for i, s in enumerate(steps)})
