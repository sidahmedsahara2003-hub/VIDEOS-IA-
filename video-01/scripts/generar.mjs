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

// Mapa del mundo: dónde vive cada escena
const S1 = { x: 1000, y: 1000 }, S2 = { x: 1000, y: 2500 }, S3 = { x: 2600, y: 2500 }, S4 = { x: 2600, y: 4000 };
const D1 = { x: 4200, y: 4000 }, D2 = { x: 4200, y: 5600 }, D3 = { x: 2600, y: 5600 };
const CL = { x: 1000, y: 5600 }, FIN = { x: 1000, y: 7200 }, CTA = { x: 2600, y: 7200 };

// Momentos clave, siempre atados a palabras de la voz
const SALE1 = E("entero") - 0.15;          // el Pro se va corriendo
const VIAJE1 = E("entero") - 0.05;         // cámara: escena 1 → 2
const ALEJA2 = P("suficiente") + 0.6;      // cámara: plano general del gancho
const VIAJE2 = P("moverte") + 0.06;        // cámara: escena 2 → 3
const VIAJE3 = E("humor") - 0.1;           // beneficios → novato contra pro

// ======================= ESCENA 1 · GANCHO (10 minutos) =======================
const reloj = roller("00:00", 120, C.ink);
world.push(`
  <div id="s1-reloj" class="abs" style="left:${S1.x - 290}px;top:${S1.y - 380}px;width:580px;height:580px">
    <svg class="abs" width="580" height="580" viewBox="0 0 580 580" overflow="visible">
      <circle cx="290" cy="290" r="270" fill="#ffffff"/>
      <circle cx="290" cy="290" r="232" fill="none" stroke="#e2e8f0" stroke-width="26"/>
      <circle id="s1-aro" cx="290" cy="290" r="232" fill="none" stroke="${C.ink}" stroke-width="26" stroke-linecap="round"
        stroke-dasharray="${(2 * Math.PI * 232).toFixed(1)}" stroke-dashoffset="${(2 * Math.PI * 232).toFixed(1)}" transform="rotate(-90 290 290)"/>
      <rect x="258" y="-30" width="64" height="44" rx="12" fill="#ffffff"/><rect x="276" y="-6" width="28" height="30" fill="#ffffff"/>
    </svg>
    <div class="abs center" style="inset:0;flex-direction:column;gap:6px">
      <div style="margin-top:24px">${reloj.html}</div>
      <div class="lbl" style="color:${C.muted};font-size:46px">minutos</div>
    </div>
  </div>
  <div id="s1-sol" class="abs" style="left:${S1.x - 70}px;top:${S1.y - 160}px;width:140px;height:140px">${icon("sun", 140, "#facc15")}</div>
  <div id="s1-tag" class="abs center pill" style="left:${S1.x - 230}px;top:${S1.y + 250}px;width:460px;height:110px;background:${C.good};color:#04130a;font-size:56px">TU DÍA ENTERO</div>
`);
world.push(character("pro", 640, 1490, LOOK.pro, {
  scale: 0.95,
  poses: [[0, "run"], [0.62, "idle"], [P("cambiar") - 0.1, "point"], [P("dia"), "cheer"], [SALE1, "run"]],
  mood: [[0, 0.7], [P("dia"), 1]], off: 0.3,
}));
tw(`tl.fromTo("#s1-reloj",{scale:1.45,rotation:-8},{scale:1,rotation:0,duration:0.55,ease:"back.out(2.2)"},0);`);
tw(`tl.fromTo("#pro",{x:-330},{x:0,duration:0.62,ease:"power3.out"},0);`);
tw(`tl.fromTo("#pro",{x:0},{x:1100,duration:0.6,ease:"power2.in",immediateRender:false},${r(SALE1)});`);
tw(`tl.to("#pro",{opacity:0,duration:0.2},${r(SALE1 + 0.55)});`);
rollTo(reloj, "10:00", 120, P("diez"), 0.9);
tw(`tl.fromTo("#s1-aro",{strokeDashoffset:${(2 * Math.PI * 232).toFixed(1)}},{strokeDashoffset:0,duration:${r(E("minutos") - P("diez") + 0.5)},ease:"power2.inOut"},${r(P("diez"))});`);
tw(`tl.to("#s1-aro",{stroke:"${C.good}",duration:0.3},${r(P("cambiar"))});`);
tw(`tl.fromTo("#s1-reloj",{scale:1},{scale:1.08,duration:0.16,yoyo:true,repeat:1,ease:"power2.out",immediateRender:false},${r(P("cambiar"))});`);
tw(`tl.fromTo("#s1-sol",{opacity:0,scale:0.4},{opacity:1,scale:1,duration:0.3,ease:"back.out(2)"},${r(P("dia") - 0.05)});`);
tw(`tl.fromTo("#s1-sol",{x:-330,y:0},{keyframes:[{x:-233,y:-233},{x:0,y:-330},{x:233,y:-233},{x:330,y:0}],duration:${r(E("entero") - P("dia") + 0.35)},ease:"none"},${r(P("dia") - 0.05)});`);
tw(`tl.fromTo("#s1-sol",{rotation:0},{rotation:180,duration:1.2,ease:"none"},${r(P("dia"))});`);
pop("#s1-tag", P("entero") - 0.1);

