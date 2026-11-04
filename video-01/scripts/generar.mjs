// Generador de la composición HyperFrames del vídeo.
// Lee palabras.json (tiempos de cada palabra) y escribe proyecto/index.html,
// proyecto/compositions/mundo.html y proyecto/compositions/subs.html.
// Uso: node scripts/generar.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, "..");
const OUT = path.join(BASE, "proyecto");
const ICONS = path.join(HERE, "node_modules/@phosphor-icons/core/assets/fill");

const WORDS = JSON.parse(fs.readFileSync(path.join(BASE, "palabras.json"), "utf8"));
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zñ0-9]/g, "");
const FRASES = JSON.parse(fs.readFileSync(path.join(BASE, "voz-frases.json"), "utf8"));
const D = FRASES.at(-1).end; // el vídeo dura exactamente lo que la voz

/** Momento en que se dice `palabra` por n-ésima vez (n empieza en 1). */
function P(palabra, n = 1) {
  const k = norm(palabra);
  let c = 0;
  for (const w of WORDS) if (norm(w.text) === k && ++c === n) return w.start;
  throw new Error(`P("${palabra}", ${n}): no está en la voz`);
}
/** Final de la n-ésima vez que se dice `palabra`. */
function E(palabra, n = 1) {
  const k = norm(palabra);
  let c = 0;
  for (const w of WORDS) if (norm(w.text) === k && ++c === n) return w.end;
  throw new Error(`E("${palabra}", ${n}): no está en la voz`);
}
const r = (v) => +v.toFixed(3);

// ---------- Paleta ----------
const C = {
  ground: "#07090d", ink: "#0f172a", white: "#ffffff", muted: "#94a3b8",
  good: "#22c55e", bad: "#ef4444", glow: "#22c55e", card: "#ffffff",
  novato: "#fb923c", pro: "#22c55e",
};

function icon(name, size, color, extra = "") {
  const svg = fs.readFileSync(path.join(ICONS, `${name}-fill.svg`), "utf8");
  return svg.replace("<svg ", `<svg width="${size}" height="${size}" style="color:${color}" ${extra} `);
}

