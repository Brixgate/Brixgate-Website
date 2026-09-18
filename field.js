/* ============================================================
   PARTICLE FIELD  ·  window.BXField

   The WebGL point-and-line network from the landing page hero,
   lifted out so other pages can use the same system instead of a
   copy that drifts. index.html still owns where its own canvases
   go; this file owns how one is built.

     var f = BXField.create(canvas, opts);   // null if unsupported
     BXField.watch(section, f);              // run only while on screen
     f.setMouse(nx, ny);                     // -1..1

   Returns null rather than throwing when WebGL or THREE is missing,
   so every caller can treat the field as optional decoration.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGL = (function () {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); }
    catch (e) { return false; }
  })();

  /* ---- shared shaders ---- */
  var POINT_VS = [
    'attribute float aSize; attribute vec3 aColor; attribute float aPhase;',
    'uniform float uTime; uniform float uPixelRatio;',
    'varying vec3 vColor; varying float vAlpha;',
    'void main(){',
    '  vColor = aColor;',
    '  vAlpha = 0.72 + 0.28 * sin(uTime * 1.3 + aPhase);',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  gl_PointSize = aSize * uPixelRatio * (150.0 / -mv.z);',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');
  var POINT_FS = [
    'precision mediump float;',
    'varying vec3 vColor; varying float vAlpha; uniform float uOpacity;',
    'void main(){',
    '  float d = length(gl_PointCoord - 0.5);',
    '  float a = 1.0 - smoothstep(0.32, 0.5, d);',
    '  if (a < 0.01) discard;',
    '  gl_FragColor = vec4(vColor, a * vAlpha * uOpacity);',
    '}'
  ].join('\n');
  var LINE_VS = [
    'attribute float aAlpha; varying float vA;',
    'void main(){ vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
  ].join('\n');
  var LINE_FS = [
    'precision mediump float;',
    'uniform vec3 uColor; uniform float uOpacity; varying float vA;',
    'void main(){ gl_FragColor = vec4(uColor, vA * uOpacity); }'
  ].join('\n');

  /* ---- particle network factory ---- */
  function createField(canvas, o) {
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(50, 1, 1, 400);
    camera.position.z = 90;

    var group = new THREE.Group();
    scene.add(group);

    var N = o.count;
    var HX = 60, HY = 36, HZ = o.depth || 22;
    var pos = new Float32Array(N * 3);
    var vel = new Float32Array(N * 3);
    var col = new Float32Array(N * 3);
    var siz = new Float32Array(N);
    var pha = new Float32Array(N);

    var cInk = new THREE.Color(o.inkColor), cRed = new THREE.Color(o.accentColor || 0xFF294E);
    for (var i = 0; i < N; i++) {
      pos[i*3]   = (Math.random() * 2 - 1) * HX;
      pos[i*3+1] = (Math.random() * 2 - 1) * HY;
      pos[i*3+2] = (Math.random() * 2 - 1) * HZ;
      var s = o.speed;
      vel[i*3]   = (Math.random() * 2 - 1) * s;
      vel[i*3+1] = (Math.random() * 2 - 1) * s;
      vel[i*3+2] = (Math.random() * 2 - 1) * s * 0.5;
      var red = Math.random() < o.redRatio;
      var c = red ? cRed : cInk;
      col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
      siz[i] = red ? o.sizeRed : (o.sizeMin + Math.random() * (o.sizeMax - o.sizeMin));
      pha[i] = Math.random() * Math.PI * 2;
    }

    var pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    pGeo.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
    pGeo.setAttribute('aPhase', new THREE.BufferAttribute(pha, 1));
    var pMat = new THREE.ShaderMaterial({
      vertexShader: POINT_VS, fragmentShader: POINT_FS,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: dpr }, uOpacity: { value: o.pointOpacity } },
      transparent: true, depthWrite: false, blending: THREE.NormalBlending
    });
    group.add(new THREE.Points(pGeo, pMat));

    var lines = null, lPos, lAlp, lGeo;
    if (o.lines) {
      var MAXSEG = N * 8;
      lPos = new Float32Array(MAXSEG * 2 * 3);
      lAlp = new Float32Array(MAXSEG * 2);
      lGeo = new THREE.BufferGeometry();
      lGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3).setUsage(THREE.DynamicDrawUsage));
      lGeo.setAttribute('aAlpha', new THREE.BufferAttribute(lAlp, 1).setUsage(THREE.DynamicDrawUsage));
      var lMat = new THREE.ShaderMaterial({
        vertexShader: LINE_VS, fragmentShader: LINE_FS,
        uniforms: { uColor: { value: cInk }, uOpacity: { value: o.lineOpacity } },
        transparent: true, depthWrite: false
      });
      lines = new THREE.LineSegments(lGeo, lMat);
      group.add(lines);
    }

    var R = o.linkRadius || 16, R2 = R * R;
    var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    var running = false, raf = 0, t0 = performance.now();
    var W = 1, H = 1;

    function resize() {
      var r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      // Fit the field to the viewport at z=0
      var vFov = camera.fov * Math.PI / 180;
      var visH = 2 * Math.tan(vFov / 2) * camera.position.z;
      var visW = visH * camera.aspect;
      HX = visW / 2 + 6; HY = visH / 2 + 6;
    }

    function step() {
      var t = (performance.now() - t0) / 1000;
      pMat.uniforms.uTime.value = t;

      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      group.rotation.y = mouse.x * 0.22 + Math.sin(t * 0.08) * 0.04;
      group.rotation.x = -mouse.y * 0.14 + Math.cos(t * 0.07) * 0.03;

      var mx = mouse.x * HX, my = mouse.y * HY;
      var P = pGeo.attributes.position.array;
      for (var i = 0; i < N; i++) {
        var ix = i*3, iy = ix+1, iz = ix+2;
        P[ix] += vel[ix]; P[iy] += vel[iy]; P[iz] += vel[iz];
        if (P[ix] >  HX) { P[ix] =  HX; vel[ix] *= -1; } else if (P[ix] < -HX) { P[ix] = -HX; vel[ix] *= -1; }
        if (P[iy] >  HY) { P[iy] =  HY; vel[iy] *= -1; } else if (P[iy] < -HY) { P[iy] = -HY; vel[iy] *= -1; }
        if (P[iz] >  HZ) { P[iz] =  HZ; vel[iz] *= -1; } else if (P[iz] < -HZ) { P[iz] = -HZ; vel[iz] *= -1; }
        if (o.repel) {
          var dx = P[ix] - mx, dy = P[iy] - my, d2 = dx*dx + dy*dy;
          if (d2 < 220 && d2 > 0.01) { var f = (1 - d2 / 220) * 0.08; P[ix] += dx * f; P[iy] += dy * f; }
        }
      }
      pGeo.attributes.position.needsUpdate = true;

      if (lines) {
        var seg = 0, MAX = lPos.length / 6;
        for (var a = 0; a < N && seg < MAX; a++) {
          var ax = P[a*3], ay = P[a*3+1], az = P[a*3+2];
          for (var b = a + 1; b < N && seg < MAX; b++) {
            var ddx = ax - P[b*3], ddy = ay - P[b*3+1], ddz = az - P[b*3+2];
            var dd = ddx*ddx + ddy*ddy + ddz*ddz;
            if (dd < R2) {
              var al = 1 - dd / R2;
              var k = seg * 6;
              lPos[k] = ax; lPos[k+1] = ay; lPos[k+2] = az;
              lPos[k+3] = P[b*3]; lPos[k+4] = P[b*3+1]; lPos[k+5] = P[b*3+2];
              lAlp[seg*2] = al; lAlp[seg*2+1] = al;
              seg++;
            }
          }
        }
        lGeo.setDrawRange(0, seg * 2);
        lGeo.attributes.position.needsUpdate = true;
        lGeo.attributes.aAlpha.needsUpdate = true;
      }

      renderer.render(scene, camera);
      if (running && !reduced) raf = requestAnimationFrame(step);
    }

    function start() { if (running) return; running = true; if (reduced) { step(); return; } raf = requestAnimationFrame(step); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    resize();
    window.addEventListener('resize', function () { resize(); if (reduced) step(); }, { passive: true });

    return {
      start: start, stop: stop,
      setMouse: function (nx, ny) { mouse.tx = nx; mouse.ty = ny; }
    };
  }


  function watch(el, field) {
    if (!el || !field) return;
    if (!('IntersectionObserver' in window)) { field.start(); return; }
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.isIntersecting ? field.start() : field.stop(); });
    }, { threshold: 0.02 }).observe(el);
  }

  window.BXField = {
    supported: !!(hasGL),
    reduced: reduced,
    create: function (canvas, opts) {
      if (!canvas || !window.THREE || !hasGL) return null;
      return createField(canvas, opts);
    },
    watch: watch
  };
})();