// ======================= ESCENA 2 · 1 de cada 3 =======================
const pct = roller("31", 170, C.bad);
world.push(`
  <div id="s2-panel" class="abs card" style="left:${S2.x - 440}px;top:${S2.y - 520}px;width:880px;height:300px;padding:34px 44px;flex-direction:row;gap:30px">
    <div style="display:flex;align-items:flex-end;gap:4px">${pct.html}<span style="font-size:110px;font-weight:900;color:${C.bad};line-height:150px">%</span></div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <div class="lbl" style="font-size:50px;color:${C.ink};line-height:1.05">de los adultos<br>no se mueve<br>lo suficiente</div>
      <div class="lbl" style="font-size:30px;color:${C.muted}">Fuente: OMS · 2024</div>
    </div>
  </div>
  <div id="s2-sofa" class="abs" style="left:${S2.x + 280 - 190}px;top:${S2.y + 270}px;width:380px;height:380px">${icon("couch", 380, "#475569")}</div>
`);
world.push(character("adA", S2.x - 290, S2.y + 490, LOOK.adultoA, { scale: 0.92, poses: [[0, "idle"], [P("mueve"), "run"]], mood: [[0, 0.5], [P("mueve"), 0.9]], off: 0.9 }));
world.push(character("adB", S2.x, S2.y + 490, LOOK.adultoB, { scale: 0.92, poses: [[0, "idle"], [P("mueve") + 0.12, "run"]], mood: [[0, 0.5], [P("mueve"), 0.9]], off: 1.7 }));
world.push(character("adC", S2.x + 290, S2.y + 490, LOOK.adultoC, { scale: 0.92, poses: [[0, "idle"], [P("no") + 0.05, "sit"]], mood: [[0, 0.5], [P("no"), -0.8]], off: 2.4 }));
pop("#adA", P("uno"));
pop("#adB", P("cada"));
pop("#adC", P("tres"));
tw(`tl.fromTo("#s2-sofa",{opacity:0,x:260},{opacity:1,x:0,duration:0.4,ease:"power3.out"},${r(P("no") - 0.15)});`);
tw(`tl.fromTo("#adC",{filter:"grayscale(0) brightness(1)"},{filter:"grayscale(1) brightness(0.62)",duration:0.5,ease:"power2.out"},${r(P("no"))});`);
pop("#s2-panel", P("lo") - 0.12, 0.5);
rollTo(pct, "31", 170, P("suficiente") - 0.2, 0.8);

// ======================= ESCENA 3 · Beneficios =======================
function benefit(id, y, ic, color, title, extra) {
  world.push(`
  <div id="${id}" class="abs card" style="left:${S3.x - 440}px;top:${y - 95}px;width:880px;height:190px;padding:0 34px;flex-direction:row;gap:28px;justify-content:flex-start">
    <div class="center" style="width:128px;height:128px;border-radius:36px;background:${color}22;flex:none">${icon(ic, 82, color)}</div>
    <div class="lbl" style="font-size:58px;color:${C.ink};flex:1">${title}</div>
    ${extra}
  </div>`);
}
benefit("s3-sueno", S3.y - 510, "moon", "#6366f1", "Duermes mejor",
  `<svg width="170" height="110" viewBox="0 0 170 110" style="flex:none"><path id="s3-graf" d="M6 96 L46 80 L82 84 L118 46 L162 14" fill="none" stroke="${C.good}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1.2" stroke-dashoffset="1.1"/></svg>`);
benefit("s3-energia", S3.y - 300, "lightning", "#f59e0b", "Más energía",
  `<svg width="170" height="90" viewBox="0 0 170 90" style="flex:none"><rect x="4" y="10" width="146" height="70" rx="16" fill="none" stroke="${C.ink}" stroke-width="8"/><rect x="154" y="32" width="12" height="26" rx="4" fill="${C.ink}"/><rect id="s3-bat" x="16" y="22" width="0" height="46" rx="8" fill="${C.good}"/></svg>`);
benefit("s3-humor", S3.y - 90, "smiley", "#ec4899", "Mejor humor",
  `<svg width="120" height="120" viewBox="0 0 120 120" style="flex:none"><circle cx="60" cy="60" r="54" fill="#facc15"/><circle cx="42" cy="48" r="7" fill="${C.ink}"/><circle cx="78" cy="48" r="7" fill="${C.ink}"/><path id="s3-boca" d="M36 80 Q60 80 84 80" stroke="${C.ink}" stroke-width="8" stroke-linecap="round" fill="none"/></svg>`);
world.push(character("pro2", S3.x, S3.y + 410, LOOK.pro, { scale: 0.8, poses: [[0, "run"], [P("humor"), "cheer"]], mood: [[0, 0.9]], off: 0.6 }));
tw(`tl.fromTo("#pro2",{x:-900},{x:0,duration:0.9,ease:"power3.out"},${r(P("moverte") - 0.1)});`);
pop("#s3-sueno", P("dormir") - 0.08);
tw(`tl.fromTo("#s3-graf",{strokeDashoffset:1.1},{strokeDashoffset:0,duration:0.7,ease:"power2.out"},${r(P("dormir") + 0.15)});`);
pop("#s3-energia", P("energia") - 0.08);
tw(`tl.fromTo("#s3-bat",{attr:{width:0}},{attr:{width:122},duration:0.8,ease:"power2.out"},${r(P("energia") + 0.1)});`);
pop("#s3-humor", P("humor") - 0.08);
tw(`tl.fromTo("#s3-boca",{attr:{d:"M36 80 Q60 80 84 80"}},{attr:{d:"M34 72 Q60 104 86 72"},duration:0.45,ease:"back.out(2)"},${r(P("humor") + 0.12)});`);