// ---------- Personajes ----------
const chars = [];
function character(id, x, y, look, { scale = 1, poses = [[0, "idle"]], mood = [[0, 0.6]], off = 0 } = {}) {
  chars.push({ id, poses, mood, off });
  const { shirt, pants, skin = "#f2c79a", hair, shoe = "#f8fafc", band } = look;
  const w = 420 * scale, h = 520 * scale;
  return `
  <div id="${id}" class="char" style="left:${x - w / 2}px;top:${y - (480 / 520) * h}px;width:${w}px;height:${h}px">
    <svg width="${w}" height="${h}" viewBox="-210 -480 420 520" overflow="visible">
      <ellipse cx="0" cy="6" rx="78" ry="12" fill="#000" opacity=".35"/>
      <g id="${id}-rig">
        <path id="${id}-legB" stroke="${shade(pants, -0.25)}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <ellipse id="${id}-legBE" rx="26" ry="14" fill="${shade(shoe, -0.2)}"/>
        <path id="${id}-armB" stroke="${shade(shirt, -0.25)}" stroke-width="28" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle id="${id}-armBE" r="16" fill="${shade(skin, -0.15)}"/>
        <path id="${id}-legF" stroke="${pants}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <ellipse id="${id}-legFE" rx="26" ry="14" fill="${shoe}"/>
        <g id="${id}-torso" transform-origin="0 -170"><rect id="${id}-shirt" x="-54" y="-322" width="108" height="164" rx="48" fill="${shirt}"/>
          ${look.stripes ? `<path id="${id}-stripes" d="M-50 -280H50M-54 -240H54M-52 -200H52" stroke="${shade(shirt, 0.3)}" stroke-width="10"/>` : ""}
          ${look.number ? `<text x="0" y="-222" text-anchor="middle" font-family="Inter" font-weight="900" font-size="56" fill="#fff">${look.number}</text>` : ""}
        </g>
        <g id="${id}-head">
          <rect x="-14" y="40" width="28" height="30" fill="${shade(skin, -0.12)}"/>
          <circle r="64" fill="${skin}"/>
          <path d="${look.hairPath || "M-64 -6C-66 -60 -20 -78 10 -72C52 -66 70 -36 64 -8C46 -34 10 -44 -20 -36C-40 -30 -52 -20 -64 -6Z"}" fill="${hair}"/>
          ${band || look.bandHidden ? `<rect id="${id}-band" x="-66" y="-30" width="132" height="18" rx="9" fill="${band || look.bandHidden}" opacity="${band ? 1 : 0}"/>` : ""}
          <ellipse id="${id}-eyeL" cx="-6" cy="-2" rx="8" ry="11" fill="#0b1020"/>
          <ellipse id="${id}-eyeR" cx="32" cy="-2" rx="8" ry="11" fill="#0b1020"/>
          <circle cx="-26" cy="20" r="9" fill="#f87171" opacity=".35"/>
          <path id="${id}-mouth" stroke="#0b1020" stroke-width="7" stroke-linecap="round" fill="none"/>
        </g>
        <path id="${id}-armF" stroke="${shirt}" stroke-width="28" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle id="${id}-armFE" r="16" fill="${skin}"/>
      </g>
    </svg>
  </div>`;
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.round(Math.max(0, Math.min(255, amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, "0")).join("");
}

// ---------- Mundo: escenas, camino y animaciones ----------
const world = [];   // HTML dentro del mundo
const T = [];       // líneas GSAP
const moves = [];   // movimientos de cámara
const links = [];   // tramos del camino entre escenas
const tw = (s) => T.push(s);
const pop = (sel, t, d = 0.45) => tw(`tl.fromTo("${sel}",{scale:0,opacity:0},{scale:1,opacity:1,duration:${d},ease:"back.out(1.8)"},${r(t)});`);
const cam = (t0, t1, cx, cy, z, ease = "inOut", arc = 0) => moves.push({ t0: r(t0), t1: r(t1), cx, cy, z, ease, arc });

// Rodillo de dígitos: cada columna es una tira 0-9 que se desplaza.
let rollN = 0;
function roller(digits, size, color, { weight = 900 } = {}) {
  const id = `roll${rollN++}`;
  const cols = digits.split("").map((d, i) => {
    if (!/\d/.test(d)) return `<span class="rsep">${d}</span>`;
    const nums = Array.from({ length: 21 }, (_, k) => `<div>${k % 10}</div>`).join("");
    return `<span class="rcol" style="height:${size}px"><span class="rstrip" id="${id}-${i}">${nums}</span></span>`;
  }).join("");
  return { id, html: `<div class="roller" style="font-size:${size}px;line-height:${size}px;color:${color};font-weight:${weight}">${cols}</div>` };
}
/** Hace girar el rodillo hasta `target` (misma forma que digits). */
function rollTo(rl, target, size, t, d = 0.9) {
  target.split("").forEach((ch, i) => {
    if (!/\d/.test(ch)) return;
    const n = +ch + 10; // da una vuelta entera antes de parar
    tw(`tl.fromTo("#${rl.id}-${i}",{y:0},{y:${-n * size},duration:${r(d + i * 0.12)},ease:"power3.out"},${r(t)});`);
  });
}

/** Tramo de camino entre dos escenas; se dibuja en `t` mientras viaja la cámara. */
function link(a, b, t, dur = 0.6) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const horiz = Math.abs(dx) > Math.abs(dy);
  const off = horiz ? 560 : 700;
  const ux = horiz ? Math.sign(dx) : 0, uy = horiz ? 0 : Math.sign(dy);
  links.push({ id: `camino${links.length}`, x1: a.x + ux * off, y1: a.y + uy * off, x2: b.x - ux * off, y2: b.y - uy * off, t, dur });
}

/** Texto que se escribe letra a letra entre t0 y t1. */
let typeN = 0;
function typed(text, t0, t1) {
  const id = `ty${typeN++}`;
  const letters = [...text];
  const step = (t1 - t0) / letters.length;
  letters.forEach((_, i) => tw(`tl.fromTo("#${id}-${i}",{opacity:0},{opacity:1,duration:0.01},${r(t0 + i * step)});`));
  return letters.map((ch, i) => `<span id="${id}-${i}">${ch === " " ? "&nbsp;" : ch}</span>`).join("");
}

