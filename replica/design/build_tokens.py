#!/usr/bin/env python3
"""tokens.json -> tokens.css + tailwind.preset.cjs. Run after every token change (incl. /replica-brand)."""
import json, pathlib, sys

here = pathlib.Path(__file__).parent
t = json.loads((here / "tokens.json").read_text(encoding="utf-8"))

css = [":root {"]
css += [f"  --color-{k}: {v};" for k, v in t["color"].items()]
css += [f"  --font-{k}: {v};" for k, v in t["font"].items()]
for k, v in t["type"].items():
    css += [f"  --text-{k}: {v['size']}px;", f"  --leading-{k}: {v['line']}px;", f"  --weight-{k}: {v['weight']};"]
css += [f"  --radius-{k}: {v}px;" for k, v in t["radius"].items()]
css += [f"  --shadow-{k}: {v};" for k, v in t["shadow"].items()]
css += [f"  --motion-{k}: {v};" for k, v in t["motion"].items()]
css += [f"  --layout-{k}: {v}px;" for k, v in t["layout"].items() if isinstance(v, int)]
css += ["}", "",
        "html { font-family: var(--font-sans); font-size: var(--text-base); line-height: var(--leading-base); color: var(--color-text); background: var(--color-surface); }",
        ".tabular { font-variant-numeric: tabular-nums; }",
        ":focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }",
        "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-duration: 0ms !important; animation-duration: 0ms !important; } }",
        ""]
(here / "tokens.css").write_text("\n".join(css), encoding="utf-8")

theme = {
    "colors": {k: f"var(--color-{k})" for k in t["color"]},
    "fontFamily": {k: f"var(--font-{k})" for k in t["font"]},
    "fontSize": {k: [f"var(--text-{k})", {"lineHeight": f"var(--leading-{k})", "fontWeight": f"var(--weight-{k})"}] for k in t["type"]},
    "spacing": {**{str(v): f"{v}px" for v in t["space"]}, "px": "1px", **{k: f"var(--layout-{k})" for k, v in t["layout"].items() if isinstance(v, int)}},  # p-8 = 8px; w-tile-w, h-tabstrip
    "borderRadius": {**{k: f"var(--radius-{k})" for k in t["radius"]}, "none": "0"},
    "boxShadow": {**{k: f"var(--shadow-{k})" for k in t["shadow"]}, "none": "none"},
    "transitionDuration": {k: f"var(--motion-{k})" for k in ("fast", "base")},
    "transitionTimingFunction": {"DEFAULT": "var(--motion-ease)"},
    "screens": {k: f"{v}px" for k, v in t["layout"]["breakpoints"].items()},
}
# shortcut: replaces Tailwind's default colours/spacing entirely, so raw palette classes (bg-red-500) fail on purpose
preset = "/** generado por build_tokens.py desde tokens.json: no editar a mano */\nmodule.exports = { theme: " + json.dumps(theme, indent=2, ensure_ascii=False) + " };\n"
(here / "tailwind.preset.cjs").write_text(preset, encoding="utf-8")
(here / "tailwind.theme.js").write_text("window.tokenTheme = " + json.dumps(theme, ensure_ascii=False) + ";\n", encoding="utf-8")  # for primitives.html (Tailwind CDN)

assert "--color-accent:" in (here / "tokens.css").read_text(encoding="utf-8")
assert set(theme["colors"]) == set(t["color"])
print(f"tokens.css + tailwind.preset.cjs: {len(t['color'])} colores, {len(t['type'])} tamaños")