// ======================= ESCENA 4 · Empezar cuesta / Novato contra pro =======================
world.push(`
  <div id="s4-sofa" class="abs" style="left:${S4.x - 230 - 180}px;top:${S4.y + 130}px;width:360px;height:360px">${icon("couch", 360, "#475569")}</div>
  <div id="s4-alarma" class="abs" style="left:${S4.x - 230 - 60}px;top:${S4.y - 360}px;width:120px;height:120px">${icon("alarm", 120, C.bad)}</div>
  <div id="s4-vs" class="abs center" style="left:${S4.x - 200}px;top:${S4.y - 420}px;width:400px;height:300px;font-size:260px;font-weight:900;color:#fff;letter-spacing:-.06em;font-style:italic">VS</div>
  ${tagPill("s4-tn", S4.x - 230 - 130, S4.y + 400, "NOVATO", C.novato, 260)}
  ${tagPill("s4-tp", S4.x + 230 - 130, S4.y + 400, "PRO", C.pro, 260)}
`);
world.push(character("nov0", S4.x - 230, S4.y + 340, LOOK.novato, {
  scale: 0.9, off: 1.1,
  poses: [[0, "sit"], [P("empezar"), "tired"], [P("cuesta") + 0.15, "sit"], [P("novato") - 0.1, "idle"]],
  mood: [[0, -0.2], [P("empezar"), -0.9], [P("novato"), 0.2]],
}));
world.push(character("pro0", S4.x + 230, S4.y + 340, LOOK.pro, {
  scale: 0.9, off: 0.2, poses: [[0, "run"], [P("pro") + 0.05, "idle"]], mood: [[0, 1]],
}));
tw(`tl.fromTo("#s4-alarma",{rotation:-14},{rotation:14,duration:0.08,repeat:9,yoyo:true,ease:"none"},${r(P("empezar"))});`);
pop("#s4-alarma", P("empezar") - 0.1, 0.3);
tw(`tl.to("#s4-alarma",{opacity:0,scale:0.5,duration:0.2},${r(P("cuesta") + 0.4)});`);
tw(`tl.to("#s4-sofa",{opacity:0,x:-200,duration:0.35,ease:"power2.in"},${r(P("novato") + 0.1)});`);
pop("#s4-tn", P("novato"));
tw(`tl.fromTo("#s4-vs",{scale:3,opacity:0,rotation:-12},{scale:1,opacity:1,rotation:0,duration:0.35,ease:"power4.out"},${r(P("contra") - 0.05)});`);
tw(`tl.fromTo("#pro0",{x:700},{x:0,duration:0.45,ease:"power3.out"},${r(P("pro") - 0.45)});`);
pop("#s4-tp", P("pro"));

// ======================= DUELOS =======================
// Cada duelo: arriba el novato, abajo el pro. Cabecera con número y tema.
function duelFrame(id, Dp, num, tema) {
  world.push(`
  <div id="${id}-cab" class="abs" style="left:${Dp.x - 400}px;top:${Dp.y - 700}px;width:800px;height:120px;display:flex;align-items:center;gap:22px">
    <div id="${id}-num" class="center" style="width:120px;height:120px;border-radius:60px;background:#fff;color:${C.ink};font-size:76px;font-weight:900;flex:none">${num}</div>
    <div id="${id}-tema" class="lbl" style="font-size:58px;color:#fff">${tema}</div>
  </div>
  <div class="abs" style="left:${Dp.x - 400}px;top:${Dp.y - 2}px;width:800px;height:4px;background:rgba(255,255,255,.14);border-radius:2px"></div>
  ${tagPill(`${id}-tn`, Dp.x - 400, Dp.y - 560, "NOVATO", C.novato)}
  ${tagPill(`${id}-tp`, Dp.x - 400, Dp.y + 40, "PRO", C.pro)}`);
}
/** Cámara de un duelo: llega, entra en el novato, baja al pro y se aleja. */
function duelCamera(Dp, tLlega, tNovato, tPro, tAleja) {
  cam(tLlega, tLlega + 0.55, Dp.x, Dp.y - 60, 0.88, "inOut", 0.3);
  cam(tNovato - 0.2, tNovato + 0.25, Dp.x + 10, Dp.y - 270, 1.12, "inOut");
  cam(tPro - 0.1, tPro + 0.4, Dp.x + 10, Dp.y + 290, 1.12, "inOut");
  cam(tAleja, tAleja + 0.35, Dp.x, Dp.y - 60, 0.88, "inOut");
}
function duelIntro(id, tNum) {
  pop(`#${id}-num`, tNum, 0.4);
  tw(`tl.fromTo("#${id}-tema",{opacity:0,filter:"blur(8px)"},{opacity:1,filter:"blur(0px)",duration:0.2,ease:"power2.out"},${r(tNum + 0.15)});`);
  pop(`#${id}-tn`, tNum + 0.25, 0.3);
  pop(`#${id}-tp`, tNum + 0.32, 0.3);
}
const card = (id, x, y, w, h, inner, extra = "") =>
  `<div id="${id}" class="abs card" style="left:${x - w / 2}px;top:${y - h / 2}px;width:${w}px;height:${h}px;flex-direction:column;gap:14px;${extra}">${inner}</div>`;
