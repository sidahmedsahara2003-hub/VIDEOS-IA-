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
        <g id="${id}-torso" transform-origin="0 -170"><rect x="-54" y="-322" width="108" height="164" rx="48" fill="${shirt}"/>
          ${look.stripes ? `<path d="M-50 -280H50M-54 -240H54M-52 -200H52" stroke="${shade(shirt, 0.3)}" stroke-width="10"/>` : ""}
          ${look.number ? `<text x="0" y="-222" text-anchor="middle" font-family="Inter" font-weight="900" font-size="56" fill="#fff">${look.number}</text>` : ""}
        </g>
        <g id="${id}-head">
          <rect x="-14" y="40" width="28" height="30" fill="${shade(skin, -0.12)}"/>
          <circle r="64" fill="${skin}"/>
          <path d="${look.hairPath || "M-64 -6C-66 -60 -20 -78 10 -72C52 -66 70 -36 64 -8C46 -34 10 -44 -20 -36C-40 -30 -52 -20 -64 -6Z"}" fill="${hair}"/>
          ${band ? `<rect x="-66" y="-30" width="132" height="18" rx="9" fill="${band}"/>` : ""}
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
const LOOK = {
  pro: { shirt: C.pro, pants: "#14532d", hair: "#1f1611", band: "#ffffff", number: "" },
  adultoA: { shirt: "#3b82f6", pants: "#1e3a8a", hair: "#3f2a1d" },
  adultoB: { shirt: "#a855f7", pants: "#4c1d95", hair: "#111827", hairPath: "M-66 10C-74 -60 -24 -84 12 -76C56 -68 76 -30 66 14C60 -20 40 -40 0 -42C-30 -42 -50 -20 -66 10Z" },
  adultoC: { shirt: "#f43f5e", pants: "#7f1d1d", hair: "#6b3e1e" },
};

// ---------- Mundo: escenas, camino y animaciones ----------
const world = [];   // HTML dentro del mundo
const T = [];       // líneas GSAP
const moves = [];   // movimientos de cámara
const float = [];   // cosas que flotan suavemente
const tw = (s) => T.push(s);
const pop = (sel, t, d = 0.45) => tw(`tl.fromTo("${sel}",{scale:0,opacity:0},{scale:1,opacity:1,duration:${d},ease:"back.out(1.8)"},${r(t)});`);
const cam = (t0, t1, cx, cy, z, ease = "inOut", arc = 0) => moves.push({ t0: r(t0), t1: r(t1), cx, cy, z, ease, arc });

// Rodillo de dígitos: cada columna es una tira 0-9 que se desplaza.
let rollN = 0;
function roller(digits, size, color, { suffix = "", weight = 900 } = {}) {
  const id = `roll${rollN++}`;
  const cols = digits.split("").map((d, i) => {
    if (!/\d/.test(d)) return `<span class="rsep">${d}</span>`;
    const nums = Array.from({ length: 21 }, (_, k) => `<div>${k % 10}</div>`).join("");
    return `<span class="rcol" style="height:${size}px"><span class="rstrip" id="${id}-${i}">${nums}</span></span>`;
  }).join("");
  return { id, html: `<div class="roller" style="font-size:${size}px;line-height:${size}px;color:${color};font-weight:${weight}">${cols}${suffix}</div>` };
}
/** Hace girar el rodillo hasta `target` (misma forma que digits). */
function rollTo(rl, target, size, t, d = 0.9) {
  target.split("").forEach((ch, i) => {
    if (!/\d/.test(ch)) return;
    const n = +ch + 10; // da una vuelta entera antes de parar
    tw(`tl.fromTo("#${rl.id}-${i}",{y:0},{y:${-n * size},duration:${r(d + i * 0.12)},ease:"power3.out"},${r(t)});`);
  });
}

