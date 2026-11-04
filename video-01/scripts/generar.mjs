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
  return letters.map((ch, i) => ch === " " ? `<span id="${id}-${i}"> </span>` : `<span id="${id}-${i}">${ch}</span>`).join("");
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
        ${half("sf-top", `${c}-tt`, "data-layout-allow-occlusion")}${half("sf-bot", `${c}-bt`, "data-layout-allow-occlusion")}
        ${half("sf-top sf-flap", `${c}-ft`, `id="${c}-f" data-layout-allow-occlusion`)}${half("sf-bot sf-flap", `${c}-gt`, `id="${c}-g" data-layout-allow-occlusion`)}
        <div class="sf-axle"></div></div>`;
  };
  return `<div id="${id}" class="sf-board" data-layout-allow-overflow data-layout-allow-occlusion style="gap:${gap}px">${Array.from({ length: n }, (_, i) => cell(i)).join("")}</div>`;
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
  <div id="s1-cab" class="abs center" style="left:${S1.x - 480}px;top:${S1.y - 520}px;width:960px;height:120px;gap:20px;font-size:76px;font-weight:900;letter-spacing:-.03em;color:#fff">
    <span id="s1-no" style="display:inline-block;color:${C.bad}">NO</span>
    <span id="s1-tefalta" style="display:inline-block">TE HACE FALTA</span>
    <span id="s1-un" style="display:inline-block;color:${C.good}">UN</span>
  </div>
  <div class="abs center" style="left:${S1.x - 480}px;top:${S1.y - 360}px;width:960px;height:140px">
    ${flapBoard("s1-sf", 10, [{ t: 0, text: "DISCIPLINA", color: "#ffffff" }, { t: P("falta", 2) + 0.1, text: "   PLAN", color: C.good }], { w: 78, gap: 8, size: 88 })}
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

// ======================= ESTILO CÓMIC (halftone) =======================
const comic = (id, x, y, w, h, inner, bg = "#fde047", extra = "") =>
  `<div id="${id}" class="abs comic" style="left:${x - w / 2}px;top:${y - h / 2}px;width:${w}px;height:${h}px;background:${bg};${extra}"><div class="halftone"></div>${inner}</div>`;
/** Globo de cómic tipo «¡ZAS!» (estrella SVG con texto). */
function zas(id, x, y, text, color, t, size = 300) {
  const pts = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2, rr = i % 2 ? 0.62 : 1;
    return `${(50 + Math.cos(a) * 50 * rr).toFixed(1)},${(50 + Math.sin(a) * 42 * rr).toFixed(1)}`;
  }).join(" ");
  world.push(`<div id="${id}" class="abs center" data-layout-ignore style="left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px">
    <svg class="abs" width="${size}" height="${size}" viewBox="0 0 100 100" style="left:0;top:0"><polygon points="${pts}" fill="${color}" stroke="#0b1020" stroke-width="3" stroke-linejoin="round"/></svg>
    <span style="position:relative;font-size:${size * 0.2}px;font-weight:900;color:#0b1020;transform:rotate(-8deg)">${text}</span></div>`);
  tw(`tl.fromTo("#${id}",{scale:0,rotation:-30,opacity:0},{scale:1,rotation:0,opacity:1,duration:0.35,ease:"back.out(2.5)"},${r(t)});`);
}

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];
const S3 = { x: 2600, y: 2500 }, S4 = { x: 2600, y: 4000 }, S5 = { x: 1000, y: 4000 };
const S6 = { x: 1000, y: 5600 }, S9 = { x: 2600, y: 5600 }, S10 = { x: 2600, y: 7200 }, S11 = { x: 1000, y: 7200 };

// ======================= ESCENA 3 · La motivación sube y baja como una ola =======================
world.push(comic("s3-panel", S3.x, S3.y - 130, 900, 560, `
  <div class="lbl" style="position:absolute;left:44px;top:30px;font-size:54px;color:#0b1020">MOTIVACIÓN</div>
  <svg style="position:absolute;left:40px;top:110px" width="820" height="400" viewBox="0 0 820 400">
    <path d="M30 20V370H800" stroke="#0b1020" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path id="s3-ola" d="M40 330 C 200 320, 250 50, 380 50 C 510 50, 560 350, 790 340" stroke="#0b1020" stroke-width="16" fill="none"
      stroke-linecap="round" pathLength="1" stroke-dasharray="1 1.2" stroke-dashoffset="1.1"/>
    <circle id="s3-punto" r="22" fill="${C.bad}" stroke="#0b1020" stroke-width="6" cx="40" cy="330"/>
  </svg>`));
zas("s3-zas", S3.x + 300, S3.y + 60, "¡PLOF!", C.bad, P("ola") - 0.05, 260);
world.push(character("nov3", S3.x - 230, S3.y + 520, LOOK.novato, {
  scale: 0.75, off: 1.2, poses: [[0, "idle"], [P("sube"), "cheer"], [P("baja") + 0.1, "tired"]], mood: [[0, 0.2], [P("sube"), 1], [P("baja"), -1]],
}));
pop("#s3-panel", P("la") - 0.1, 0.45);
pop("#nov3", P("motivacion"), 0.4);
tw(`tl.fromTo("#s3-ola",{strokeDashoffset:1.1},{strokeDashoffset:0.55,duration:${r(P("baja") - P("sube"))},ease:"power2.out"},${r(P("sube"))});`);
tw(`tl.to("#s3-ola",{strokeDashoffset:0,duration:0.7,ease:"power2.in"},${r(P("baja"))});`);
tw(`tl.fromTo("#s3-punto",{attr:{cx:40,cy:330}},{keyframes:[{attr:{cx:250,cy:160}},{attr:{cx:380,cy:50}}],duration:${r(P("baja") - P("sube"))},ease:"power2.out"},${r(P("sube"))});`);
tw(`tl.to("#s3-punto",{keyframes:[{attr:{cx:560,cy:250}},{attr:{cx:790,cy:340}}],duration:0.7,ease:"power2.in"},${r(P("baja"))});`);

// ======================= ESCENA 4 · El cerebro elige el sofá =======================
const PANP = (id, dx, ic, color, tag, tagColor) => `
  <div id="${id}" class="abs" style="left:${S4.x + dx - 130}px;top:${S4.y - 190}px;width:260px;height:300px">
    <div style="position:absolute;left:128px;top:0;width:4px;height:150px;background:#0b1020"></div>
    <div class="center" style="position:absolute;left:0;top:-6px;width:260px;height:160px">${icon(ic, 140, color)}</div>
    <div style="position:absolute;left:10px;top:150px;width:240px;height:26px;border-radius:13px;background:#0b1020"></div>
    <div id="${id}-tag" class="center pill" style="position:absolute;left:0;top:196px;width:260px;height:70px;background:${tagColor};color:#0b1020;font-size:34px;border:5px solid #0b1020">${tag}</div>
  </div>`;
world.push(comic("s4-panel", S4.x, S4.y - 40, 920, 960, `
  <div id="s4-cerebro" class="center" style="position:absolute;left:300px;top:40px;width:320px;height:150px;gap:14px">${icon("brain", 110, "#ec4899")}<span class="lbl" style="font-size:40px;color:#0b1020;line-height:1">TU<br>CEREBRO</span></div>
  <div style="position:absolute;left:448px;top:290px;width:24px;height:420px;background:#0b1020;border-radius:8px"></div>
  <div style="position:absolute;left:330px;top:700px;width:260px;height:40px;background:#0b1020;border-radius:20px"></div>`, "#ffffff"));
world.push(`<div id="s4-viga" class="abs" style="left:${S4.x - 320}px;top:${S4.y - 211}px;width:640px;height:22px;border-radius:11px;background:#0b1020"></div>`);
world.push(PANP("s4-izq", -300, "couch", "#475569", "AHORA", C.good));
world.push(PANP("s4-der", 300, "sneaker", C.novato, "EN SEMANAS", "#cbd5e1"));
world.push(`<div id="s4-premio" class="abs" style="left:${S4.x + 300 - 50}px;top:${S4.y - 330}px;width:100px;height:100px">${icon("trophy", 100, "#eab308")}</div>`);
pop("#s4-panel", P("tu") - 0.15, 0.45);
pop("#s4-cerebro", P("cerebro") - 0.05, 0.35);
{ // La balanza cae hacia el sofá
  const t = P("sofa") - 0.1;
  tw(`tl.fromTo("#s4-viga",{rotation:0},{rotation:-14,duration:0.6,ease:"back.out(2)"},${r(t)});`);
  tw(`tl.fromTo("#s4-izq",{y:0},{y:74,duration:0.6,ease:"back.out(2)"},${r(t)});`);
  tw(`tl.fromTo("#s4-der",{y:0},{y:-74,duration:0.6,ease:"back.out(2)"},${r(t)});`);
}
pop("#s4-izq-tag", P("elige"), 0.35);
pop("#s4-premio", P("recompensa"), 0.4);
tw(`tl.to("#s4-premio",{y:-74,duration:0.6,ease:"back.out(2)"},${r(P("sofa") - 0.1)});`);
pop("#s4-der-tag", P("tarde") - 0.1, 0.35);

// ======================= ESCENA 5 · Si el plan es enorme, al tercer día lo dejas =======================
world.push(comic("s5-panel", S5.x, S5.y - 160, 900, 620, `
  <div id="s5-enorme" class="center" style="position:absolute;left:150px;top:40px;width:600px;height:140px;background:${C.bad};border:7px solid #0b1020;border-radius:24px;font-size:88px;font-weight:900;color:#fff;letter-spacing:-.02em">2 H / DÍA</div>
  <div style="position:absolute;left:140px;top:240px;width:620px;height:250px;background:#fff;border:6px solid #0b1020;border-radius:26px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px" data-layout-allow-overlap>${cells("s5c", DIAS, { title: "TU SEMANA", size: 66 })}</div>`, "#fed7aa"));
world.push(`<div id="s5-sello" class="abs center" data-layout-allow-overlap data-layout-allow-occlusion style="left:${S5.x - 230}px;top:${S5.y - 120}px;width:460px;height:130px;border:10px solid ${C.bad};border-radius:24px;color:${C.bad};font-size:60px;font-weight:900;background:rgba(255,255,255,.92)">LO ACABAS DEJANDO</div>`);
world.push(character("nov5", S5.x, S5.y + 520, LOOK.novato, {
  scale: 0.75, off: 0.8, poses: [[0, "run"], [P("tercer"), "tired"]], mood: [[0, 0.6], [P("tercer"), -1]],
}));
pop("#s5-panel", P("plan", 2) - 0.15, 0.45);
tw(`tl.fromTo("#s5-enorme",{scale:0.3,opacity:0},{scale:1,opacity:1,duration:0.4,ease:"back.out(2.2)"},${r(P("enorme"))});`);
fillCell("s5c", 0, C.novato, "check", P("al") - 0.1);
fillCell("s5c", 1, C.novato, "check", P("al") + 0.15);
fillCell("s5c", 2, C.bad, "x", P("dia", 1));
tw(`tl.fromTo("#s5-sello",{scale:2.4,opacity:0,rotation:-4},{scale:1,opacity:1,rotation:-9,duration:0.3,ease:"power4.out"},${r(P("dejando") - 0.05)});`);
pop("#nov5", P("plan", 2), 0.4);

// ======================= ESCENA 6-8 · El método (blueprint) =======================
const fila = (i, kw, ph, ok) => `
    <div style="display:flex;align-items:center;gap:20px;width:860px;height:150px">
      <div id="s6-kw${i}" class="center bp-kw" style="width:270px;height:110px">${kw}</div>
      <div style="position:relative;width:560px;height:120px">
        <svg class="abs" width="560" height="120" style="left:0;top:0" overflow="visible"><rect id="s6-hueco${i}" x="3" y="3" width="554" height="114" rx="18" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="5" stroke-dasharray="18 12" pathLength="1000"/></svg>
        <div id="s6-ph${i}" class="abs center bp-ph" style="inset:0">${ph}</div>
        <div id="s6-ok${i}" class="abs center bp-ok" style="inset:0">${ok}</div>
      </div>
    </div>`;
world.push(`<div id="s6-plano" class="abs blueprint" style="left:${S6.x - 470}px;top:${S6.y - 470}px;width:940px;height:940px">
    <div class="bp-esq" style="left:16px;top:16px"></div><div class="bp-esq" style="right:16px;top:16px;transform:scaleX(-1)"></div>
    <div class="bp-esq" style="left:16px;bottom:16px;transform:scaleY(-1)"></div><div class="bp-esq" style="right:16px;bottom:16px;transform:scale(-1)"></div>
    <div id="s6-metodo" class="center" style="position:absolute;left:40px;top:40px;height:60px;gap:12px;color:#bfdbfe;font-family:'Space Mono',monospace;font-size:34px;font-weight:700">${icon("pencil-ruler", 46, "#bfdbfe")} MÉTODO Nº1</div>
    <div id="s6-titulo" style="position:absolute;left:40px;right:40px;top:120px;font-family:'Space Mono',monospace;font-weight:700;font-size:56px;line-height:1.1;color:#fff">${typed("INTENCIÓN DE IMPLEMENTACIÓN", P("intencion") - 0.05, E("implementacion") - 0.1)}</div>
    <div style="position:absolute;left:40px;top:330px;display:flex;flex-direction:column;gap:16px">
      ${fila(0, "SI", "tal hora", "LAS 7:00")}${fila(1, "EN", "tal sitio", "AL SALIR DE TRABAJAR")}${fila(2, "ENTONCES", "hago esto", "VOY A ENTRENAR")}
    </div>
  </div>`);
pop("#s6-plano", P("el", 3) - 0.1, 0.5);
tw(`tl.fromTo("#s6-metodo",{opacity:0,x:-40},{opacity:1,x:0,duration:0.3,ease:"power3.out"},${r(P("metodo"))});`);
const tSlot = [P("si", 2), P("en"), P("entonces")];
const fill = [["s6-ok0", "LAS 7:00", P("siete")], ["s6-ok1", "AL SALIR DE TRABAJAR", P("salir")], ["s6-ok2", "VOY A ENTRENAR", P("voy")]];
tSlot.forEach((t, i) => {
  tw(`tl.fromTo("#s6-kw${i}",{scale:0,opacity:0},{scale:1,opacity:1,duration:0.35,ease:"back.out(2)"},${r(t - 0.05)});`);
  tw(`tl.fromTo("#s6-hueco${i}",{strokeDashoffset:1000,opacity:0},{strokeDashoffset:0,opacity:1,duration:0.45,ease:"power2.out"},${r(t + 0.05)});`);
  tw(`tl.fromTo("#s6-ph${i}",{opacity:0},{opacity:1,duration:0.2},${r(t + 0.3)});`);
});
fill.forEach(([id, txt, t], i) => {
  tw(`tl.to("#s6-ph${i}",{opacity:0,duration:0.12},${r(t - 0.05)});`);
  tw(`tl.fromTo("#${id}",{scaleX:0,opacity:0},{scaleX:1,opacity:1,duration:0.3,ease:"power3.out"},${r(t - 0.05)});`);
});
burst(S6.x + 150, S6.y + 300, P("entrenar") + 0.1, [C.good, "#86efac", "#ffffff", "#93c5fd"], { count: 30, radius: 360 });

// ======================= ESCENA 9 · El estudio: 91 % frente a menos del 40 % =======================
world.push(`<div id="s9-panel" class="abs glass" style="left:${S9.x - 460}px;top:${S9.y - 520}px;width:920px;height:1000px">
    <div id="s9-cab" style="position:absolute;left:44px;top:36px;display:flex;align-items:center;gap:18px">${icon("flask", 70, "#93c5fd")}
      <div><div class="lbl" style="font-size:46px;color:#fff">UN ESTUDIO</div><div class="lbl" style="font-size:26px;color:#94a3b8">Milne, Orbell y Sheeran · 2002</div></div></div>
    <div style="position:absolute;left:130px;top:190px">${flapBoard("s9-a", 3, [{ t: 0, text: "   ", color: C.good }, { t: P("91") - 0.1, text: "91%", color: C.good }], { w: 92, h: 140, gap: 6, size: 98 })}</div>
    <div style="position:absolute;left:520px;top:190px">${flapBoard("s9-b", 4, [{ t: 0, text: "    ", color: "#cbd5e1" }, { t: P("menos") - 0.1, text: "<40%", color: "#cbd5e1" }], { w: 72, h: 140, gap: 6, size: 86 })}</div>
    <div style="position:absolute;left:150px;top:360px;width:240px;height:460px;display:flex;align-items:flex-end"><div id="s9-barA" class="barra" style="height:${Math.round(460 * 0.91)}px;background:${C.good};box-shadow:0 0 18px ${C.good},0 0 50px ${C.good}88"></div></div>
    <div style="position:absolute;left:530px;top:360px;width:240px;height:460px;display:flex;align-items:flex-end"><div id="s9-barB" class="barra" style="height:${Math.round(460 * 0.38)}px;background:#64748b"></div></div>
    <div id="s9-labA" class="center lbl" style="position:absolute;left:110px;top:840px;width:320px;height:110px;font-size:36px;color:#fff;text-align:center;line-height:1.1">LO<br>APLICAN</div>
    <div id="s9-labB" class="center lbl" style="position:absolute;left:490px;top:840px;width:320px;height:110px;font-size:36px;color:#94a3b8;text-align:center;line-height:1.1">EL RESTO</div>
  </div>`);
pop("#s9-panel", P("estudio") - 0.2, 0.45);
tw(`tl.fromTo("#s9-barA",{scaleY:0},{scaleY:1,duration:1.1,ease:"power3.out"},${r(P("91"))});`);
tw(`tl.fromTo("#s9-labA",{opacity:0,y:20},{opacity:1,y:0,duration:0.3},${r(P("aplican") - 0.1)});`);
tw(`tl.fromTo("#s9-barB",{scaleY:0},{scaleY:1,duration:0.9,ease:"power3.out"},${r(P("menos"))});`);
tw(`tl.fromTo("#s9-labB",{opacity:0,y:20},{opacity:1,y:0,duration:0.3},${r(P("resto") - 0.1)});`);

// ======================= ESCENA 10 · La disciplina no se tiene. Se diseña. =======================
world.push(`
  <div id="s10-cab" class="abs center" style="left:${S10.x - 480}px;top:${S10.y - 520}px;width:960px;height:120px;font-size:90px;font-weight:900;color:#fff;letter-spacing:-.03em">NO SE TIENE</div>
  <div class="abs center" style="left:${S10.x - 480}px;top:${S10.y - 360}px;width:960px;height:140px">
    ${flapBoard("s10-sf", 10, [{ t: 0, text: "DISCIPLINA", color: "#ffffff" }, { t: P("se", 5) - 0.2, text: "SE DISEÑA", color: C.good }], { w: 78, gap: 8, size: 88 })}
  </div>`);
neonStrike("s10-tacha", S10.x - 330, S10.y - 466, 660, C.bad, P("tiene") + 0.05);
world.push(character("nov10", S10.x - 180, S10.y + 440, LOOK.novato, {
  scale: 0.85, off: 0.3, poses: [[0, "idle"], [P("disena"), "cheer"]], mood: [[0, 0.2], [P("disena"), 1]],
}));
world.push(character("pro10", S10.x + 180, S10.y + 440, LOOK.pro, {
  scale: 0.85, off: 1.3, poses: [[0, "idle"], [P("disena") + 0.1, "cheer"]], mood: [[0, 0.9]],
}));
pop("#s10-cab", P("no", 4) - 0.05, 0.35);
pop("#nov10", P("disciplina", 2) - 0.2, 0.4);
pop("#pro10", P("disciplina", 2) - 0.1, 0.4);
// El novato se transforma en su sitio al «diseñar» su disciplina: fuera pijama, cinta puesta
tw(`tl.to("#nov10-shirt",{attr:{fill:"${C.novato}"},duration:0.35},${r(P("disena"))});`);
tw(`tl.to("#nov10-armF",{attr:{stroke:"${C.novato}"},duration:0.35},${r(P("disena"))});`);
tw(`tl.to("#nov10-stripes",{opacity:0,duration:0.3},${r(P("disena"))});`);
tw(`tl.fromTo("#nov10-band",{opacity:0},{opacity:1,duration:0.3},${r(P("disena"))});`);
tw(`tl.to("#s10-sf",{filter:"drop-shadow(0 0 26px ${C.good}aa)",duration:0.4},${r(P("disena") + 0.1)});`);
burst(S10.x, S10.y - 290, P("disena") + 0.15, [C.good, "#86efac", "#ffffff", "#facc15"], { count: 44, radius: 480 });

// ======================= ESCENA 11 · Comentarios + seguir =======================
world.push(`<div id="s11-caja" class="abs glass" style="left:${S11.x - 440}px;top:${S11.y - 500}px;width:880px;height:400px;padding:34px 40px;display:flex;flex-direction:column;gap:22px">
    <div style="display:flex;align-items:center;gap:14px">${icon("chat-circle-dots", 54, "#fff")}<span class="lbl" style="font-size:44px;color:#fff">Comentarios</span></div>
    <div id="s11-campo" style="display:flex;align-items:center;gap:18px;padding:18px 22px;border-radius:26px;background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.25)">
      <div class="center" style="width:74px;height:74px;border-radius:37px;background:${C.novato};flex:none">${icon("user", 46, "#fff")}</div>
      <div style="flex:1;font-size:40px;font-weight:700;color:#fff;white-space:nowrap">${typed("Si a las 7, voy a entrenar", P("escribe") + 0.15, E("frase", 2) - 0.05)}</div>
      <div id="s11-enviar" class="center" style="width:74px;height:74px;border-radius:37px;background:${C.good};flex:none">${icon("paper-plane-tilt", 42, "#04130a")}</div>
    </div>
    <div id="s11-publicado" style="display:flex;align-items:center;gap:12px;font-size:34px;font-weight:900;color:${C.good}">${icon("check-circle", 42, C.good)} Publicado: ya tienes tu plan
      <span id="s11-like" style="margin-left:auto;display:flex;align-items:center;gap:8px;color:#f43f5e">${icon("heart", 46, "#f43f5e")}1</span></div>
  </div>
  <div id="s11-boton" class="abs center pill" style="left:${S11.x - 270}px;top:${S11.y - 50}px;width:540px;height:140px;background:${C.bad};color:#fff;font-size:60px">
    <span id="s11-seguir" class="abs center" style="inset:0;gap:16px">${icon("user-plus", 64, "#fff")} SEGUIR</span>
    <span id="s11-siguiendo" class="abs center" style="inset:0;gap:16px;opacity:0">${icon("check-fat", 60, "#fff")} SIGUIENDO</span>
  </div>
  <div id="s11-cursor" class="abs" style="left:${S11.x + 200}px;top:${S11.y + 50}px;width:90px;height:90px">${icon("cursor", 90, "#fff")}</div>`);
world.push(character("nov11", S11.x - 200, S11.y + 500, { ...LOOK.novato, shirt: C.novato, stripes: false, band: "#ffffff" }, {
  scale: 0.8, off: 0.9, poses: [[0, "idle"], [P("sigueme") + 0.4, "cheer"]], mood: [[0, 1]],
}));
world.push(character("pro11", S11.x + 200, S11.y + 500, LOOK.pro, {
  scale: 0.8, off: 1.8, poses: [[0, "idle"], [P("sigueme"), "point"]], mood: [[0, 1]],
}));
pop("#s11-caja", P("escribe") - 0.1, 0.45);
pop("#nov11", P("escribe"), 0.4);
pop("#pro11", P("escribe") + 0.08, 0.4);
tw(`tl.fromTo("#s11-enviar",{scale:1},{scale:0.8,duration:0.08,yoyo:true,repeat:1,immediateRender:false},${r(E("frase", 2) + 0.05)});`);
tw(`tl.to("#s11-campo",{backgroundColor:"rgba(34,197,94,.22)",borderColor:"rgba(34,197,94,.8)",duration:0.3},${r(E("frase", 2) + 0.15)});`);
tw(`tl.fromTo("#s11-publicado",{opacity:0,y:16},{opacity:1,y:0,duration:0.3,ease:"power2.out"},${r(P("tendras") - 0.1)});`);
tw(`tl.fromTo("#s11-like",{scale:0},{scale:1,duration:0.35,ease:"back.out(3)"},${r(P("plan", 3))});`);
pop("#s11-boton", P("sigueme") - 0.2, 0.45);
tw(`tl.fromTo("#s11-cursor",{x:260,y:300,opacity:0},{x:0,y:0,opacity:1,duration:0.35,ease:"power3.out"},${r(P("sigueme"))});`);
tw(`tl.fromTo("#s11-boton",{scale:1},{scale:0.92,duration:0.08,yoyo:true,repeat:1,immediateRender:false},${r(P("sigueme") + 0.4)});`);
tw(`tl.to("#s11-boton",{backgroundColor:"#334155",duration:0.25},${r(P("sigueme") + 0.45)});`);
tw(`tl.to("#s11-seguir",{opacity:0,duration:0.15},${r(P("sigueme") + 0.45)});`);
tw(`tl.to("#s11-siguiendo",{opacity:1,duration:0.2},${r(P("sigueme") + 0.5)});`);

// ======================= ESCENA 12 · El lema: «cada día un 0,0001 % mejor» =======================
const S12 = { x: 1000, y: 8800 };
world.push(`
  <div id="s12-tag" class="abs center pill" style="left:${S12.x - 200}px;top:${S12.y - 580}px;width:400px;height:76px;border:4px solid ${C.good};color:${C.good};font-size:36px;letter-spacing:.12em">NUESTRO LEMA</div>
  <div id="s12-cada" class="abs center" style="left:${S12.x - 480}px;top:${S12.y - 470}px;width:960px;height:120px;font-size:104px;font-weight:900;color:#fff;letter-spacing:-.03em">CADA DÍA</div>
  <div class="abs center" style="left:${S12.x - 480}px;top:${S12.y - 330}px;width:960px;height:160px">
    ${flapBoard("s12-sf", 7, [{ t: 0, text: "       ", color: C.good }, { t: P("00001") - 0.1, text: "0,0001%", color: C.good }], { w: 110, h: 160, gap: 10, size: 116 })}
  </div>
  <div id="s12-mejor" class="abs center" style="left:${S12.x - 480}px;top:${S12.y - 140}px;width:960px;height:190px;font-size:180px;font-weight:900;color:${C.good};letter-spacing:-.04em;text-shadow:0 0 30px ${C.good}88">MEJOR</div>