const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

// ---- Duelo 1 · Cómo empezar ----
duelFrame("d1", D1, "1", "Cómo empezar");
const tN1 = P("novato", 2), tP1 = P("pro", 2);
world.push(card("d1-cn", D1.x + 160, D1.y - 290, 500, 260, cells("d1n", DIAS, { title: "TU SEMANA" })).replace('class="abs card"', 'data-layout-allow-overlap class="abs card"'));
world.push(`<div id="d1-hora" class="abs center pill" style="left:${D1.x + 160 - 120}px;top:${D1.y - 150}px;width:240px;height:76px;background:${C.novato};color:#0b1020;font-size:40px">1 HORA</div>
  <div id="d1-sello" data-layout-allow-overlap data-layout-allow-occlusion class="abs center" style="left:${D1.x + 160 - 200}px;top:${D1.y - 350}px;width:400px;height:120px;border:10px solid ${C.bad};border-radius:24px;color:${C.bad};font-size:64px;font-weight:900;background:rgba(255,255,255,.9)">LO DEJA</div>
  <div id="d1-gota" class="abs" style="left:${D1.x - 250 + 40}px;top:${D1.y - 470}px;width:60px;height:60px">${icon("drop", 60, "#38bdf8")}</div>`);
world.push(character("nov1", D1.x - 250, D1.y - 70, LOOK.novato, {
  scale: 0.75, off: 0.5,
  poses: [[0, "idle"], [P("corre") - 0.05, "run"], [P("miercoles") + 0.1, "tired"]],
  mood: [[0, 0.3], [P("corre"), 0.6], [P("miercoles"), -1]],
}));
world.push(card("d1-cp", D1.x + 160, D1.y + 290, 500, 260, cells("d1p", DIAS, { title: "TU SEMANA" })));
world.push(`<div id="d1-diez" class="abs center pill" style="left:${D1.x + 160 - 150}px;top:${D1.y + 430}px;width:300px;height:76px;background:${C.good};color:#04130a;font-size:40px">10 MIN / DÍA</div>`);
world.push(character("pro1", D1.x - 250, D1.y + 510, LOOK.pro, {
  scale: 0.75, off: 1.4, poses: [[0, "idle"], [P("empieza") - 0.05, "walk"], [P("dia", 2), "cheer"]], mood: [[0, 0.8], [P("dia", 2), 1]],
}));
duelIntro("d1", P("uno", 2));
pop("#d1-cn", tN1 - 0.05, 0.4);
fillCell("d1n", 0, C.novato, null, P("lunes"));
pop("#d1-hora", P("hora") - 0.05, 0.35);
pop("#d1-gota", P("corre") + 0.2, 0.3);
tw(`tl.to("#d1-gota",{y:80,opacity:0,duration:0.6,ease:"power2.in"},${r(P("corre") + 0.6)});`);
fillCell("d1n", 2, C.bad, "x", P("miercoles"));
tw(`tl.fromTo("#d1-sello",{scale:2.4,opacity:0,rotation:-4},{scale:1,opacity:1,rotation:-10,duration:0.3,ease:"power4.out"},${r(P("deja") - 0.05)});`);
pop("#d1-cp", tP1 - 0.05, 0.4);
{
  const a = P("diez", 2), b = E("dia", 2) - 0.15;
  for (let i = 0; i < 7; i++) fillCell("d1p", i, C.good, "check", a + (b - a) * (i / 6));
}
pop("#d1-diez", P("minutos", 2) - 0.05, 0.35);

// ---- Duelo 2 · Cuándo hacerlo ----
duelFrame("d2", D2, "2", "Cuándo hacerlo");
const tN2 = P("novato", 3), tP2 = P("pro", 3);
world.push(`<div id="d2-sofa" class="abs" style="left:${D2.x - 250 - 150}px;top:${D2.y - 330}px;width:300px;height:300px">${icon("couch", 300, "#475569")}</div>`);
world.push(character("nov2", D2.x - 250, D2.y - 70, LOOK.novato, {
  scale: 0.75, off: 2.2, poses: [[0, "sit"]], mood: [[0, 0], [P("ganas"), -0.8]],
}));
world.push(card("d2-cn", D2.x + 160, D2.y - 300, 500, 230, `
    <div style="display:flex;align-items:center;gap:16px">${icon("hourglass-high", 56, C.novato, 'id="d2-reloj"')}<span class="lbl" style="font-size:44px;color:${C.ink}">GANAS</span></div>
    <div style="width:400px;height:44px;border-radius:22px;background:#e2e8f0;overflow:hidden"><div id="d2-barra" style="width:400px;height:44px;border-radius:22px;background:${C.novato};transform-origin:0 50%"></div></div>`));
world.push(card("d2-cp", D2.x + 160, D2.y + 280, 500, 380, `
    <div style="display:flex;align-items:center;gap:14px;width:420px">${icon("calendar-dots", 52, C.good)}<span class="lbl" style="font-size:42px;color:${C.ink}">Agenda</span></div>
    ${["17:00", "18:00", "19:00"].map((h, i) => `<div style="display:flex;align-items:center;gap:16px;width:420px;height:70px;border-top:3px solid #e2e8f0">
      <span class="lbl" style="font-size:30px;color:${C.muted};width:96px">${h}</span>
      ${i === 1 ? `<div id="d2-cita" style="flex:1;height:56px;border-radius:14px;background:${C.good};color:#04130a;font-size:34px;font-weight:900;display:flex;align-items:center;padding-left:16px;transform-origin:0 50%">${typed("Entreno", P("agenda") - 0.05, P("agenda") + 0.5)}</div>` : ""}
    </div>`).join("")}`, "justify-content:flex-start;padding-top:30px"));