// Camino que une todas las escenas (segmentos rectos, longitud exacta).
const pathPts = [];
let pathLen = 0;
function pathTo(x, y, t0, t1) {
  if (pathPts.length) {
    const [px, py] = pathPts.at(-1);
    const before = pathLen;
    pathLen += Math.hypot(x - px, y - py);
    pathPts.push([x, y]);
    tw(`tl.to("#camino",{strokeDashoffset:${r(-before)}-0,duration:0.001},0);`); // marcador de orden
    T.pop();
    segs.push({ before, after: pathLen, t0, t1 });
  } else pathPts.push([x, y]);
}
const segs = [];

// ======================= ESCENA 1 · GANCHO (10 minutos) =======================
const S1 = { x: 1000, y: 1000 };
// Momentos clave, siempre atados a palabras de la voz
const SALE1 = E("entero") - 0.15;          // el Pro se va corriendo
const VIAJE1 = E("entero") - 0.05;         // cámara: escena 1 → 2
const ALEJA2 = P("suficiente") + 0.6;      // cámara: plano general del gancho
const VIAJE2 = P("moverte") + 0.06;        // cámara: escena 2 → 3
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
  mood: [[0, 0.7], [P("dia"), 1]],
  off: 0.3,
}));
// Arranque: el reloj ya está en pantalla en el fotograma 0 y golpea
tw(`tl.fromTo("#s1-reloj",{scale:1.45,rotation:-8},{scale:1,rotation:0,duration:0.55,ease:"back.out(2.2)"},0);`);
tw(`tl.fromTo("#pro",{x:-330},{x:0,duration:0.62,ease:"power3.out"},0);`);
tw(`tl.fromTo("#pro",{x:0},{x:1100,duration:0.6,ease:"power2.in",immediateRender:false},${r(SALE1)});`);
tw(`tl.to("#pro",{opacity:0,duration:0.2},${r(SALE1 + 0.55)});`);
rollTo(reloj, "10:00", 120, P("diez"), 0.9);
tw(`tl.fromTo("#s1-aro",{strokeDashoffset:${(2 * Math.PI * 232).toFixed(1)}},{strokeDashoffset:0,duration:${r(E("minutos") - P("diez") + 0.5)},ease:"power2.inOut"},${r(P("diez"))});`);
tw(`tl.to("#s1-aro",{stroke:"${C.good}",duration:0.3},${r(P("cambiar"))});`);
tw(`tl.fromTo("#s1-reloj",{scale:1},{scale:1.08,duration:0.16,yoyo:true,repeat:1,ease:"power2.out",immediateRender:false},${r(P("cambiar"))});`);
// El sol recorre el arco del reloj: amanece y anochece = "tu día entero"
tw(`tl.fromTo("#s1-sol",{opacity:0,scale:0.4},{opacity:1,scale:1,duration:0.3,ease:"back.out(2)"},${r(P("dia") - 0.05)});`);
tw(`tl.fromTo("#s1-sol",{x:-330,y:0},{keyframes:[{x:-233,y:-233},{x:0,y:-330},{x:233,y:-233},{x:330,y:0}],duration:${r(E("entero") - P("dia") + 0.35)},ease:"none"},${r(P("dia") - 0.05)});`);
tw(`tl.fromTo("#s1-sol",{rotation:0},{rotation:180,duration:1.2,ease:"none"},${r(P("dia"))});`);
pop("#s1-tag", P("entero") - 0.1);

// ======================= ESCENA 2 · 1 de cada 3 =======================
const S2 = { x: 1000, y: 2500 };
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
// "no se mueve": el tercero se apaga y cae en el sofá
tw(`tl.fromTo("#s2-sofa",{opacity:0,x:260},{opacity:1,x:0,duration:0.4,ease:"power3.out"},${r(P("no") - 0.15)});`);
tw(`tl.fromTo("#adC",{filter:"grayscale(0) brightness(1)"},{filter:"grayscale(1) brightness(0.62)",duration:0.5,ease:"power2.out"},${r(P("no"))});`);
pop("#s2-panel", P("lo") - 0.12, 0.5);
rollTo(pct, "31", 170, P("suficiente") - 0.2, 0.8);