`);
world.push(character("nov12", S12.x - 190, S12.y + 500, { ...LOOK.novato, shirt: C.novato, stripes: false, band: "#ffffff" }, {
  scale: 0.75, off: 0.4, poses: [[0, "walk"], [P("mejor"), "cheer"]], mood: [[0, 1]],
}));
world.push(character("pro12", S12.x + 190, S12.y + 500, LOOK.pro, {
  scale: 0.75, off: 1.5, poses: [[0, "walk"], [P("mejor") + 0.1, "cheer"]], mood: [[0, 1]],
}));
pop("#s12-tag", P("recuerda") - 0.1, 0.4);
tw(`tl.fromTo("#s12-cada",{opacity:0,filter:"blur(10px)",scale:1.2},{opacity:1,filter:"blur(0px)",scale:1,duration:0.3,ease:"power3.out"},${r(P("cada", 3) - 0.05)});`);
tw(`tl.fromTo("#s12-mejor",{scale:3,opacity:0},{scale:1,opacity:1,duration:0.35,ease:"power4.out"},${r(P("mejor") - 0.05)});`);
tw(`tl.to("#s12-sf",{filter:"drop-shadow(0 0 28px ${C.good}aa)",duration:0.4},${r(P("mejor"))});`);
pop("#nov12", P("recuerda"), 0.4);
pop("#pro12", P("recuerda") + 0.08, 0.4);
burst(S12.x, S12.y - 60, P("mejor") + 0.1, [C.good, "#86efac", "#ffffff", "#facc15"], { count: 48, radius: 520 });

// ======================= CÁMARA Y CAMINO =======================
const cam0 = { cx: S1.x, cy: S1.y - 60, z: 1.04 };
cam(0, 0.55, S1.x, S1.y - 40, 1.0, "out");
cam(P("plan") - 0.05, P("plan") + 0.12, S1.x, S1.y - 60, 1.07, "out");   // golpe en «plan»
cam(P("plan") + 0.15, VIAJE1, S1.x, S1.y - 50, 1.0);
cam(VIAJE1, VIAJE1 + 0.55, S2.x, S2.y + 30, 1.0, "inOut", 0.35);
cam(P("suficiente") - 0.3, P("suficiente") + 0.25, S2.x, S2.y - 90, 1.05);
const V3 = E("pereza") + 0.05, V4 = E("ola") + 0.05, V5 = E("tarde") + 0.03;
cam(V3, V3 + 0.55, S3.x, S3.y + 60, 1.0, "inOut", 0.3);
cam(P("ola") - 0.1, P("ola") + 0.1, S3.x, S3.y + 60, 1.05, "out");
cam(V4, V4 + 0.5, S4.x, S4.y - 40, 1.0, "inOut", 0.3);
cam(V5, V5 + 0.5, S5.x, S5.y + 20, 1.0, "inOut", 0.3);
cam(P("dejando") - 0.05, P("dejando") + 0.12, S5.x, S5.y + 20, 1.06, "out");
// Fin del bloque «por qué cuesta»: se aleja para enseñarlo entero
const A1 = E("dejando") - 0.15;
cam(A1, A1 + 0.35, 1800, 3280, 0.36);
const V6 = P("metodo") - 0.25;
cam(V6, V6 + 0.55, S6.x, S6.y + 20, 1.0, "inOut");
cam(P("si", 2) - 0.2, P("si", 2) + 0.3, S6.x, S6.y + 60, 1.04);
cam(P("siete") - 0.2, P("siete") + 0.3, S6.x, S6.y + 80, 1.06);
const V9 = E("entrenar") + 0.25;
cam(V9, V9 + 0.55, S9.x, S9.y - 30, 1.0, "inOut", 0.3);
// Antes del cierre: se aleja y enseña todo el camino recorrido
const A2 = E("resto") - 0.1;
cam(A2, A2 + 0.45, 1800, 4100, 0.14);
const V10 = P("disciplina", 2) - 0.1;
cam(V10, V10 + 0.55, S10.x, S10.y - 30, 1.0, "inOut");
cam(P("disena") - 0.05, P("disena") + 0.12, S10.x, S10.y - 50, 1.07, "out");
cam(P("disena") + 0.2, P("disena") + 0.5, S10.x, S10.y - 30, 1.0);
const V11 = E("disena") + 0.05;
cam(V11, V11 + 0.5, S11.x, S11.y - 20, 1.0, "inOut", 0.3);
cam(P("sigueme") + 0.4, P("sigueme") + 0.52, S11.x, S11.y - 20, 1.05, "out");
cam(P("sigueme") + 0.55, P("sigueme") + 0.9, S11.x, S11.y - 20, 1.0);
const V12 = P("recuerda") - 0.4;
cam(V12, V12 + 0.55, S12.x, S12.y - 40, 1.0, "inOut", 0.3);
cam(P("mejor") - 0.05, P("mejor") + 0.12, S12.x, S12.y - 60, 1.07, "out");
cam(P("mejor") + 0.2, P("mejor") + 0.6, S12.x, S12.y - 40, 1.0);

link(S1, S2, VIAJE1 - 0.05);
link(S2, S3, V3);
link(S3, S4, V4);
link(S4, S5, V5);
link(S5, S6, V6);
link(S6, S9, V9);
link(S9, S10, V10);
link(S10, S11, V11);
link(S11, S12, V12);

// ======================= EFECTOS DE SONIDO =======================
const SFX = [];
const sfx = (name, t, vol = 1) => SFX.push({ name, t: r(Math.max(0, t)), vol });
sfx("impact-bass-1", 0, 0.7);
sfx("glitch-3", P("disciplina"), 0.25);
sfx("whoosh-short", P("te", 2) - 0.05, 0.45);
sfx("typing", P("falta", 2) + 0.1, 0.3);
sfx("impact-bass-1", P("plan"), 0.6);
sfx("sparkle", P("plan") + 0.2, 0.45);
for (const t of [VIAJE1, V3, V4, V5, V6, V9, V10, V11]) sfx("whoosh", t, 0.55);
for (const t of [A1, A2]) sfx("whoosh-short", t, 0.4);
for (const t of [P("uno"), P("cada"), P("tres")]) sfx("pop", t, 0.45);
sfx("typing", P("suficiente") - 0.25, 0.2);
sfx("ping", P("suficiente"), 0.4);
sfx("pop", P("no", 3), 0.45);
sfx("whoosh-short", P("pereza") + 0.05, 0.45);
// Por qué cuesta (cómic)
sfx("pop", P("la") - 0.1, 0.45);
sfx("impact-bass-1", P("ola") - 0.05, 0.5);
sfx("pop", P("cerebro") - 0.05, 0.4);
sfx("click", P("sofa") - 0.1, 0.5);
sfx("pop", P("recompensa"), 0.4);
sfx("pop", P("tarde") - 0.1, 0.35);
sfx("pop", P("enorme"), 0.5);
sfx("click-soft", P("al") - 0.1, 0.4);
sfx("click-soft", P("al") + 0.15, 0.4);
sfx("error", P("dia", 1), 0.3);
sfx("impact-bass-1", P("dejando") - 0.05, 0.45);
// Método (blueprint)
sfx("pop", P("el", 3) - 0.1, 0.45);
sfx("typing", P("intencion") - 0.05, 0.35);
tSlot.forEach((t) => sfx("pop", t - 0.05, 0.4));
fill.forEach(([, , t]) => sfx("click", t - 0.05, 0.45));
sfx("sparkle", P("entrenar") + 0.1, 0.4);
// Estudio
sfx("pop", P("estudio") - 0.2, 0.4);
sfx("typing", P("91") - 0.1, 0.25);
sfx("ping", P("91") + 0.3, 0.45);
sfx("typing", P("menos") - 0.1, 0.2);
// Cierre
sfx("whoosh-short", P("tiene") + 0.05, 0.4);
sfx("typing", P("se", 5) - 0.2, 0.3);
sfx("impact-bass-1", P("disena"), 0.85);
sfx("sparkle", P("disena") + 0.1, 0.5);
sfx("typing", P("escribe") + 0.15, 0.3);
sfx("click", E("frase", 2) + 0.05, 0.5);
sfx("notification", P("tendras") - 0.1, 0.3);
sfx("pop", P("plan", 3), 0.4);
sfx("pop", P("sigueme") - 0.2, 0.45);
sfx("click", P("sigueme") + 0.4, 0.6);
sfx("chime", P("sigueme") + 0.5, 0.3);
sfx("whoosh", V12, 0.55);
sfx("pop", P("recuerda") - 0.1, 0.4);
sfx("typing", P("00001") - 0.1, 0.3);
sfx("impact-bass-1", P("mejor"), 0.85);
sfx("sparkle", P("mejor") + 0.1, 0.5);

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
        <mask id="${l.id}m" maskUnits="userSpaceOnUse" x="0" y="0" width="6000" height="10000"><path id="${l.id}d" d="M${l.x1} ${l.y1}L${l.x2} ${l.y2}" stroke="#fff" stroke-width="40" fill="none" pathLength="1" stroke-dasharray="1 1.2" stroke-dashoffset="1.1"/></mask>
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
    #world { position:absolute; left:0; top:0; width:6000px; height:10000px; transform-origin:0 0; }
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
    .comic { border:8px solid #0b1020; border-radius:22px; box-shadow:16px 16px 0 #0b1020; overflow:hidden; }
    .halftone { position:absolute; inset:0; pointer-events:none; background-image:radial-gradient(circle, rgba(11,16,32,.16) 2.6px, transparent 3.2px); background-size:18px 18px; }
    .blueprint { border-radius:18px; border:3px solid rgba(191,219,254,.6); box-shadow:0 30px 80px rgba(0,0,0,.5);
      background-color:#0b3a82; background-image:
        linear-gradient(rgba(191,219,254,.22) 2px, transparent 2px), linear-gradient(90deg, rgba(191,219,254,.22) 2px, transparent 2px),
        linear-gradient(rgba(191,219,254,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(191,219,254,.09) 1px, transparent 1px);
      background-size:200px 200px, 200px 200px, 40px 40px, 40px 40px; }
    .bp-esq { position:absolute; width:46px; height:46px; border-left:5px solid #bfdbfe; border-top:5px solid #bfdbfe; }
    .bp-kw { border:5px solid #fff; border-radius:20px; color:#fff; font-family:'Space Mono',monospace; font-weight:700; font-size:48px; }
    .bp-ph { color:rgba(255,255,255,.6); font-family:'Space Mono',monospace; font-style:italic; font-size:40px; }
    .bp-ok { border-radius:18px; background:${C.good}; color:#04130a; font-weight:900; font-size:44px; transform-origin:0 50%; opacity:0; box-shadow:0 0 22px ${C.good}88; }
    .glass { border-radius:44px; background:rgba(255,255,255,.08); border:2px solid rgba(255,255,255,.22);
      backdrop-filter:blur(22px); box-shadow:0 30px 80px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.25); }
    .barra { width:240px; border-radius:22px 22px 8px 8px; transform-origin:50% 100%; }
    .pt { position:absolute; border-radius:3px; opacity:0; }
    .neon { position:absolute; height:12px; border-radius:6px; background:#fff;
      box-shadow:0 0 4px #fff, 0 0 14px var(--c), 0 0 34px var(--c), 0 0 64px var(--c); }
    .camino { fill:none; stroke:rgba(255,255,255,.28); stroke-width:14; stroke-linecap:round; stroke-dasharray:22 26; }
  </style>
  <div id="root" data-composition-id="mundo" data-width="1080" data-height="1920">
    <div id="mesh"></div>
    <div id="bg"></div>
    <div id="world">
      <svg class="abs" width="6000" height="10000" style="left:0;top:0" overflow="visible">${linkSVG}
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
  dejando: C.bad, entrenar: C.good, "91": C.good, "40": C.bad, "00001": C.good, mejor: C.good, recuerda: C.good, falta: C.bad, aplican: C.good,
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