world.push(`<div id="d2-cursor" class="abs" style="left:${D2.x + 200}px;top:${D2.y + 280}px;width:80px;height:80px">${icon("cursor", 80, C.ink)}</div>
  <div id="d2-notif" class="abs" style="left:${D2.x + 160 - 230}px;top:${D2.y + 50}px;width:460px;height:84px;border-radius:22px;background:#1e293b;color:#fff;display:flex;align-items:center;gap:14px;padding:0 20px;box-shadow:0 20px 50px rgba(0,0,0,.5)">${icon("bell-ringing", 46, "#facc15")}<span class="lbl" style="font-size:34px">18:00 · Entreno</span></div>`);
world.push(character("pro2b", D2.x - 250, D2.y + 510, LOOK.pro, {
  scale: 0.75, off: 0.9, poses: [[0, "idle"], [P("apunta") - 0.1, "point"], [P("cita") + 0.1, "cheer"]], mood: [[0, 0.8], [P("cita"), 1]],
}));
duelIntro("d2", P("dos"));
pop("#d2-cn", tN2 - 0.05, 0.4);
tw(`tl.fromTo("#d2-barra",{scaleX:0},{scaleX:0.22,duration:${r(P("ganas") - P("espera"))},ease:"power1.inOut"},${r(P("espera"))});`);
tw(`tl.to("#d2-barra",{scaleX:0,backgroundColor:"${C.bad}",duration:0.3,ease:"power2.in"},${r(P("ganas"))});`);
tw(`tl.fromTo("#d2-reloj",{rotation:0},{rotation:360,duration:${r(E("ganas") - P("espera") + 0.3)},ease:"power1.inOut"},${r(P("espera"))});`);
pop("#d2-cp", tP2 - 0.05, 0.4);
tw(`tl.fromTo("#d2-cursor",{x:180,y:220,opacity:0},{x:-60,y:-20,opacity:1,duration:0.4,ease:"power3.out"},${r(P("apunta") - 0.25)});`);
tw(`tl.fromTo("#d2-cursor",{scale:1},{scale:0.8,duration:0.08,yoyo:true,repeat:1,immediateRender:false},${r(P("apunta") + 0.18)});`);
tw(`tl.fromTo("#d2-cita",{scaleX:0},{scaleX:1,duration:0.25,ease:"power3.out"},${r(P("apunta") + 0.2)});`);
tw(`tl.to("#d2-cursor",{opacity:0,duration:0.2},${r(P("agenda") + 0.6)});`);
tw(`tl.fromTo("#d2-notif",{y:-160,opacity:0},{y:0,opacity:1,duration:0.4,ease:"back.out(1.6)"},${r(P("cita") - 0.1)});`);

// ---- Duelo 3 · Mantener el ritmo ----
duelFrame("d3", D3, "3", "Mantener el ritmo");
const tN3 = P("novato", 4), tP3 = P("pro", 4);
world.push(card("d3-cn", D3.x + 160, D3.y - 290, 500, 230, cells("d3n", DIAS, { title: "TU RACHA" })).replace('class="abs card"', 'data-layout-allow-overlap data-layout-allow-overflow class="abs card"'));
world.push(character("nov3", D3.x - 250, D3.y - 70, LOOK.novato, {
  scale: 0.75, off: 1.9, poses: [[0, "walk"], [P("falla") + 0.05, "idle"], [P("abandona"), "tired"]], mood: [[0, 0.5], [P("falla"), -0.4], [P("abandona"), -1]],
}));
world.push(card("d3-cp", D3.x + 160, D3.y + 260, 500, 230, cells("d3p", DIAS, { title: "TU RACHA" })));
world.push(`<div id="d3-regla" class="abs center pill" style="left:${D3.x + 160 - 220}px;top:${D3.y + 405}px;width:440px;height:80px;background:${C.good};color:#04130a;font-size:40px">NUNCA 2 SEGUIDOS</div>`);
world.push(character("pro3", D3.x - 250, D3.y + 510, LOOK.pro, {
  scale: 0.75, off: 2.6, poses: [[0, "walk"], [P("regla") - 0.1, "point"], [P("seguidos"), "cheer"]], mood: [[0, 0.8], [P("seguidos"), 1]],
}));
duelIntro("d3", P("tres", 2));
pop("#d3-cn", tN3 - 0.2, 0.4);
for (let i = 0; i < 3; i++) fillCell("d3n", i, C.good, "check", tN3 + 0.05 + i * 0.12);
fillCell("d3n", 3, C.bad, "x", P("falla"));
{ // "lo abandona todo": las casillas se caen
  const t = P("abandona");
  for (let i = 0; i < 7; i++) {
    const rot = [-38, 24, -16, 42, -28, 18, -44][i];
    tw(`tl.to("#d3n-c${i}",{y:260,rotation:${rot},opacity:0,duration:0.55,ease:"power2.in"},${r(t + i * 0.05)});`);
  }
}
pop("#d3-cp", tP3 - 0.05, 0.4);
for (let i = 0; i < 3; i++) fillCell("d3p", i, C.good, "check", tP3 + 0.1 + i * 0.12);
fillCell("d3p", 3, "#cbd5e1", "x", P("regla"));
pop("#d3-regla", P("nunca") - 0.05, 0.35);
fillCell("d3p", 4, C.good, "check", P("dos", 2));
fillCell("d3p", 5, C.good, "check", P("dias"));
fillCell("d3p", 6, C.good, "check", P("seguidos"));

