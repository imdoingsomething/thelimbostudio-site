// The Limbo Studio — the abyss.
// Each section of the page is a 3D object adrift around the extruded logo.
// The HTML underneath is the real content; this file only stages it.
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const LOGO_SVG = 'assets/limbo-wordmark.svg'; // or 'assets/limbo-vertical.svg'
const LOGO_WIDTH = 8;                          // world units, landscape
const CAM_Z = 16, CAM_Z_PORTRAIT = 21;
const FOV = 50;

const C = {
  crust: 0x11111b, text: 0xcdd6f4, grey: 0xa6adc8, mauve: 0xcba6f7, blue: 0x89b4fa,
  sky: 0x89dceb, teal: 0x94e2d5, green: 0xa6e3a1, peach: 0xfab387, pink: 0xf5c2e7,
};

const canvas = document.getElementById('abyss');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: innerWidth > 480, powerPreference: 'high-performance' });
} catch (e) {
  renderer = null; // the flat page stays as it is
}

if (renderer) start();

function start() {
  const root = document.documentElement;
  root.classList.add('has-3d');

  renderer.setClearColor(C.crust);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(C.crust, 0.028);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);

  scene.add(new THREE.HemisphereLight(C.blue, C.crust, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(3, 6, 9);
  scene.add(key);
  const glow = new THREE.PointLight(C.mauve, 70, 40, 2);
  glow.position.set(0, 0, 3.5);
  scene.add(glow);

  // ---------- helpers ----------
  const solid = (color, ei = 0.35) => new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: ei, roughness: 0.45, metalness: 0.1, flatShading: true,
  });
  const lines = (geo, color, opacity = 0.9) => new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    return m;
  };

  // ---------- the seven objects ----------
  const builders = {
    // two opposed slabs: a claim and its counter-position
    stance(g) {
      const geo = new THREE.BoxGeometry(0.62, 1.7, 0.14);
      const a = mesh(geo, solid(C.mauve), -0.42, 0, 0); a.rotation.y = 0.5;
      const b = mesh(geo, solid(C.pink, 0.22), 0.42, 0, 0); b.rotation.y = -0.5;
      a.add(lines(geo, C.text, 0.6)); b.add(lines(geo, C.text, 0.4));
      g.add(a, b);
      return (t) => { g.rotation.y = Math.sin(t * 0.3) * 0.5; };
    },
    // a frame only partly filled in
    discipline(g) {
      const frame = lines(new THREE.BoxGeometry(1.4, 1.4, 1.4), C.peach, 0.9);
      const cell = new THREE.BoxGeometry(0.62, 0.62, 0.62);
      const m = solid(C.peach, 0.3);
      [[-1, -1, -1], [1, -1, -1], [-1, -1, 1], [-1, 1, -1]].forEach(([x, y, z]) => {
        frame.add(mesh(cell, m, x * 0.35, y * 0.35, z * 0.35));
      });
      g.add(frame);
      return (t) => { frame.rotation.set(0.45 + Math.sin(t * 0.2) * 0.1, t * 0.25, 0); };
    },
    // a duck kept behind a shell: active, not public
    greyduck(g) {
      const duck = new THREE.Group();
      const m = solid(C.grey, 0.25);
      const body = mesh(new THREE.SphereGeometry(0.42, 10, 8), m); body.scale.set(0.9, 0.75, 1.3);
      const head = mesh(new THREE.SphereGeometry(0.25, 10, 8), m, 0, 0.42, 0.38);
      const beak = mesh(new THREE.ConeGeometry(0.1, 0.26, 6), solid(C.peach, 0.5), 0, 0.4, 0.7); beak.rotation.x = Math.PI / 2;
      const tail = mesh(new THREE.ConeGeometry(0.16, 0.3, 5), m, 0, 0.14, -0.58); tail.rotation.x = -0.9;
      duck.add(body, head, beak, tail);
      const shellGeo = new THREE.IcosahedronGeometry(1.05, 1);
      const shell = lines(shellGeo, C.sky, 0.45);
      shell.add(mesh(shellGeo, new THREE.MeshBasicMaterial({ color: C.sky, transparent: true, opacity: 0.06, depthWrite: false })));
      g.add(duck, shell);
      return (t) => {
        duck.rotation.y = 0.9 + Math.sin(t * 0.4) * 0.5;
        shell.rotation.set(t * 0.1, -t * 0.15, 0);
      };
    },
    // a fanned sheaf of report pages
    formwell(g) {
      const page = new THREE.BoxGeometry(1.05, 1.4, 0.03);
      const ink = new THREE.MeshBasicMaterial({ color: C.crust });
      for (let i = 0; i < 4; i++) {
        const p = mesh(page, solid(i === 3 ? C.text : C.green, i === 3 ? 0.3 : 0.28), (i - 1.5) * 0.12, (i - 1.5) * -0.05, i * 0.1);
        p.rotation.z = (1.5 - i) * 0.11;
        if (i === 3) for (let r = 0; r < 5; r++) {
          p.add(mesh(new THREE.BoxGeometry(r === 4 ? 0.4 : 0.75, 0.05, 0.01), ink, r === 4 ? -0.175 : 0, 0.42 - r * 0.2, 0.02));
        }
        g.add(p);
      }
      return (t) => { g.rotation.y = Math.sin(t * 0.35) * 0.55; g.rotation.x = -0.1; };
    },
    // a core with a few things in orbit
    about(g) {
      const core = mesh(new THREE.IcosahedronGeometry(0.55, 0), solid(C.blue));
      g.add(core);
      const orbits = [0, 1, 2].map((i) => {
        const o = new THREE.Group();
        o.rotation.set(0.5 + i * 1.1, i * 0.9, 0);
        const r = 0.95 + i * 0.16;
        o.add(new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(new THREE.Path().absarc(0, 0, r, 0, Math.PI * 2).getPoints(48)),
          new THREE.LineBasicMaterial({ color: C.blue, transparent: true, opacity: 0.3 }),
        ));
        const moon = mesh(new THREE.SphereGeometry(0.09, 8, 6), solid(C.text, 0.6), r, 0, 0);
        const arm = new THREE.Group(); arm.add(moon); o.add(arm);
        g.add(o);
        return arm;
      });
      return (t) => {
        core.rotation.set(t * 0.2, t * 0.3, 0);
        orbits.forEach((arm, i) => { arm.rotation.z = t * (0.5 + i * 0.22) + i * 2; });
      };
    },
    // a beacon sending rings out into the dark
    contact(g) {
      const core = mesh(new THREE.OctahedronGeometry(0.42, 0), solid(C.pink, 0.5));
      g.add(core);
      const rings = [0, 1, 2].map(() => {
        const r = mesh(new THREE.RingGeometry(0.5, 0.53, 48),
          new THREE.MeshBasicMaterial({ color: C.pink, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
        g.add(r);
        return r;
      });
      return (t) => {
        core.rotation.y = t * 0.6;
        rings.forEach((r, i) => {
          const k = ((t * 0.3 + i / 3) % 1 + 1) % 1;
          r.scale.setScalar(0.8 + k * 2);
          r.material.opacity = (1 - k) * 0.7;
        });
      };
    },
    // a doorway out to another page
    jobscout(g) {
      const outer = mesh(new THREE.TorusGeometry(0.82, 0.07, 8, 40), solid(C.teal, 0.45));
      const inner = mesh(new THREE.TorusGeometry(0.56, 0.025, 6, 32), solid(C.text, 0.4));
      const pane = mesh(new THREE.CircleGeometry(0.78, 40),
        new THREE.MeshBasicMaterial({ color: C.teal, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }));
      g.add(outer, inner, pane);
      return (t) => {
        g.rotation.y = Math.sin(t * 0.3) * 0.6;
        inner.rotation.set(t * 0.5, t * 0.35, 0);
        pane.material.opacity = 0.12 + Math.sin(t * 1.2) * 0.05;
      };
    },
  };

  const hitGeo = new THREE.SphereGeometry(1.15, 8, 6);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const items = [...document.querySelectorAll('#labels a')].map((label, i) => {
    const id = label.hash.slice(1);
    const group = new THREE.Group();
    const inner = new THREE.Group();
    group.add(inner);
    const tick = builders[id](inner);
    const hit = new THREE.Mesh(hitGeo, hitMat);
    group.add(hit);
    scene.add(group);
    const item = { id, label, group, tick, hit, panel: document.getElementById(id), home: new THREE.Vector3(), phase: i * 1.7, s: 1 };
    hit.userData.item = item;
    return item;
  });
  const byId = Object.fromEntries(items.map((it) => [it.id, it]));

  // ---------- the logo ----------
  const logo = new THREE.Group();
  scene.add(logo);
  let logoHit = null;
  new SVGLoader().load(LOGO_SVG, (data) => {
    const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
    const probe = new THREE.ShapeGeometry(shapes);
    probe.computeBoundingBox();
    const w = probe.boundingBox.max.x - probe.boundingBox.min.x;
    probe.dispose();
    const s = LOGO_WIDTH / w;
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: 0.75 / s, curveSegments: 6,
      bevelEnabled: true, bevelThickness: 0.05 / s, bevelSize: 0.03 / s, bevelSegments: 2,
    });
    geo.center();
    const face = new THREE.MeshStandardMaterial({ color: C.text, emissive: C.text, emissiveIntensity: 0.55, roughness: 0.35 });
    const side = new THREE.MeshStandardMaterial({ color: 0x6c5a94, emissive: C.mauve, emissiveIntensity: 0.12, roughness: 0.6 });
    const m = new THREE.Mesh(geo, [face, side]);
    m.scale.set(s, -s, s); // SVG y runs downward
    logo.add(m);
    geo.computeBoundingBox();
    const size = geo.boundingBox.getSize(new THREE.Vector3()).multiplyScalar(s);
    logoHit = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), hitMat);
    logo.add(logoHit);
  });

  // ---------- the pit: rings falling away behind the logo ----------
  const rings = [];
  const ringGeo = new THREE.BufferGeometry().setFromPoints(new THREE.Path().absarc(0, 0, 1, 0, Math.PI * 2).getPoints(96));
  for (let i = 0; i < 9; i++) {
    const r = new THREE.LineLoop(ringGeo, new THREE.LineBasicMaterial({ color: i % 3 ? C.mauve : C.blue, transparent: true, opacity: 0.4 }));
    r.scale.setScalar(10 + i * 0.4);
    r.position.z = -6 - i * 7;
    rings.push(r);
    scene.add(r);
  }

  // ---------- drifting dust ----------
  const DUST = innerWidth < 760 ? 700 : 1600;
  const dustPos = new Float32Array(DUST * 3);
  const dustSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 70;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 44;
    dustPos[i * 3 + 2] = 14 - Math.random() * 70;
    dustSeed[i] = Math.random();
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('seed', new THREE.BufferAttribute(dustSeed, 1));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 } },
    vertexShader: `
      attribute float seed; uniform float uTime; uniform float uScale; varying float vA;
      void main(){
        vec3 p = position;
        p.y = mod(p.y + uTime * (0.12 + seed * 0.25) + 22.0, 44.0) - 22.0; // rising past us: we are sinking
        p.x += sin(uTime * 0.2 + seed * 40.0) * 0.6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float d = -mv.z;
        gl_PointSize = uScale * (1.5 + seed * 3.5) * 18.0 / max(d, 1.0);
        vA = (0.25 + seed * 0.5) * exp(-d * d * 0.0011) * smoothstep(0.5, 3.0, d);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vA;
      void main(){
        float r = length(gl_PointCoord - 0.5);
        gl_FragColor = vec4(0.80, 0.84, 0.96, vA * smoothstep(0.5, 0.05, r));
      }`,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  // ---------- layout ----------
  let portrait = false;
  // every object floats in front of the logo, so flying to one never passes through it
  const LAND_Z = [1, 2.5, 3.5, 1.5, 3, 0.8, 2];
  const LAND_A = [90, 40, 140, -10, 190, -60, 240]; // a 300° arc, open at the bottom for the tagline
  const PORT = [[-0.48, 0.74], [0.48, 0.62], [-0.48, 0.44], [0.48, 0.33], [-0.5, -0.32], [0.5, -0.37], [-0.04, -0.56]];
  let camZ = CAM_Z;
  function layout() {
    const w = innerWidth, h = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, w < 760 ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    dustMat.uniforms.uScale.value = dpr * h / 900;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    portrait = camera.aspect < 1.15;
    camZ = portrait ? CAM_Z_PORTRAIT : CAM_Z;
    const visH = 2 * camZ * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const visW = visH * camera.aspect;
    logo.scale.setScalar(Math.min(1, (visW * (portrait ? 0.8 : 0.42)) / LOGO_WIDTH));
    const rx = Math.min(visW * 0.32, 9), ry = visH * 0.31;
    items.forEach((it, i) => {
      if (portrait) {
        it.home.set(PORT[i][0] * visW / 2, PORT[i][1] * visH / 2, 1);
        it.base = 0.8;
      } else {
        const a = THREE.MathUtils.degToRad(LAND_A[i]);
        it.home.set(Math.cos(a) * rx, Math.sin(a) * ry, LAND_Z[i]);
        it.base = 1;
      }
    });
  }
  addEventListener('resize', layout);
  layout();

  // ---------- selection and routing ----------
  let current = null;
  let lastFocus = null;
  const camPos = new THREE.Vector3(0, 0, CAM_Z), camLook = new THREE.Vector3();
  const goalPos = camPos.clone(), goalLook = camLook.clone();
  let snap = true;

  items.forEach((it) => {
    const x = document.createElement('button');
    x.className = 'x'; x.type = 'button'; x.textContent = '×';
    x.setAttribute('aria-label', 'Close');
    x.addEventListener('click', close);
    it.panel.prepend(x);
  });

  function route() {
    const next = byId[location.hash.slice(1)] || null;
    if (next === current) return;
    if (current) current.panel.classList.remove('open');
    if (next) {
      if (!current) lastFocus = document.activeElement;
      next.panel.classList.add('open');
      next.panel.scrollTop = 0;
      setTimeout(() => { if (current === next) next.panel.focus({ preventScroll: true }); }, 350);
    } else if (lastFocus && lastFocus.focus) {
      lastFocus.focus({ preventScroll: true });
    }
    current = next;
    root.classList.toggle('is-open', !!current);
    if (reduced) snap = true;
    scrollTo(0, 0);
  }
  function open(id) { if (location.hash !== '#' + id) location.hash = id; }
  function close() {
    if (!current) return;
    history.pushState(null, '', location.pathname + location.search);
    route();
  }
  addEventListener('hashchange', route);
  addEventListener('popstate', route);
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    else if (current && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !e.target.closest?.('input,textarea')) {
      const i = items.indexOf(current) + (e.key === 'ArrowRight' ? 1 : -1);
      open(items[(i + items.length) % items.length].id);
    }
  });

  // ---------- pointer ----------
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2(0, 0), ndc = new THREE.Vector2(9, 9);
  let hovered = null, down = null;
  function pick() {
    ray.setFromCamera(ndc, camera);
    const targets = items.map((it) => it.hit);
    if (logoHit) targets.push(logoHit);
    const hit = ray.intersectObjects(targets, false)[0];
    if (!hit) return null;
    return hit.object === logoHit ? 'logo' : hit.object.userData.item;
  }
  function setNdc(e) {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  }
  canvas.addEventListener('pointermove', (e) => {
    setNdc(e);
    if (e.pointerType === 'mouse') ptr.copy(ndc);
    const p = pick();
    hovered = p && p !== 'logo' ? p : null;
    canvas.style.cursor = hovered || (p === 'logo' && current) ? 'pointer' : '';
  });
  canvas.addEventListener('pointerleave', () => { hovered = null; ndc.set(9, 9); });
  canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) return;
    setNdc(e);
    const p = pick();
    if (p && p !== 'logo') open(p.id);
    else close();
    if (e.pointerType !== 'mouse') { hovered = null; ndc.set(9, 9); }
  });
  items.forEach((it) => {
    it.label.addEventListener('pointerenter', () => { hovered = it; });
    it.label.addEventListener('pointerleave', () => { if (hovered === it) hovered = null; });
    it.label.addEventListener('focus', () => { hovered = it; });
    it.label.addEventListener('blur', () => { if (hovered === it) hovered = null; });
  });

  // ---------- frame ----------
  const clock = new THREE.Clock();
  const v = new THREE.Vector3();
  let t = 0, running = true;
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.1);
    if (!reduced) t += dt;
    const k = snap ? 1 : 1 - Math.exp(-dt * 2.6);

    // camera
    if (current) {
      const wide = innerWidth > 760;
      const ox = wide ? 1.7 : 0, oy = wide ? 0 : -1.3;
      const p = current.group.position;
      goalPos.set(p.x + ox + ptr.x * 0.25, p.y + oy + ptr.y * 0.2, p.z + 5.6);
      goalLook.set(p.x + ox, p.y + oy, p.z);
    } else {
      goalPos.set(ptr.x * 1.4 + Math.sin(t * 0.13) * 0.35, ptr.y * 0.9 + Math.cos(t * 0.17) * 0.25, camZ);
      goalLook.set(0, 0, 0);
    }
    camPos.lerp(goalPos, k); camLook.lerp(goalLook, k);
    camera.position.copy(camPos); camera.lookAt(camLook);
    snap = false;

    // logo and pit
    logo.rotation.y = Math.sin(t * 0.25) * 0.22 + ptr.x * 0.18;
    logo.rotation.x = Math.sin(t * 0.19) * 0.06 - ptr.y * 0.1;
    logo.position.y = Math.sin(t * 0.4) * 0.12;
    rings.forEach((r, i) => {
      r.rotation.z = t * 0.02 * (i % 2 ? 1 : -1);
      r.position.x = Math.sin(t * 0.1 + i * 0.7) * 0.6;
      r.position.y = Math.cos(t * 0.08 + i * 0.9) * 0.6;
    });
    dustMat.uniforms.uTime.value = t;

    // objects and their labels
    for (const it of items) {
      it.group.position.set(
        it.home.x + Math.sin(t * 0.23 + it.phase) * 0.18,
        it.home.y + Math.sin(t * 0.5 + it.phase) * 0.2,
        it.home.z,
      );
      it.tick(t + it.phase);
      const want = it.base * (it === hovered || it === current ? 1.14 : 1);
      it.s += (want - it.s) * Math.min(1, dt * 8);
      it.group.scale.setScalar(it.s);

      v.copy(it.group.position); v.y -= 1.25 * it.s;
      v.project(camera);
      const show = v.z < 1 && !current;
      const x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
      it.label.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,0)`;
      it.label.style.opacity = show ? 1 : 0;
      it.label.style.pointerEvents = show ? '' : 'none';
      it.label.classList.toggle('hot', it === hovered || it === current);
    }

    renderer.render(scene, camera);
  }
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { clock.getDelta(); frame(); }
  });

  route();
  snap = true;
  frame();
}