// Fila de casillas (semana o racha): ids `${id}-c${i}` y su icono `${id}-i${i}`.
function cells(id, labels, { title = "", size = 60 } = {}) {
  const items = labels.map((l, i) => `
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
        <div class="lbl" style="font-size:26px;color:${C.muted}">${l}</div>
        <div id="${id}-c${i}" class="cell center" style="width:${size}px;height:${size}px"><div id="${id}-i${i}" class="center" style="width:${size}px;height:${size}px"></div></div>
      </div>`).join("");
  return `${title ? `<div class="lbl" style="font-size:30px;color:${C.muted};letter-spacing:.08em">${title}</div>` : ""}
      <div style="display:flex;gap:6px">${items}</div>`;
}
const fillCell = (id, i, color, ic, t) => {
  tw(`tl.to("#${id}-c${i}",{backgroundColor:"${color}",duration:0.18},${r(t)});`);
  if (ic) { iconFill.push({ sel: `${id}-i${i}`, ic }); pop(`#${id}-i${i}`, t, 0.3); }
};
const iconFill = []; // iconos dentro de casillas (se insertan al final)

const LOOK = {
  pro: { shirt: C.pro, pants: "#14532d", hair: "#1f1611", band: "#ffffff" },
  novato: { shirt: "#fdba74", pants: "#c2410c", hair: "#7c2d12", stripes: true, bandHidden: "#ffffff",
    hairPath: "M-66 -2C-74 -40 -50 -62 -40 -58C-36 -86 0 -84 6 -70C20 -96 56 -80 52 -60C78 -60 74 -24 64 -4C50 -30 20 -44 -14 -40C-40 -36 -56 -20 -66 -2Z" },
  adultoA: { shirt: "#3b82f6", pants: "#1e3a8a", hair: "#3f2a1d" },
  adultoB: { shirt: "#a855f7", pants: "#4c1d95", hair: "#111827", hairPath: "M-66 10C-74 -60 -24 -84 12 -76C56 -68 76 -30 66 14C60 -20 40 -40 0 -42C-30 -42 -50 -20 -66 10Z" },
  adultoC: { shirt: "#f43f5e", pants: "#7f1d1d", hair: "#6b3e1e" },
};
const tagPill = (id, x, y, text, color, w = 230) =>
  `<div id="${id}" class="abs center pill" style="left:${x}px;top:${y}px;width:${w}px;height:64px;background:${color};color:#0b1020;font-size:34px">${text}</div>`;

// ---------- Estilos: split-flap, partículas y neón ----------
const flaps = [];
/** Panel split-flap de `n` casillas. steps: [{t, text, color}] (el primero se ve desde el inicio). */
function flapBoard(id, n, steps, { w = 84, h = 132, gap = 8, size = 92 } = {}) {
  flaps.push({ id, n, steps: steps.map((s, i) => ({ ...s, t: r(s.t), first: i === 0 })) });
  const cell = (i) => {
    const c = `${id}-${i}`;
    const half = (cls, tid, extra = "") => `<div class="sf-h ${cls}" ${extra}><span id="${tid}" class="sf-t" style="height:${h}px;line-height:${h}px"></span></div>`;
    return `<div id="${c}" class="sf-cell" style="width:${w}px;height:${h}px;font-size:${size}px">
        ${half("sf-top", `${c}-tt`)}${half("sf-bot", `${c}-bt`)}
        ${half("sf-top sf-flap", `${c}-ft`, `id="${c}-f"`)}${half("sf-bot sf-flap", `${c}-gt`, `id="${c}-g"`)}
        <div class="sf-axle"></div></div>`;
  };
  return `<div id="${id}" class="sf-board" style="gap:${gap}px">${Array.from({ length: n }, (_, i) => cell(i)).join("")}</div>`;
}

/** Explosión de partículas en (x, y) del mundo, en el momento t. Determinista (semilla). */
let burstN = 0;
function burst(x, y, t, colors, { count = 36, radius = 420 } = {}) {
  const id = `pb${burstN++}`;
  let seed = 1234 + burstN * 97;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const parts = [];
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2, d = radius * (0.45 + 0.55 * rnd());
    const w = 10 + rnd() * 14, h = w * (0.4 + rnd() * 0.8);
    parts.push(`<div id="${id}-${i}" class="pt" style="left:${x - w / 2}px;top:${y - h / 2}px;width:${w}px;height:${h}px;background:${colors[i % colors.length]}"></div>`);
    tw(`tl.fromTo("#${id}-${i}",{x:0,y:0,rotation:0,opacity:0},{keyframes:[{opacity:1,duration:0.04},{x:${(Math.cos(a) * d).toFixed(0)},y:${(Math.sin(a) * d * 0.8 + 60).toFixed(0)},rotation:${(rnd() * 540 - 270).toFixed(0)},duration:0.75,ease:"power3.out"},{opacity:0,duration:0.3}]},${r(t)});`);
  }
  world.push(`<div id="${id}" data-layout-ignore>${parts.join("")}</div>`);
}