// ======================= CLÍMAX · 66 días =======================
const sesenta = roller("00", 260, "#fff");
const grid = Array.from({ length: 66 }, (_, i) => `<div id="cl-g${i}" class="clg"></div>`).join("");
world.push(`
  <div id="cl-cont" class="abs" style="left:${CL.x - 400}px;top:${CL.y - 420}px;width:800px;height:270px;display:flex;align-items:flex-end;justify-content:center;gap:24px">
    ${sesenta.html}<span class="lbl" style="font-size:96px;color:${C.good};line-height:200px">días</span>
  </div>
  ${card("cl-card", CL.x, CL.y + 150, 820, 470, `<div id="cl-grid" style="display:grid;grid-template-columns:repeat(11,58px);gap:10px">${grid}</div>`)}
  <div id="cl-auto" class="abs center pill" style="left:${CL.x - 250}px;top:${CL.y + 410}px;width:500px;height:96px;background:${C.good};color:#04130a;font-size:48px;gap:12px">${icon("check-circle", 54, "#04130a")} AUTOMÁTICO</div>
`);
pop("#cl-cont", P("habito") - 0.1, 0.4);
pop("#cl-card", P("habito"), 0.45);
rollTo(sesenta, "66", 260, P("sesenta") - 0.1, 0.9);
{
  const a = P("habito") + 0.3, b = P("automatico");
  tw(`tl.fromTo("#cl-grid .clg",{backgroundColor:"#e2e8f0"},{backgroundColor:"${C.good}",duration:0.1,stagger:${r((b - a) / 66)}},${r(a)});`);
  tw(`tl.fromTo("#cl-grid .clg",{scale:1},{scale:1.15,duration:0.12,yoyo:true,repeat:1,stagger:0.004,immediateRender:false},${r(b + 0.05)});`);
}
pop("#cl-auto", P("automatico") + 0.05, 0.45);

// ======================= FINAL · Empieza hoy =======================
world.push(`<div id="fin-zapas" class="abs" style="left:${FIN.x - 90}px;top:${FIN.y - 300}px;width:180px;height:180px">${icon("sneaker", 180, C.novato)}</div>
  <div id="fin-hoy" class="abs center pill" style="left:${FIN.x - 270}px;top:${FIN.y - 470}px;width:540px;height:110px;background:#fff;color:${C.ink};font-size:60px">EMPIEZA HOY</div>`);
const RUN_T0 = P("dos", 3), RUN_T1 = P("mandaselo") - 0.05;
world.push(character("novF", FIN.x - 170, FIN.y + 480, LOOK.novato, {
  scale: 0.8, off: 0.7,
  poses: [[0, "idle"], [P("hoy"), "cheer"], [RUN_T0 - 0.1, "run"], [RUN_T1, "idle"], [P("sigueme"), "cheer"]],
  mood: [[0, 0.1], [P("hoy"), 1]],
}));
world.push(character("proF", FIN.x + 170, FIN.y + 480, LOOK.pro, {
  scale: 0.8, off: 1.6,
  poses: [[0, "idle"], [RUN_T0 - 0.1, "run"], [RUN_T1, "idle"], [P("sigueme") + 0.1, "point"]],
  mood: [[0, 0.9]],
}));
pop("#novF", P("empieza", 2) - 0.1, 0.4);
pop("#proF", P("empieza", 2), 0.4);
pop("#fin-hoy", P("empieza", 2) + 0.05, 0.4);
// El novato se transforma en su sitio: fuera pijama, cinta y zapatillas
tw(`tl.to("#novF-shirt",{attr:{fill:"${C.novato}"},duration:0.35},${r(P("hoy"))});`);
tw(`tl.to("#novF-armF",{attr:{stroke:"${C.novato}"},duration:0.35},${r(P("hoy"))});`);
tw(`tl.to("#novF-stripes",{opacity:0,duration:0.3},${r(P("hoy"))});`);
tw(`tl.fromTo("#novF-band",{opacity:0},{opacity:1,duration:0.3},${r(P("hoy"))});`);
pop("#fin-zapas", P("hoy") - 0.1, 0.35);
tw(`tl.to("#fin-zapas",{x:-170,y:560,scale:0.3,opacity:0,duration:0.4,ease:"power2.in"},${r(P("hoy") + 0.35)});`);
tw(`tl.fromTo("#novF",{x:0},{x:${CTA.x - FIN.x},duration:${r(RUN_T1 - RUN_T0)},ease:"power2.inOut",immediateRender:false},${r(RUN_T0)});`);
tw(`tl.fromTo("#proF",{x:0},{x:${CTA.x - FIN.x},duration:${r(RUN_T1 - RUN_T0)},ease:"power2.inOut",immediateRender:false},${r(RUN_T0)});`);