// ======================= ESCENA 3 · Beneficios =======================
const S3 = { x: 2600, y: 2500 };
function benefit(id, y, ic, color, title, extra) {
  world.push(`
  <div id="${id}" class="abs card" style="left:${S3.x - 440}px;top:${y - 95}px;width:880px;height:190px;padding:0 34px;flex-direction:row;gap:28px;justify-content:flex-start">
    <div class="center" style="width:128px;height:128px;border-radius:36px;background:${color}22;flex:none">${icon(ic, 82, color)}</div>
    <div class="lbl" style="font-size:58px;color:${C.ink};flex:1">${title}</div>
    ${extra}
  </div>`);
}
benefit("s3-sueno", S3.y - 450, "moon", "#6366f1", "Duermes mejor",
  `<svg width="170" height="110" viewBox="0 0 170 110" style="flex:none"><path id="s3-graf" d="M6 96 L46 80 L82 84 L118 46 L162 14" fill="none" stroke="${C.good}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1.2" stroke-dashoffset="1.1"/></svg>`);
world.push(character("pro2", S3.x, S3.y + 410, LOOK.pro, { scale: 0.8, poses: [[0, "run"]], mood: [[0, 0.9]], off: 0.6 }));
tw(`tl.fromTo("#pro2",{x:-900},{x:0,duration:0.9,ease:"power3.out"},${r(P("moverte") - 0.1)});`);
pop("#s3-sueno", P("dormir") - 0.08);
tw(`tl.fromTo("#s3-graf",{strokeDashoffset:1.1},{strokeDashoffset:0,duration:0.7,ease:"power2.out"},${r(P("dormir") + 0.15)});`);

// ---------- Camino entre escenas ----------
pathTo(S1.x, S1.y + 380, 0, 0);
pathTo(S2.x, S2.y - 560, VIAJE1, VIAJE1 + 0.55);
pathTo(S2.x, S2.y - 560, 0, 0);
const pathD = "M" + pathPts.map((p) => p.join(" ")).join("L");

// Segundo tramo: de la escena 2 a la 3
const pathPts2 = [[S2.x + 470, S2.y + 80], [S3.x - 470, S3.y + 80]];

// ---------- Cámara ----------
const cam0 = { cx: S1.x, cy: S1.y + 40, z: 1.14 };
cam(0, 0.6, S1.x, S1.y + 30, 1.0, "out");
cam(P("cambiar") - 0.05, P("cambiar") + 0.5, S1.x, S1.y + 20, 1.05, "inOut");
cam(VIAJE1, VIAJE1 + 0.55, S2.x, S2.y + 40, 1.0, "inOut", 0.35);                   // viaje 1 → 2
cam(P("suficiente") - 0.25, P("suficiente") + 0.3, S2.x, S2.y - 110, 1.06, "inOut"); // acerca al dato
cam(ALEJA2, ALEJA2 + 0.4, S2.x, (S1.y + S2.y) / 2 + 40, 0.36, "inOut");            // se aleja: bloque entero
cam(VIAJE2, VIAJE2 + 0.6, S3.x, S3.y + 40, 1.0, "inOut", 0.25);                  // viaje 2 → 3
cam(P("dormir") - 0.1, P("dormir") + 0.6, S3.x, S3.y - 90, 1.04, "inOut");

// Dibujado del camino según viaja la cámara
const seg1 = Math.hypot(0, (S2.y - 560) - (S1.y + 380));
const seg2 = Math.hypot(pathPts2[1][0] - pathPts2[0][0], 0);

float.push({ id: "s1-sol-f", a: 0, p: 3, o: 0 });

// ---------- HTML del mundo ----------
const runtime = fs.readFileSync(path.join(HERE, "runtime.js"), "utf8");
const DATA = { D, FY: 960, cam0, moves, chars, float: [] };