/** Línea de neón que tacha algo: se dibuja de izquierda a derecha en t. */
function neonStrike(id, x, y, w, color, t, rot = -4) {
  world.push(`<div id="${id}" class="neon" data-layout-ignore style="left:${x}px;top:${y}px;width:${w}px;--c:${color};transform-origin:0 50%"></div>`);
  tw(`tl.fromTo("#${id}",{scaleX:0,rotation:${rot}},{scaleX:1,rotation:${rot},duration:0.22,ease:"power3.out"},${r(t)});`);
}

// Mapa del mundo: dónde vive cada escena
const S1 = { x: 1000, y: 1000 }, S2 = { x: 1000, y: 2500 };

// Momentos clave, siempre atados a palabras de la voz
const VIAJE1 = E("plan") + 0.15;           // cámara: gancho → dato

// ======================= ESCENA 1 · «No te falta disciplina: te falta un plan» =======================
// Tipografía cinética: «NO TE FALTA» → el «NO» se va y queda «TE FALTA UN».
world.push(`
  <div id="s1-cab" class="abs center" style="left:${S1.x - 480}px;top:${S1.y - 520}px;width:960px;height:120px;gap:22px;font-size:86px;font-weight:900;letter-spacing:-.03em;color:#fff">
    <span id="s1-no" style="display:inline-block;color:${C.bad}">NO</span>
    <span id="s1-tefalta" style="display:inline-block">TE FALTA</span>
    <span id="s1-un" style="display:inline-block;color:${C.good}">UN</span>
  </div>
  <div class="abs center" style="left:${S1.x - 480}px;top:${S1.y - 360}px;width:960px;height:140px">
    ${flapBoard("s1-sf", 10, [{ t: 0, text: "DISCIPLINA", color: "#ffffff" }, { t: P("un") - 0.15, text: "   PLAN", color: C.good }], { w: 78, gap: 8, size: 88 })}
  </div>
  <div id="s1-sofa" class="abs" style="left:${S1.x - 190}px;top:${S1.y + 70}px;width:380px;height:380px">${icon("couch", 380, "#334155")}</div>
`);
neonStrike("s1-tacha", S1.x - 470, S1.y - 296, 940, C.bad, P("te", 2) - 0.05);
tw(`tl.to("#s1-tacha",{opacity:0,duration:0.15},${r(P("plan") - 0.1)});`);
world.push(character("nov0", S1.x, S1.y + 330, LOOK.novato, {
  scale: 0.9, off: 0.4,
  poses: [[0, "sit"], [P("plan") + 0.05, "point"]],
  mood: [[0, -0.5], [P("disciplina"), -0.9], [P("plan"), 1]],
}));
// Arranque potente: el panel ya está en pantalla y golpea; el novato se hunde en el sofá
tw(`tl.fromTo("#s1-sf",{scale:1.08,rotation:-2},{scale:1,rotation:0,duration:0.5,ease:"back.out(2)"},0);`);
tw(`tl.fromTo("#s1-no",{y:-120,opacity:0},{y:0,opacity:1,duration:0.3,ease:"back.out(2)"},0);`);
tw(`tl.fromTo("#s1-tefalta",{y:-120,opacity:0},{y:0,opacity:1,duration:0.3,ease:"back.out(2)"},${r(P("te"))});`);
tw(`tl.fromTo("#s1-un",{opacity:0,scale:0.4},{opacity:0,scale:0.4,duration:0.01},0);`);
tw(`tl.fromTo("#s1-sf",{x:0},{keyframes:[{x:-14},{x:12},{x:-8},{x:0}],duration:0.24,ease:"none",immediateRender:false},${r(P("disciplina"))});`);
// «te falta un plan»: el NO sale disparado y entra el UN
tw(`tl.to("#s1-no",{y:-140,rotation:-25,opacity:0,duration:0.3,ease:"power3.in"},${r(P("te", 2) - 0.05)});`);
tw(`tl.to("#s1-un",{opacity:1,scale:1,duration:0.3,ease:"back.out(2.2)"},${r(P("un"))});`);
tw(`tl.fromTo("#s1-cab",{x:0},{x:-60,duration:0.3,ease:"power3.out",immediateRender:false},${r(P("te", 2))});`);
tw(`tl.to("#s1-sf",{filter:"drop-shadow(0 0 26px ${C.good}aa)",duration:0.4},${r(P("plan") + 0.2)});`);
burst(S1.x, S1.y - 290, P("plan") + 0.25, [C.good, "#86efac", "#ffffff", "#facc15"]);
tw(`tl.to("#s1-sofa",{opacity:0.25,duration:0.4},${r(P("plan") + 0.2)});`);