// ======================= LLAMADA A LA ACCIÓN =======================
world.push(card("cta-chat", CTA.x, CTA.y - 300, 780, 300, `
    <div style="display:flex;align-items:center;gap:16px;width:690px">
      <div class="center" style="width:72px;height:72px;border-radius:36px;background:#e2e8f0">${icon("user", 46, C.muted)}</div>
      <span class="lbl" style="font-size:38px;color:${C.ink}">Tu amigo</span>
    </div>
    <div style="display:flex;align-items:center;gap:16px;width:690px;justify-content:flex-end">
      <div id="cta-burbuja" style="padding:18px 26px;border-radius:28px 28px 8px 28px;background:${C.good};color:#04130a;font-size:44px;font-weight:900;white-space:nowrap">${typed("¿Empezamos juntos?", P("mandaselo") + 0.15, P("empezar", 2) + 0.3)}</div>
      <div id="cta-avion">${icon("paper-plane-tilt", 64, C.good)}</div>
    </div>`));
world.push(`
  <div id="cta-boton" class="abs center pill" style="left:${CTA.x - 270}px;top:${CTA.y - 70}px;width:540px;height:140px;background:${C.bad};color:#fff;font-size:60px">
    <span id="cta-seguir" class="abs center" style="inset:0;gap:16px">${icon("user-plus", 64, "#fff")} SEGUIR</span>
    <span id="cta-siguiendo" class="abs center" style="inset:0;gap:16px;opacity:0">${icon("check-fat", 60, "#fff")} SIGUIENDO</span>
  </div>
  <div id="cta-cursor" class="abs" style="left:${CTA.x + 200}px;top:${CTA.y + 30}px;width:90px;height:90px">${icon("cursor", 90, "#fff")}</div>`);
pop("#cta-chat", P("mandaselo") - 0.1, 0.45);
tw(`tl.fromTo("#cta-avion",{x:0,y:0,opacity:1},{x:220,y:-160,opacity:0,duration:0.5,ease:"power2.in"},${r(E("contigo") + 0.05)});`);
pop("#cta-boton", P("sigueme") - 0.15, 0.45);
tw(`tl.fromTo("#cta-cursor",{x:260,y:300,opacity:0},{x:0,y:0,opacity:1,duration:0.4,ease:"power3.out"},${r(P("sigueme"))});`);
tw(`tl.fromTo("#cta-boton",{scale:1},{scale:0.92,duration:0.08,yoyo:true,repeat:1,immediateRender:false},${r(P("sigueme") + 0.45)});`);
tw(`tl.to("#cta-boton",{backgroundColor:"#334155",duration:0.25},${r(P("sigueme") + 0.5)});`);
tw(`tl.to("#cta-seguir",{opacity:0,duration:0.15},${r(P("sigueme") + 0.5)});`);
tw(`tl.to("#cta-siguiendo",{opacity:1,duration:0.2},${r(P("sigueme") + 0.55)});`);

// ======================= CÁMARA Y CAMINO =======================
const cam0 = { cx: S1.x, cy: S1.y + 40, z: 1.14 };
cam(0, 0.6, S1.x, S1.y + 30, 1.0, "out");
cam(P("cambiar") - 0.05, P("cambiar") + 0.5, S1.x, S1.y + 20, 1.05);
cam(VIAJE1, VIAJE1 + 0.55, S2.x, S2.y + 40, 1.0, "inOut", 0.35);
cam(P("suficiente") - 0.25, P("suficiente") + 0.3, S2.x, S2.y - 110, 1.06);
cam(ALEJA2, ALEJA2 + 0.4, S2.x, (S1.y + S2.y) / 2 + 40, 0.36);
cam(VIAJE2, VIAJE2 + 0.6, S3.x, S3.y - 90, 1.0, "inOut", 0.25);
cam(P("energia") - 0.1, P("energia") + 0.5, S3.x, S3.y - 80, 1.03);
cam(VIAJE3, VIAJE3 + 0.55, S4.x, S4.y + 40, 1.0, "inOut", 0.3);
cam(P("contra") - 0.05, P("contra") + 0.12, S4.x, S4.y + 40, 1.06, "out");  // golpe del VS
cam(P("pro") + 0.1, P("pro") + 0.4, S4.x, S4.y + 40, 1.0);
const tD1 = P("uno", 2) - 0.4, tD2 = P("dos") - 0.35, tD3 = P("tres", 2) - 0.35;
duelCamera(D1, tD1, tN1, E("deja") + 0.05, tD2 - 0.4);
duelCamera(D2, tD2, tN2, E("ganas") + 0.05, tD3 - 0.4);
duelCamera(D3, tD3, tN3, E("todo") + 0.05, P("seguidos") + 0.2);
// "Y el dato clave": la cámara se aleja y enseña todo el camino recorrido
const tTodo = P("dato") - 0.2;
cam(tTodo, tTodo + 0.55, 2600, 4100, 0.16);
cam(P("habito") - 0.55, P("habito") + 0.05, CL.x, CL.y + 40, 1.0, "inOut");
cam(P("automatico"), P("automatico") + 0.15, CL.x, CL.y + 40, 1.06, "out");
cam(P("automatico") + 0.2, P("automatico") + 0.6, CL.x, CL.y + 40, 1.0);
const tFin = P("empieza", 2) - 0.35;
cam(tFin, tFin + 0.55, FIN.x, FIN.y + 40, 1.0, "inOut", 0.3);
cam(RUN_T0, RUN_T1, CTA.x, CTA.y + 40, 1.0, "inOut");
cam(P("sigueme") + 0.45, P("sigueme") + 0.6, CTA.x, CTA.y + 40, 1.05, "out");
cam(P("sigueme") + 0.65, P("sigueme") + 1.1, CTA.x, CTA.y + 40, 1.0);