const mundo = `<template>
  <style>
    #root { position:absolute; inset:0; overflow:hidden; background:${C.ground}; font-family:Inter, sans-serif; }
    #bg { position:absolute; inset:-200px; background-image:
      linear-gradient(rgba(255,255,255,.055) 2px, transparent 2px),
      linear-gradient(90deg, rgba(255,255,255,.055) 2px, transparent 2px); }
    #glow { position:absolute; left:-20%; right:-20%; bottom:-520px; height:1100px;
      background: radial-gradient(closest-side, rgba(34,197,94,.30), rgba(34,197,94,.10) 55%, transparent); }
    #world { position:absolute; left:0; top:0; width:4000px; height:4000px; transform-origin:0 0; }
    .abs { position:absolute; }
    .center { display:flex; align-items:center; justify-content:center; }
    .card { background:${C.card}; border-radius:44px; display:flex; align-items:center; justify-content:center; box-shadow:0 30px 80px rgba(0,0,0,.45); }
    .pill { border-radius:999px; font-weight:900; letter-spacing:-.01em; }
    .lbl { font-weight:900; letter-spacing:-.02em; }
    .char { position:absolute; }
    .roller { display:flex; align-items:flex-start; letter-spacing:-.04em; font-variant-numeric: tabular-nums; }
    .rcol { display:inline-block; overflow:hidden; }
    .rstrip { display:block; }
    .rstrip div { height:1em; }
    .rsep { display:inline-block; }
    #camino { fill:none; stroke:rgba(255,255,255,.28); stroke-width:14; stroke-linecap:round; stroke-dasharray:22 26; }
  </style>
  <div id="root" data-composition-id="mundo" data-width="1080" data-height="1920">
    <div id="bg"></div>
    <div id="world">
      <svg class="abs" width="4000" height="4000" style="left:0;top:0" overflow="visible">
        <defs><mask id="m1"><path id="camino1m" d="M${S1.x} ${S1.y + 380}L${S2.x} ${S2.y - 560}" stroke="#fff" stroke-width="30" fill="none" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></mask>
              <mask id="m2"><path id="camino2m" d="M${pathPts2[0].join(" ")}L${pathPts2[1].join(" ")}" stroke="#fff" stroke-width="30" fill="none" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></mask></defs>
        <path id="camino" d="M${S1.x} ${S1.y + 380}L${S2.x} ${S2.y - 560}" mask="url(#m1)"/>
        <path id="camino-b" d="M${pathPts2[0].join(" ")}L${pathPts2[1].join(" ")}" mask="url(#m2)" style="fill:none;stroke:rgba(255,255,255,.28);stroke-width:14;stroke-linecap:round;stroke-dasharray:22 26"/>
      </svg>
      ${world.join("\n")}
    </div>
    <div id="glow"></div>
  </div>
  <script>
    const DATA = ${JSON.stringify(DATA)};
    ${runtime}
    const tl = gsap.timeline({ paused: true });
    const clock = { t: 0 };
    tl.fromTo(clock, { t: 0 }, { t: ${D}, duration: ${D}, ease: "none", onUpdate: () => window.__mundoRender(clock.t) }, 0);
    tl.fromTo("#camino1m", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.6, ease: "power2.inOut" }, ${r(VIAJE1 - 0.05)});
    tl.fromTo("#camino2m", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.6, ease: "power2.inOut" }, ${r(VIAJE2)});
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
        data-start="0" data-duration="${D}" data-track-index="2" data-track-kind="captions" data-width="1080" data-height="1920" style="z-index:2"></div>\n` : ""}      <audio id="voz" class="clip" src="assets/voz.wav" data-start="0" data-duration="${D}" data-track-index="3" data-volume="1"></audio>
    </div>
    <script>
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;

fs.mkdirSync(path.join(OUT, "compositions"), { recursive: true });
fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
fs.copyFileSync(path.join(BASE, "voz.wav"), path.join(OUT, "assets/voz.wav"));
fs.copyFileSync(path.join(HERE, "node_modules/gsap/dist/gsap.min.js"), path.join(OUT, "assets/gsap.min.js"));
fs.writeFileSync(path.join(OUT, "index.html"), index);
fs.writeFileSync(path.join(OUT, "compositions/mundo.html"), mundo);
fs.writeFileSync(path.join(OUT, "compositions/subs.html"), subs);
console.log(`OK · ${D}s · ${groups.length} grupos de subtítulos · ${chars.length} personajes`);