// ======================= ESCENA 2 · 1 de cada 3 · no es por pereza =======================
world.push(`
  <div id="s2-panel" class="abs card" style="left:${S2.x - 440}px;top:${S2.y - 540}px;width:880px;height:300px;padding:30px 40px;flex-direction:row;gap:30px">
    ${flapBoard("s2-sf", 3, [{ t: 0, text: "   ", color: C.bad }, { t: P("suficiente") - 0.25, text: "31%", color: C.bad }], { w: 96, h: 150, gap: 6, size: 104 })}
    <div style="display:flex;flex-direction:column;gap:10px">
      <div class="lbl" style="font-size:46px;color:${C.ink};line-height:1.05">de los adultos<br>no se mueve<br>lo suficiente</div>
      <div class="lbl" style="font-size:28px;color:${C.muted}">Fuente: OMS · 2024</div>
    </div>
  </div>
  <div id="s2-sofa" class="abs" style="left:${S2.x + 280 - 190}px;top:${S2.y + 270}px;width:380px;height:380px">${icon("couch", 380, "#475569")}</div>
  <div id="s2-pereza" class="abs center pill" style="left:${S2.x + 280 - 170}px;top:${S2.y + 30}px;width:340px;height:96px;background:#1e293b;color:#fff;font-size:52px;border:4px solid rgba(255,255,255,.2)">PEREZA</div>
`);
world.push(character("adA", S2.x - 290, S2.y + 490, LOOK.adultoA, { scale: 0.92, poses: [[0, "idle"], [P("mueve"), "run"]], mood: [[0, 0.5], [P("mueve"), 0.9]], off: 0.9 }));
world.push(character("adB", S2.x, S2.y + 490, LOOK.adultoB, { scale: 0.92, poses: [[0, "idle"], [P("mueve") + 0.12, "run"]], mood: [[0, 0.5], [P("mueve"), 0.9]], off: 1.7 }));
world.push(character("adC", S2.x + 290, S2.y + 490, LOOK.adultoC, { scale: 0.92, poses: [[0, "idle"], [P("no", 2) + 0.05, "sit"]], mood: [[0, 0.5], [P("no", 2), -0.8], [P("pereza") + 0.2, 0.2]], off: 2.4 }));
pop("#adA", P("uno"));
pop("#adB", P("cada"));
pop("#adC", P("tres"));
tw(`tl.fromTo("#s2-sofa",{opacity:0,x:260},{opacity:1,x:0,duration:0.4,ease:"power3.out"},${r(P("no", 2) - 0.15)});`);
tw(`tl.fromTo("#adC",{filter:"grayscale(0) brightness(1)"},{filter:"grayscale(1) brightness(0.62)",duration:0.5,ease:"power2.out"},${r(P("no", 2))});`);
pop("#s2-panel", P("lo") - 0.2, 0.5);
// «y no es por pereza»: aparece la etiqueta y el neón la tacha
pop("#s2-pereza", P("no", 3), 0.35);
neonStrike("s2-tacha", S2.x + 280 - 185, S2.y + 76, 370, C.bad, P("pereza") + 0.05, -8);

// ======================= CÁMARA Y CAMINO =======================
const cam0 = { cx: S1.x, cy: S1.y - 60, z: 1.04 };
cam(0, 0.55, S1.x, S1.y - 40, 1.0, "out");
cam(P("plan") - 0.05, P("plan") + 0.12, S1.x, S1.y - 60, 1.07, "out");   // golpe en «plan»
cam(P("plan") + 0.15, VIAJE1, S1.x, S1.y - 50, 1.0);
cam(VIAJE1, VIAJE1 + 0.55, S2.x, S2.y + 30, 1.0, "inOut", 0.35);
cam(P("suficiente") - 0.3, P("suficiente") + 0.25, S2.x, S2.y - 90, 1.05);