link(S1, S2, VIAJE1 - 0.05);
link(S2, S3, VIAJE2);
link(S3, S4, VIAJE3);
link(S4, D1, tD1);
link(D1, D2, tD2);
link(D2, D3, tD3);
link(D3, CL, P("habito") - 0.6);
link(CL, FIN, tFin);
link(FIN, CTA, RUN_T0, RUN_T1 - RUN_T0);

// ======================= EFECTOS DE SONIDO =======================
// Cada efecto va atado al mismo momento que su animación. Los mezcla scripts/mezcla.py.
const SFX = [];
const sfx = (name, t, vol = 1) => SFX.push({ name, t: r(Math.max(0, t)), vol });
sfx("impact-bass-1", 0, 0.7);                                   // golpe de arranque
for (const t of [VIAJE1, VIAJE2, VIAJE3, tD1, tD2, tD3, tTodo, P("habito") - 0.55, tFin]) sfx("whoosh", t, 0.55);
sfx("whoosh-short", RUN_T0, 0.5);
[P("entero") - 0.1, P("uno"), P("cada"), P("tres"), P("lo") - 0.12, P("dormir") - 0.08, P("energia") - 0.08, P("humor") - 0.08,
 P("novato"), P("pro"), P("hora") - 0.05, P("minutos", 2) - 0.05, P("nunca") - 0.05, P("habito"), P("empieza", 2), P("mandaselo") - 0.1,
 P("sigueme") - 0.15, P("automatico") + 0.05].forEach((t) => sfx("pop", t, 0.45));
for (const t of [tN1, tP1, tN2, tP2, tN3, tP3]) sfx("pop", t - 0.05, 0.35);              // tarjetas de los duelos
for (const t of [P("uno", 2), P("dos"), P("tres", 2)]) sfx("ping", t, 0.35);              // números de los duelos
sfx("ping", P("suficiente"), 0.4);
sfx("impact-bass-1", P("contra") - 0.05, 0.6);                  // VS
sfx("impact-bass-1", P("deja") - 0.05, 0.45);                   // sello LO DEJA
sfx("error", P("miercoles"), 0.3);
sfx("error", P("falla"), 0.3);
sfx("whoosh-short", P("abandona"), 0.45);                       // las casillas se caen
{ const a = P("diez", 2), b = E("dia", 2) - 0.15; for (let i = 0; i < 7; i++) sfx("click-soft", a + (b - a) * (i / 6), 0.35); }
for (const t of [P("dos", 2), P("dias"), P("seguidos")]) sfx("click-soft", t, 0.4);
sfx("click", P("apunta") + 0.18, 0.55);
sfx("typing", P("agenda") - 0.05, 0.35);
sfx("notification", P("cita") - 0.1, 0.35);
sfx("impact-bass-1", P("automatico"), 0.85);                    // clímax
sfx("sparkle", P("automatico") + 0.05, 0.4);
sfx("chime", P("hoy"), 0.3);
sfx("typing", P("mandaselo") + 0.15, 0.3);
sfx("whoosh-short", E("contigo") + 0.05, 0.4);                  // el avión de papel sale
sfx("click", P("sigueme") + 0.45, 0.6);
sfx("chime", P("sigueme") + 0.55, 0.3);

// Iconos dentro de las casillas
const ICON_SVG = { check: icon("check-fat", 38, "#fff"), x: icon("x", 38, "#fff") };
let worldHTML = world.join("\n");
for (const { sel, ic } of iconFill) {
  worldHTML = worldHTML.replace(`<div id="${sel}" class="center"`, `<div id="${sel}" class="center" data-ic="${ic}"`)
    .replace(new RegExp(`(<div id="${sel}" class="center" data-ic="${ic}"[^>]*>)</div>`), `$1${ICON_SVG[ic]}</div>`);
}

// ---------- HTML del mundo ----------
const runtime = fs.readFileSync(path.join(HERE, "runtime.js"), "utf8");
const DATA = { D, FY: 960, cam0, moves, chars, float: [] };
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
    .camino { fill:none; stroke:rgba(255,255,255,.28); stroke-width:14; stroke-linecap:round; stroke-dasharray:22 26; }
  </style>
  <div id="root" data-composition-id="mundo" data-width="1080" data-height="1920">
    <div id="bg"></div>
    <div id="world">
      <svg class="abs" width="6000" height="9000" style="left:0;top:0" overflow="visible">${linkSVG}
      </svg>
      ${worldHTML}
    </div>
    <div id="glow"></div>
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
  diez: C.good, minutos: C.good, dia: C.good, tres: C.bad, suficiente: C.bad, dormir: C.good, energia: C.good,
  humor: C.good, cuesta: C.bad, novato: C.novato, pro: C.pro, hora: C.novato, deja: C.bad, ganas: C.novato,
  agenda: C.good, falla: C.bad, abandona: C.bad, regla: C.good, seguidos: C.good, clave: C.good,
  sesenta: C.good, automatico: C.good, hoy: C.good, solo: C.good, siguem: C.good, sigueme: C.good, mandaselo: C.good,
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
