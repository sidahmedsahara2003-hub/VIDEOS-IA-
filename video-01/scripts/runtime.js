// Motor del mundo: se ejecuta en cada fotograma a partir del tiempo t.
// Cámara, personajes articulados, rejilla con paralaje y desenfoque de viaje.
// Recibe DATA = { D, FY, cam0, moves, chars } desde el generador.
(function () {
  const W = document.getElementById("world");
  const BG = document.getElementById("bg");
  const R = Math.PI / 180;
  const lerp = (a, b, u) => a + (b - a) * u;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const EASE = {
    inOut: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    out: (u) => 1 - Math.pow(1 - u, 4),
    in: (u) => u * u * u,
    linear: (u) => u,
  };

  // ---------- Cámara ----------
  function camAt(t) {
    let s = { ...DATA.cam0 };
    for (const m of DATA.moves) {
      if (t >= m.t1) { s = { cx: m.cx, cy: m.cy, z: m.z }; continue; }
      if (t <= m.t0) break;
      const u = (EASE[m.ease] || EASE.inOut)((t - m.t0) / (m.t1 - m.t0));
      let z = Math.exp(lerp(Math.log(s.z), Math.log(m.z), u));
      if (m.arc) z *= 1 - m.arc * Math.sin(Math.PI * u); // se aleja a mitad de viaje
      s = { cx: lerp(s.cx, m.cx, u), cy: lerp(s.cy, m.cy, u), z };
      break;
    }
    return s;
  }

  function applyCam(t) {
    const c = camAt(t);
    const p = camAt(Math.max(0, t - 1 / 30));
    const sx = 540 - c.cx * c.z, sy = DATA.FY - c.cy * c.z;
    W.style.transform = `translate(${sx}px, ${sy}px) scale(${c.z})`;
    const speed = Math.hypot(c.cx * c.z - p.cx * p.z, c.cy * c.z - p.cy * p.z) + Math.abs(Math.log(c.z / p.z)) * 900;
    const blur = clamp((speed - 18) / 22, 0, 5);
    W.style.filter = blur > 0.2 ? `blur(${blur.toFixed(2)}px)` : "none";
    const g = 96 * (0.55 + 0.45 * c.z);
    BG.style.backgroundSize = `${g}px ${g}px`;
    BG.style.backgroundPosition = `${(-c.cx * c.z * 0.5) % g}px ${(-c.cy * c.z * 0.5) % g}px`;
  }

  // ---------- Personajes ----------
  // Ángulos en grados desde la vertical; positivo = hacia delante.
  const POSES = {
    idle: (t, o) => {
      const b = Math.sin((t + o) * 2 * Math.PI / 3.2);
      return { h1: 5, k1: 2, h2: -5, k2: 2, s1: 10 + 3 * b, e1: 14, s2: -8 - 3 * b, e2: 12, bob: 0, lean: 0, sitY: 0, tilt: 2 * b, breath: b };
    },
    run: (t, o) => {
      const p = (t + o) * 2 * Math.PI * 2.3;
      return {
        h1: 42 * Math.sin(p), k1: 20 + 70 * Math.max(0, -Math.cos(p)),
        h2: -42 * Math.sin(p), k2: 20 + 70 * Math.max(0, Math.cos(p)),
        s1: -45 * Math.sin(p), e1: 95, s2: 45 * Math.sin(p), e2: 95,
        bob: -12 * Math.abs(Math.sin(p)), lean: 10, sitY: 0, tilt: 4, breath: 0,
      };
    },
    walk: (t, o) => {
      const p = (t + o) * 2 * Math.PI * 1.4;
      return {
        h1: 24 * Math.sin(p), k1: 8 + 28 * Math.max(0, -Math.cos(p)),
        h2: -24 * Math.sin(p), k2: 8 + 28 * Math.max(0, Math.cos(p)),
        s1: -22 * Math.sin(p), e1: 22, s2: 22 * Math.sin(p), e2: 22,
        bob: -5 * Math.abs(Math.sin(p)), lean: 3, sitY: 0, tilt: 1, breath: 0,
      };
    },
    point: (t, o) => {
      const b = Math.sin((t + o) * 2 * Math.PI / 3.2);
      return { h1: 8, k1: 4, h2: -6, k2: 2, s1: 100 + 3 * b, e1: 0, s2: -10, e2: 20, bob: 0, lean: 4, sitY: 0, tilt: -3, breath: b };
    },
    cheer: (t, o) => {
      const w = Math.sin((t + o) * 2 * Math.PI * 2.2);
      return { h1: 6, k1: 4, h2: -6, k2: 4, s1: 165 + 10 * w, e1: 10, s2: -165 - 10 * w, e2: -10, bob: -10 * Math.abs(w), lean: -2, sitY: 0, tilt: 5 * w, breath: 0 };
    },
    sit: (t, o) => {
      const b = Math.sin((t + o) * 2 * Math.PI / 4);
      return { h1: 88, k1: 92, h2: 82, k2: 86, s1: 25, e1: 40, s2: 15, e2: 35, bob: 0, lean: -14, sitY: 86, tilt: 14 + 2 * b, breath: b };
    },
    tired: (t, o) => {
      const b = Math.sin((t + o) * 2 * Math.PI * 1.6);
      return { h1: 30, k1: 50, h2: -10, k2: 40, s1: 30, e1: 10, s2: 20, e2: 10, bob: 30, lean: 38, sitY: 0, tilt: 25 + 4 * b, breath: b * 2 };
    },
  };
  const KEYS = ["h1", "k1", "h2", "k2", "s1", "e1", "s2", "e2", "bob", "lean", "sitY", "tilt", "breath"];

  function poseAt(ch, t) {
    const list = ch.poses;
    let i = 0;
    while (i + 1 < list.length && t >= list[i + 1][0]) i++;
    const cur = POSES[list[i][1]](t, ch.off);
    if (i === 0) return cur;
    const u = clamp((t - list[i][0]) / 0.22, 0, 1);
    if (u >= 1) return cur;
    const prev = POSES[list[i - 1][1]](t, ch.off);
    const e = EASE.inOut(u), out = {};
    for (const k of KEYS) out[k] = lerp(prev[k], cur[k], e);
    return out;
  }

  function track(list, t, dur) {
    let v = list[0][1];
    for (let i = 1; i < list.length; i++) {
      if (t >= list[i][0]) {
        const u = clamp((t - list[i][0]) / dur, 0, 1);
        v = lerp(list[i - 1][1], list[i][1], EASE.inOut(u));
      }
    }
    return v;
  }

  const pt = (x, y, a, L) => [x + Math.sin(a * R) * L, y + Math.cos(a * R) * L];
  function limb(x, y, a1, L1, a2, L2) {
    const [kx, ky] = pt(x, y, a1, L1);
    const [fx, fy] = pt(kx, ky, a2, L2);
    return { d: `M${x} ${y}L${kx.toFixed(1)} ${ky.toFixed(1)}L${fx.toFixed(1)} ${fy.toFixed(1)}`, x: fx, y: fy };
  }

  const els = {};
  const $ = (id) => els[id] || (els[id] = document.getElementById(id));

  function applyChar(ch, t) {
    const p = poseAt(ch, t);
    const id = ch.id;
    $(id + "-rig").setAttribute("transform", `translate(0 ${(p.bob + p.sitY).toFixed(1)}) rotate(${p.lean.toFixed(1)} 0 -170)`);
    const parts = {
      legF: limb(0, -170, p.h1, 90, p.h1 - p.k1, 84),
      legB: limb(0, -170, p.h2, 90, p.h2 - p.k2, 84),
      armF: limb(0, -292, p.s1, 72, p.s1 + p.e1, 62),
      armB: limb(0, -292, p.s2, 72, p.s2 + p.e2, 62),
    };
    for (const k in parts) {
      $(id + "-" + k).setAttribute("d", parts[k].d);
      const end = $(id + "-" + k + "E");
      end.setAttribute("cx", parts[k].x.toFixed(1));
      end.setAttribute("cy", parts[k].y.toFixed(1));
    }
    $(id + "-torso").setAttribute("transform", `scale(1 ${(1 + 0.025 * p.breath).toFixed(3)})`);
    $(id + "-head").setAttribute("transform", `translate(0 ${(-378 - 3 * p.breath).toFixed(1)}) rotate(${p.tilt.toFixed(1)})`);
    // Parpadeo: cada ~3,1 s con desfase propio, 0,16 s de duración
    const ph = ((t + ch.off * 1.7) % 3.1) / 0.16;
    const blink = ph < 1 ? Math.sin(Math.PI * ph) : 0;
    const ry = (11 * (1 - 0.92 * blink)).toFixed(1);
    $(id + "-eyeL").setAttribute("ry", ry);
    $(id + "-eyeR").setAttribute("ry", ry);
    const m = track(ch.mood, t, 0.3);
    $(id + "-mouth").setAttribute("d", `M-14 24Q6 ${(24 + m * 16).toFixed(1)} 26 24`);
  }

  // ---------- Panel split-flap (estilo aeropuerto) ----------
  // DATA.flaps = [{ id, n, steps: [{ t, text, color }] }]: cada casilla avanza por el
  // alfabeto hasta su letra nueva; cada solapa tarda FLIP s y las casillas salen escalonadas.
  const ALPH = " ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÑ0123456789%¿?<";
  const FLIP = 0.045, STAG = 0.025;
  const setTxt = (el, v) => { if (el.textContent !== v) el.textContent = v; };
  function applyFlaps(t) {
    for (const f of DATA.flaps) {
      for (let i = 0; i < f.n; i++) {
        let cur = " ", next = " ", p = 1, color = f.steps[0].color;
        for (const st of f.steps) {
          const target = (st.text.padEnd(f.n, " "))[i];
          const t0 = st.first ? -1 : st.t + i * STAG;
          if (t < t0) break;
          const ib = ALPH.indexOf(target);
          // Como mucho 8 solapas por casilla: arranca unas letras antes de la final
          const k = st.first || cur === target ? 0 : 4 + ((i * 3 + ib) % 3);
          const ia = (ib - k + ALPH.length) % ALPH.length;
          const s = Math.floor((t - t0) / FLIP);
          if (s >= k) { cur = target; next = target; p = 1; color = st.color; continue; }
          const a = ALPH[(ia + s) % ALPH.length];
          next = ALPH[(ia + s + 1) % ALPH.length];
          cur = a; p = (t - t0 - s * FLIP) / FLIP; color = st.color;
        }
        const id = `${f.id}-${i}`;
        setTxt($(id + "-tt"), p < 1 ? next : cur);   // mitad de arriba fija: la letra que viene
        setTxt($(id + "-bt"), cur);                    // mitad de abajo fija: la letra actual
        setTxt($(id + "-ft"), cur);                    // solapa que cae (arriba)
        setTxt($(id + "-gt"), next);                   // solapa que llega (abajo)
        const ft = $(id + "-f"), gb = $(id + "-g");
        if (p >= 1) { ft.style.visibility = "hidden"; gb.style.visibility = "hidden"; }
        else if (p < 0.5) { ft.style.visibility = "visible"; gb.style.visibility = "hidden"; ft.style.transform = `rotateX(${(-180 * p).toFixed(1)}deg)`; }
        else { ft.style.visibility = "hidden"; gb.style.visibility = "visible"; gb.style.transform = `rotateX(${(180 * (1 - p)).toFixed(1)}deg)`; }
        $(id).style.color = color;
      }
    }
  }

  // ---------- Fondo gradient mesh: manchas de color que derivan despacio ----------
  const MESH = document.getElementById("mesh");
  function applyMesh(t, c) {
    if (!MESH) return;
    const px = 80 * Math.sin(c.cx / 1400), py = 80 * Math.sin(c.cy / 1700);
    const v = (a, b, ph) => (a + b * Math.sin(t * 0.35 + ph)).toFixed(1);
    MESH.style.setProperty("--x1", `${v(22, 10, 0)}%`); MESH.style.setProperty("--y1", `${v(30, 8, 1)}%`);
    MESH.style.setProperty("--x2", `${v(78, 9, 2)}%`); MESH.style.setProperty("--y2", `${v(62, 10, 3)}%`);
    MESH.style.setProperty("--x3", `${v(45, 12, 4)}%`); MESH.style.setProperty("--y3", `${v(88, 6, 5)}%`);
    MESH.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
  }

  function render(t) {
    applyCam(t);
    applyMesh(t, camAt(t));
    if (DATA.flaps) applyFlaps(t);
    for (const ch of DATA.chars) applyChar(ch, t);
    for (const f of DATA.float) {
      const el = $(f.id);
      if (el) el.setAttribute("transform", `translate(0 ${(f.a * Math.sin((t + f.o) * 2 * Math.PI / f.p)).toFixed(1)})`);
    }
  }

  window.__mundoRender = render;
})();