link(S1, S2, VIAJE1 - 0.05);

// ======================= EFECTOS DE SONIDO =======================
const SFX = [];
const sfx = (name, t, vol = 1) => SFX.push({ name, t: r(Math.max(0, t)), vol });
sfx("impact-bass-1", 0, 0.7);
sfx("glitch-3", P("disciplina"), 0.25);
sfx("whoosh-short", P("te", 2) - 0.05, 0.45);
sfx("typing", P("plan") - 0.05, 0.25);                            // las solapas del panel
sfx("impact-bass-1", P("plan"), 0.6);
sfx("sparkle", P("plan") + 0.2, 0.45);
sfx("whoosh", VIAJE1, 0.55);
for (const t of [P("uno"), P("cada"), P("tres")]) sfx("pop", t, 0.45);
sfx("typing", P("suficiente") - 0.25, 0.2);
sfx("ping", P("suficiente"), 0.4);
sfx("pop", P("no", 3), 0.45);
sfx("whoosh-short", P("pereza") + 0.05, 0.45);

// Iconos dentro de las casillas
const ICON_SVG = { check: icon("check-fat", 38, "#fff"), x: icon("x", 38, "#fff") };
let worldHTML = world.join("\n");
for (const { sel, ic } of iconFill) {
  worldHTML = worldHTML.replace(`<div id="${sel}" class="center"`, `<div id="${sel}" class="center" data-ic="${ic}"`)
    .replace(new RegExp(`(<div id="${sel}" class="center" data-ic="${ic}"[^>]*>)</div>`), `$1${ICON_SVG[ic]}</div>`);
}

// ---------- HTML del mundo ----------
const runtime = fs.readFileSync(path.join(HERE, "runtime.js"), "utf8");
const DATA = { D, FY: 960, cam0, moves, chars, float: [], flaps };
const linkSVG = links.map((l) => `
        <mask id="${l.id}m" maskUnits="userSpaceOnUse" x="0" y="0" width="6000" height="9000"><path id="${l.id}d" d="M${l.x1} ${l.y1}L${l.x2} ${l.y2}" stroke="#fff" stroke-width="40" fill="none" pathLength="1" stroke-dasharray="1 1.2" stroke-dashoffset="1.1"/></mask>
        <path class="camino" d="M${l.x1} ${l.y1}L${l.x2} ${l.y2}" mask="url(#${l.id}m)"/>`).join("");
const linkTL = links.map((l) => `tl.fromTo("#${l.id}d",{strokeDashoffset:1.1},{strokeDashoffset:0,duration:${r(l.dur)},ease:"power2.inOut"},${r(l.t)});`).join("\n    ");

