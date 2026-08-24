import sys, shutil

PATH = "public/game.html"
BAK = "public/game.html.bak"

with open(PATH, encoding="utf-8") as f:
    src = f.read()

ANCHOR = '      inner=`<div class="body">${heads}<div class="desk-scene">${board}</div>${bar}</div>`;'

REPLACEMENT = (
    '      const _sid=(S.game.steps[S.step]&&S.game.steps[S.step].id)||"";\n'
    '      const _pt=cz(t(_sid+".plot"));\n'
    '      const _plot=_pt?`<p class="c-text vaultnarr">${_pt.replace(/\\n/g,"<br>")}</p>`:"";\n'
    '      inner=`<div class="body">${_plot}${heads}<div class="desk-scene">${board}</div>${bar}</div>`;'
)

# already applied?
if '_sid+".plot"' in src:
    print("ALREADY APPLIED — no change")
    sys.exit(0)

# anchor must exist exactly once
count = src.count(ANCHOR)
if count != 1:
    print(f"ABORT: anchor found {count} times (need exactly 1). File untouched.")
    sys.exit(1)

new = src.replace(ANCHOR, REPLACEMENT)

# sanity checks before writing
checks_ok = True
if new.count("`") % 2 != 0:
    print("ABORT: unbalanced backticks after edit. File untouched.")
    checks_ok = False
if '_sid+".plot"' not in new:
    print("ABORT: replacement text missing after edit. File untouched.")
    checks_ok = False
if len(new) <= len(src):
    print("ABORT: file didn't grow as expected. File untouched.")
    checks_ok = False
if not checks_ok:
    sys.exit(1)

# backup, then write
shutil.copyfile(PATH, BAK)
with open(PATH, "w", encoding="utf-8") as f:
    f.write(new)
print(f"BACKED UP to {BAK}")
print("APPLIED: board scenes now render .plot text")