const mundo = `<template>
  <style>
    #root { position:absolute; inset:0; overflow:hidden; background:${C.ground}; font-family:Inter, sans-serif; }
    #bg { position:absolute; inset:-200px; background-image:
      linear-gradient(rgba(255,255,255,.055) 2px, transparent 2px),
      linear-gradient(90deg, rgba(255,255,255,.055) 2px, transparent 2px); }
    #glow { position:absolute; left:-20%; right:-20%; bottom:-520px; height:1100px;
      background: radial-gradient(closest-side, rgba(34,197,94,.30), rgba(34,197,94,.10) 55%, transparent); }
    #world { position:absolute; left:0; top:0; width:6000px; height:9000px; transform-origin:0 0; }
    .abs { position:absolute; }
    .center { display:flex; align-items:center; justify-content:center; }
    .card { background:${C.card}; border-radius:44px; display:flex; align-items:center; justify-content:center; box-shadow:0 30px 80px rgba(0,0,0,.45); }
    .pill { border-radius:999px; font-weight:900; letter-spacing:-.01em; }
    .lbl { font-weight:900; letter-spacing:-.02em; }
    .char { position:absolute; }
    .cell { border-radius:16px; background:#e2e8f0; }
    .clg { width:58px; height:58px; border-radius:12px; background:#e2e8f0; }
    .roller { display:flex; align-items:flex-start; letter-spacing:-.04em; font-variant-numeric: tabular-nums; }
    .rcol { display:inline-block; overflow:hidden; }
    .rstrip { display:block; }
    .rstrip div { height:1em; }
    .rsep { display:inline-block; }
    #mesh { position:absolute; inset:-25%; filter:blur(80px); opacity:.32;
      background: radial-gradient(circle at var(--x1,22%) var(--y1,30%), #15803d 0 13%, transparent 33%),
        radial-gradient(circle at var(--x2,78%) var(--y2,62%), #6d28d9 0 11%, transparent 31%),
        radial-gradient(circle at var(--x3,45%) var(--y3,88%), #16a34a 0 16%, transparent 36%); }
    .sf-board { display:flex; }
    .sf-cell { position:relative; border-radius:12px; perspective:700px; font-weight:900; color:#fff;
      box-shadow:0 18px 34px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.07); }
    .sf-h { position:absolute; left:0; width:100%; height:50%; overflow:hidden; text-align:center; backface-visibility:hidden; }
    .sf-top { top:0; border-radius:12px 12px 0 0; transform-origin:50% 100%; background:linear-gradient(180deg,#2a2c33,#1d1f24); }
    .sf-bot { top:50%; border-radius:0 0 12px 12px; transform-origin:50% 0; background:linear-gradient(180deg,#191b20,#121418); }
    .sf-flap { visibility:hidden; }
    .sf-t { display:block; position:relative; }
    .sf-bot .sf-t { top:-100%; }
    .sf-axle { position:absolute; left:0; right:0; top:50%; height:3px; margin-top:-1px; background:rgba(0,0,0,.7); }
    .pt { position:absolute; border-radius:3px; opacity:0; }
    .neon { position:absolute; height:12px; border-radius:6px; background:#fff;
      box-shadow:0 0 4px #fff, 0 0 14px var(--c), 0 0 34px var(--c), 0 0 64px var(--c); }
    .camino { fill:none; stroke:rgba(255,255,255,.28); stroke-width:14; stroke-linecap:round; stroke-dasharray:22 26; }
  </style>
  <div id="root" data-composition-id="mundo" data-width="1080" data-height="1920">
    <div id="mesh"></div>
    <div id="bg"></div>
    <div id="world">
      <svg class="abs" width="6000" height="9000" style="left:0;top:0" overflow="visible">${linkSVG}
      </svg>
      ${worldHTML}
    </div>
  </div>
  <script>
    const DATA = ${JSON.stringify(DATA)};
    ${runtime}
    const tl = gsap.timeline({ paused: true });
    const clock = { t: 0 };
    tl.fromTo(clock, { t: 0 }, { t: ${D}, duration: ${D}, ease: "none", onUpdate: () => window.__mundoRender(clock.t) }, 0);
    ${linkTL}
    ${T.join("\n    ")}
    window.__mundoRender(0);
    window.__timelines["mundo"] = tl;
  </script>
</template>
`;

// ======================= SUBTÍTULOS =======================
const KEY = {
  disciplina: C.bad, plan: C.good, tres: C.bad, suficiente: C.bad, pereza: C.bad, motivacion: C.novato, ola: C.novato,
  sofa: C.bad, tarde: C.bad, enorme: C.bad, dejas: C.bad, metodo: C.good, intencion: C.good, implementacion: C.good,
  frase: C.good, si: C.good, entonces: C.good, siete: C.good, trabajo: C.good, camino: C.good, diez: C.good,
  noventa: C.good, cuarenta: C.bad, tiene: C.bad, disena: C.good, escribe: C.good, comentarios: C.good, sigueme: C.good,
};
const groups = [];
let g = [];
WORDS.forEach((w, i) => {
  g.push(w);
  const next = WORDS[i + 1];
  const brk = !next || g.length >= 3 || /[.,:;!?]$/.test(w.text) || next.start - w.end > 0.15;
  if (brk) { groups.push(g); g = []; }
});
let subsHTML = "", subsTL = "";
groups.forEach((grp, gi) => {
  const t0 = Math.max(0.12, grp[0].start - 0.04);
  const t1 = gi + 1 < groups.length ? Math.max(0.12, groups[gi + 1][0].start - 0.04) : D - 0.05;
  const chars = grp.map((w) => w.text).join(" ").length;
  const fs_ = Math.min(76, Math.floor(940 / (chars * 0.6)));
  let keyDone = false;
  const spans = grp.map((w, wi) => {
    const k = norm(w.text);
    const col = !keyDone && KEY[k];
    if (col) keyDone = true;
    const txt = w.text.replace(/[.,:;]$/, "");
    return col
      ? `<span class="w key" id="c${gi}-${wi}" style="--k:${col}"><span class="kb" id="c${gi}-${wi}b"></span><span class="kt">${txt}</span></span>`
      : `<span class="w" id="c${gi}-${wi}">${txt}</span>`;
  }).join(" ");
  subsHTML += `<div class="cap" id="cap${gi}" style="font-size:${fs_}px;--bw:${Math.min(1000, Math.round(chars * fs_ * 0.6 + 70))}px"><div class="bgc"></div>${spans}</div>\n`;
  subsTL += `tl.set("#cap${gi}",{opacity:1,visibility:"visible"},${r(t0)});`;
  grp.forEach((w, wi) => {
    subsTL += `tl.fromTo("#c${gi}-${wi}",{opacity:.35,y:10},{opacity:1,y:0,duration:.1,ease:"power2.out"},${r(Math.max(t0, w.start))});`;
    if (spans.includes(`id="c${gi}-${wi}b"`)) subsTL += `tl.fromTo("#c${gi}-${wi}b",{scaleX:0},{scaleX:1,duration:.16,ease:"power3.out"},${r(Math.max(t0, w.start))});`;
  });
  subsTL += `tl.set("#cap${gi}",{opacity:0,visibility:"hidden"},${r(t1)});\n`;
});
const subs = `<template>
  <style>
    #root { position:absolute; inset:0; font-family:Inter, sans-serif; }
    .cap { isolation:isolate; position:absolute; left:60px; right:60px; top:250px; text-align:center; font-weight:900; color:#fff;
      line-height:1.2; letter-spacing:-.02em; opacity:0; visibility:hidden; text-shadow:0 6px 24px rgba(0,0,0,.6); }
    .cap > .bgc { position:absolute; left:50%; top:-14px; bottom:-14px; width:var(--bw); transform:translateX(-50%); background:rgba(7,9,13,.62); border-radius:28px; z-index:-1; }
    .w { display:inline-block; position:relative; }
    .key { padding:0 .16em; color:#04130a; text-shadow:none; }
    .kb { position:absolute; inset:.04em 0 .02em 0; background:var(--k); border-radius:.2em; transform-origin:0 50%; }
    .kt { position:relative; }
  </style>
  <div id="root" data-composition-id="subs" data-width="1080" data-height="1920">
${subsHTML}  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    ${subsTL}
    window.__timelines["subs"] = tl;
  </script>
</template>
`;

// ======================= RAÍZ =======================
const conSubs = !process.argv.includes("--sin-subtitulos");
const index = `<!doctype html>
<html lang="es" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="assets/gsap.min.js"></script>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      html, body { width:1080px; height:1920px; overflow:hidden; background:${C.ground}; }
      #root { position:relative; width:100%; height:100%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${D}" data-width="1080" data-height="1920">
      <div id="mundo" data-composition-id="mundo" data-composition-src="compositions/mundo.html"
        data-start="0" data-duration="${D}" data-track-index="1" data-track-kind="graphics" data-width="1080" data-height="1920" style="z-index:1"></div>
${conSubs ? `      <div id="subs" data-composition-id="subs" data-composition-src="compositions/subs.html"
        data-start="0" data-duration="${D}" data-track-index="2" data-track-kind="captions" data-width="1080" data-height="1920" style="z-index:2"></div>\n` : ""}      <audio id="audio" class="clip" src="assets/mezcla.wav" data-start="0" data-duration="${D}" data-track-index="3" data-volume="1"></audio>
    </div>
    <script>
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;

fs.mkdirSync(path.join(OUT, "compositions"), { recursive: true });
fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
fs.copyFileSync(path.join(HERE, "node_modules/gsap/dist/gsap.min.js"), path.join(OUT, "assets/gsap.min.js"));
fs.writeFileSync(path.join(OUT, "index.html"), index);
fs.writeFileSync(path.join(BASE, "sonido.json"), JSON.stringify({ D, sfx: SFX }, null, 1));
fs.writeFileSync(path.join(OUT, "compositions/mundo.html"), mundo);
fs.writeFileSync(path.join(OUT, "compositions/subs.html"), subs);
console.log(`OK · ${D}s · ${groups.length} grupos de subtítulos · ${chars.length} personajes`);
