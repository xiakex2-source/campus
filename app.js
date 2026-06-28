const glow = document.querySelector(".cursor-glow");
const silkBackground = document.querySelector("#silkBackground");
const introSplash = document.querySelector("#introSplash");
const introSkip = document.querySelector("#introSkip");
const introNumber = document.querySelector("#introNumber");
const introFrames = [...document.querySelectorAll(".intro-frames img")];
const INTRO_FULL_DURATION = 9200;
const INTRO_EXIT_DURATION = 1200;
const parallaxItems = [...document.querySelectorAll("[data-speed]")];
const albumCards = [...document.querySelectorAll("[data-album-card]")];
const routeAlbum = document.querySelector(".route-album");
const routeFlow = document.querySelector("[data-route-flow]");
const routePoints = [...document.querySelectorAll("[data-route-point]")];
const atlasSection = document.querySelector("#atlas");
const atlasStage = document.querySelector("[data-atlas-stage]");
const atlasMapPanel = document.querySelector("[data-atlas-map-panel]");
const atlasPoints = [...document.querySelectorAll("[data-atlas-point]")];
const atlasPointChips = [...document.querySelectorAll("[data-atlas-target]")];
const atlasRoutes = [...document.querySelectorAll("[data-atlas-route]")];
const atlasDepthItems = [...document.querySelectorAll(".atlas-bg-word")];
const atlasDetailIndex = document.querySelector("[data-atlas-detail-index]");
const atlasDetailTitle = document.querySelector("[data-atlas-detail-title]");
const atlasDetailEn = document.querySelector("[data-atlas-detail-en]");
const atlasDetailDesc = document.querySelector("[data-atlas-detail-desc]");
const atlasDetailTime = document.querySelector("[data-atlas-detail-time]");
const atlasDetailImage = document.querySelector("[data-atlas-detail-image]");
const momentsScene = document.querySelector("[data-moments-scene]");
const momentsDepthItems = [...document.querySelectorAll("[data-moments-depth], .moments-bg-word")];
const revealItems = [...document.querySelectorAll(".hero-copy, .hero-card, .route-album, .route-title, .route-board, .atlas-copy, .atlas-detail-card, .atlas-point-list, .atlas-map-stage, .moments-head, .moments-gallery")];
const transitionSections = [...document.querySelectorAll(".section-panel")];
const sectionBlend = document.querySelector("[data-section-blend]");
const widePointerQuery = window.matchMedia("(min-width: 901px)");
let introDone = false;
let introFrameTimer;
let introProgressTimer;
let parallaxTicking = false;
let sectionBlendTicking = false;
let pointerTicking = false;
let latestPointerEvent = null;
let heroOpeningPlayed = false;
let heroOpeningTl = null;
let heroReplayReady = false;

function setupSilkBackground() {
  if (!silkBackground) return;
  const gl = silkBackground.getContext("webgl2", { antialias: false, alpha: true, powerPreference: "high-performance" });
  if (!gl) return;

  const vertexShaderSource = `
    #version 300 es
    precision highp float;
    in vec2 aPosition;

    void main() {
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const fragmentShaderSource = `
    #version 300 es
    precision highp float;

    uniform vec2 iResolution;
    uniform float iTime;
    uniform vec3 uCustomColor;
    uniform float uUseCustomColor;
    uniform float uSpeed;
    uniform float uDirection;
    uniform float uScale;
    uniform float uOpacity;
    uniform vec2 uMouse;
    uniform float uMouseInteractive;
    out vec4 fragColor;

    void mainImage(out vec4 o, vec2 C) {
      vec2 center = iResolution.xy * 0.5;
      C = (C - center) / uScale + center;

      vec2 mouseOffset = (uMouse - center) * 0.0002;
      C += mouseOffset * length(C - center) * step(0.5, uMouseInteractive);

      float i = 0.0;
      float d = 0.0;
      float z = 0.0;
      float T = iTime * uSpeed * uDirection;
      vec3 O = vec3(0.0);
      vec3 p = vec3(0.0);
      vec3 S = vec3(0.0);

      for (vec2 r = iResolution.xy, Q; ++i < 48.0; O += o.w / d * o.xyz) {
        p = z * normalize(vec3(C - 0.5 * r, r.y));
        p.z -= 4.0;
        S = p;
        d = p.y - T;

        p.x += 0.4 * (1.0 + p.y) * sin(d + p.x * 0.1) * cos(0.34 * d + p.x * 0.05);
        mat2 plasmaRotation = mat2(cos(p.y + vec4(0.0, 11.0, 33.0, 0.0) - T));
        p.xz = p.xz * plasmaRotation;
        Q = p.xz;
        z += d = abs(sqrt(length(Q * Q)) - 0.25 * (5.0 + S.y)) / 3.0 + 8e-4;
        o = 1.0 + sin(S.y + p.z * 0.5 + S.z - length(S - p) + vec4(2.0, 1.0, 0.0, 8.0));
      }

      o.xyz = tanh(O / 1e4);
    }

    bool finite1(float x) {
      return !(isnan(x) || isinf(x));
    }

    vec3 sanitize(vec3 c) {
      return vec3(
        finite1(c.r) ? c.r : 0.0,
        finite1(c.g) ? c.g : 0.0,
        finite1(c.b) ? c.b : 0.0
      );
    }

    void main() {
      vec4 o = vec4(0.0);
      mainImage(o, gl_FragCoord.xy);
      vec3 rgb = sanitize(o.rgb);

      float intensity = (rgb.r + rgb.g + rgb.b) / 3.0;
      vec3 customColor = intensity * uCustomColor;
      vec3 finalColor = mix(rgb, customColor, step(0.5, uUseCustomColor));

      float alpha = length(rgb) * uOpacity;
      fragColor = vec4(finalColor, alpha);
    }
  `;

  const compileShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vertexShader || !fragmentShader) return;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn(gl.getProgramInfoLog(program));
    return;
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

  const position = gl.getAttribLocation(program, "aPosition");
  const uniforms = {
    resolution: gl.getUniformLocation(program, "iResolution"),
    time: gl.getUniformLocation(program, "iTime"),
    customColor: gl.getUniformLocation(program, "uCustomColor"),
    useCustomColor: gl.getUniformLocation(program, "uUseCustomColor"),
    speed: gl.getUniformLocation(program, "uSpeed"),
    direction: gl.getUniformLocation(program, "uDirection"),
    scale: gl.getUniformLocation(program, "uScale"),
    opacity: gl.getUniformLocation(program, "uOpacity"),
    mouse: gl.getUniformLocation(program, "uMouse"),
    mouseInteractive: gl.getUniformLocation(program, "uMouseInteractive"),
  };

  const hexToRgb = (hex) => {
    const clean = hex.replace("#", "");
    return [
      parseInt(clean.slice(0, 2), 16) / 255,
      parseInt(clean.slice(2, 4), 16) / 255,
      parseInt(clean.slice(4, 6), 16) / 255,
    ];
  };

  const plasmaColor = hexToRgb("#97becf");
  const mouse = { x: 0, y: 0 };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let frameId = 0;
  let pageVisible = !document.hidden;
  const start = performance.now();
  const plasmaSections = new Set(["route", "atlas", "moments"]);

  const isPlasmaActive = () => (
    pageVisible
    && !document.body.classList.contains("intro-active")
    && plasmaSections.has(document.body.dataset.sectionTheme)
  );

  const stopRender = () => {
    if (!frameId) return;
    window.cancelAnimationFrame(frameId);
    frameId = 0;
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    silkBackground.width = Math.round(window.innerWidth * dpr);
    silkBackground.height = Math.round(window.innerHeight * dpr);
    silkBackground.style.width = `${window.innerWidth}px`;
    silkBackground.style.height = `${window.innerHeight}px`;
    gl.viewport(0, 0, silkBackground.width, silkBackground.height);
  };

  const render = (time = 0) => {
    frameId = 0;
    if (!isPlasmaActive()) return;
    const elapsed = Math.max(0, ((time || performance.now()) - start) * 0.001);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(uniforms.resolution, silkBackground.width, silkBackground.height);
    gl.uniform1f(uniforms.time, elapsed);
    gl.uniform3f(uniforms.customColor, plasmaColor[0], plasmaColor[1], plasmaColor[2]);
    gl.uniform1f(uniforms.useCustomColor, 1.0);
    gl.uniform1f(uniforms.speed, 0.6 * 0.4);
    gl.uniform1f(uniforms.direction, 1.0);
    gl.uniform1f(uniforms.scale, 1.1);
    gl.uniform1f(uniforms.opacity, 0.8);
    gl.uniform2f(uniforms.mouse, mouse.x, mouse.y);
    gl.uniform1f(uniforms.mouseInteractive, 1.0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (!reducedMotion && isPlasmaActive()) frameId = window.requestAnimationFrame(render);
  };

  const requestRender = () => {
    if (!isPlasmaActive()) {
      stopRender();
      return;
    }
    if (reducedMotion) {
      render(performance.now());
      return;
    }
    if (!frameId) frameId = window.requestAnimationFrame(render);
  };

  const handlePointerMove = (event) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    mouse.x = event.clientX * dpr;
    mouse.y = (window.innerHeight - event.clientY) * dpr;
    if (reducedMotion) requestRender();
  };

  resize();
  handlePointerMove({ clientX: window.innerWidth * 0.5, clientY: window.innerHeight * 0.5 });
  requestRender();
  const plasmaObserver = new MutationObserver(requestRender);
  plasmaObserver.observe(document.body, { attributes: true, attributeFilter: ["class", "data-section-theme"] });
  window.addEventListener("resize", () => {
    resize();
    requestRender();
  });
  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  document.addEventListener("visibilitychange", () => {
    pageVisible = !document.hidden;
    requestRender();
  });
  window.addEventListener("beforeunload", () => {
    stopRender();
    plasmaObserver.disconnect();
  });
}

async function setupGrainientBackground() {
  if (!silkBackground) return;

  let ogl;
  try {
    ogl = await import("https://cdn.jsdelivr.net/npm/ogl@1.0.11/src/index.js");
  } catch (error) {
    console.warn("Grainient background failed to load ogl.", error);
    return;
  }

  const { Renderer, Program, Mesh, Triangle } = ogl;
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [1, 1, 1];
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ];
  };

  const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

  const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;
#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}
void mainImage(out vec4 o, vec2 C){
  float t=iTime*uTimeSpeed;
  vec2 uv=C/iResolution.xy;
  float ratio=iResolution.x/iResolution.y;
  vec2 tuv=uv-0.5+uCenterOffset;
  tuv/=max(uZoom,0.001);

  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);
  tuv.y*=1.0/ratio;
  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));
  tuv.y*=ratio;

  float frequency=uWarpFrequency;
  float ws=max(uWarpStrength,0.001);
  float amplitude=uWarpAmplitude/ws;
  float warpTime=t*uWarpSpeed;
  tuv.x+=sin(tuv.y*frequency+warpTime)/amplitude;
  tuv.y+=sin(tuv.x*(frequency*1.5)+warpTime)/(amplitude*0.5);

  vec3 colLav=uColor1;
  vec3 colOrg=uColor2;
  vec3 colDark=uColor3;
  float b=uColorBalance;
  float s=max(uBlendSoftness,0.0);
  mat2 blendRot=Rot(radians(uBlendAngle));
  float blendX=(tuv*blendRot).x;
  float edge0=-0.3-b-s;
  float edge1=0.2-b+s;
  float v0=0.5-b+s;
  float v1=-0.3-b-s;
  vec3 layer1=mix(colDark,colOrg,S(edge0,edge1,blendX));
  vec3 layer2=mix(colOrg,colLav,S(edge0,edge1,blendX));
  vec3 col=mix(layer1,layer2,S(v0,v1,tuv.y));

  vec2 grainUv=uv*max(uGrainScale,0.001);
  if(uGrainAnimated>0.5){grainUv+=vec2(iTime*0.05);}
  float grain=fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);
  col+=(grain-0.5)*uGrainAmount;

  col=(col-0.5)*uContrast+0.5;
  float luma=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(luma),col,uSaturation);
  col=pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));
  col=clamp(col,0.0,1.0);

  o=vec4(col,1.0);
}
void main(){
  vec4 o=vec4(0.0);
  mainImage(o,gl_FragCoord.xy);
  fragColor=o;
}
`;

  const options = {
    color1: "#0b70b6",
    color2: "#53809e",
    color3: "#afc0cd",
    timeSpeed: 2.05,
    colorBalance: 0.03,
    warpStrength: 1,
    warpFrequency: 5,
    warpSpeed: 0.6,
    warpAmplitude: 50,
    blendAngle: 0,
    blendSoftness: 0.05,
    rotationAmount: 640,
    noiseScale: 2,
    grainAmount: 0.1,
    grainScale: 4,
    grainAnimated: false,
    contrast: 1.5,
    gamma: 1,
    saturation: 1,
    centerX: 0,
    centerY: 0,
    zoom: 0.9,
  };

  let renderer;
  try {
    renderer = new Renderer({
      canvas: silkBackground,
      webgl: 2,
      alpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });
  } catch (error) {
    console.warn("Grainient background failed to create renderer.", error);
    return;
  }

  const gl = renderer.gl;
  const geometry = new Triangle(gl);
  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new Float32Array([1, 1]) },
      uTimeSpeed: { value: options.timeSpeed },
      uColorBalance: { value: options.colorBalance },
      uWarpStrength: { value: options.warpStrength },
      uWarpFrequency: { value: options.warpFrequency },
      uWarpSpeed: { value: options.warpSpeed },
      uWarpAmplitude: { value: options.warpAmplitude },
      uBlendAngle: { value: options.blendAngle },
      uBlendSoftness: { value: options.blendSoftness },
      uRotationAmount: { value: options.rotationAmount },
      uNoiseScale: { value: options.noiseScale },
      uGrainAmount: { value: options.grainAmount },
      uGrainScale: { value: options.grainScale },
      uGrainAnimated: { value: options.grainAnimated ? 1 : 0 },
      uContrast: { value: options.contrast },
      uGamma: { value: options.gamma },
      uSaturation: { value: options.saturation },
      uCenterOffset: { value: new Float32Array([options.centerX, options.centerY]) },
      uZoom: { value: options.zoom },
      uColor1: { value: new Float32Array(hexToRgb(options.color1)) },
      uColor2: { value: new Float32Array(hexToRgb(options.color2)) },
      uColor3: { value: new Float32Array(hexToRgb(options.color3)) },
    },
  });
  const mesh = new Mesh(gl, { geometry, program });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const grainientSections = new Set(["route", "atlas", "moments"]);
  const start = performance.now();
  const targetCenter = { x: options.centerX, y: options.centerY };
  const smoothCenter = { x: options.centerX, y: options.centerY };
  let frameId = 0;
  let pageVisible = !document.hidden;

  const isGrainientActive = () => (
    pageVisible
    && !document.body.classList.contains("intro-active")
    && grainientSections.has(document.body.dataset.sectionTheme)
  );

  const stopRender = () => {
    if (!frameId) return;
    window.cancelAnimationFrame(frameId);
    frameId = 0;
  };

  const resize = () => {
    const width = Math.max(1, Math.floor(window.innerWidth));
    const height = Math.max(1, Math.floor(window.innerHeight));
    renderer.setSize(width, height);
    const resolution = program.uniforms.iResolution.value;
    resolution[0] = gl.drawingBufferWidth;
    resolution[1] = gl.drawingBufferHeight;
    renderer.render({ scene: mesh });
  };

  const render = (time = performance.now()) => {
    frameId = 0;
    if (!isGrainientActive()) return;

    smoothCenter.x += (targetCenter.x - smoothCenter.x) * 0.045;
    smoothCenter.y += (targetCenter.y - smoothCenter.y) * 0.045;
    program.uniforms.uCenterOffset.value[0] = smoothCenter.x;
    program.uniforms.uCenterOffset.value[1] = smoothCenter.y;
    program.uniforms.iTime.value = Math.max(0, (time - start) * 0.001);
    renderer.render({ scene: mesh });

    if (!reducedMotion && isGrainientActive()) frameId = window.requestAnimationFrame(render);
  };

  const requestRender = () => {
    if (!isGrainientActive()) {
      stopRender();
      return;
    }
    if (reducedMotion) {
      render(performance.now());
      return;
    }
    if (!frameId) frameId = window.requestAnimationFrame(render);
  };

  const handlePointerMove = (event) => {
    targetCenter.x = options.centerX + ((event.clientX / window.innerWidth) - 0.5) * 0.06;
    targetCenter.y = options.centerY + ((event.clientY / window.innerHeight) - 0.5) * -0.06;
    if (reducedMotion) requestRender();
  };

  resize();
  handlePointerMove({ clientX: window.innerWidth * 0.5, clientY: window.innerHeight * 0.5 });
  requestRender();

  const grainientObserver = new MutationObserver(requestRender);
  grainientObserver.observe(document.body, { attributes: true, attributeFilter: ["class", "data-section-theme"] });
  window.addEventListener("resize", () => {
    resize();
    requestRender();
  });
  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  document.addEventListener("visibilitychange", () => {
    pageVisible = !document.hidden;
    requestRender();
  });
  window.addEventListener("beforeunload", () => {
    stopRender();
    grainientObserver.disconnect();
  });
}

function playHeroOpening() {
  if (heroOpeningPlayed || !heroOpeningTl) return;
  heroOpeningPlayed = true;
  heroOpeningTl.play(0);
}

function armHeroReplayAfterOpening() {
  window.setTimeout(() => {
    heroReplayReady = true;
  }, heroOpeningTl ? heroOpeningTl.duration() * 1000 : 0);
}

function setupHeroReplayTrigger() {
  const ScrollTrigger = window.ScrollTrigger;
  const hero = document.querySelector(".parallax-landing");
  if (!ScrollTrigger || !hero || !heroOpeningTl) return;

  const restartHeroOpening = () => {
    if (!introDone || !heroReplayReady || !heroOpeningTl) return;
    heroOpeningTl.restart();
  };

  const reverseHeroOpening = () => {
    if (!introDone || !heroReplayReady || !heroOpeningTl) return;
    heroOpeningTl.reverse();
  };

  ScrollTrigger.create({
    trigger: ".parallax-landing",
    start: "top bottom",
    end: "bottom top",
    onEnter: restartHeroOpening,
    onEnterBack: restartHeroOpening,
    onLeave: reverseHeroOpening,
    onLeaveBack: reverseHeroOpening,
  });
}

function initPillNav() {
  const root = document.querySelector(".pill-nav-container");
  const gsap = window.gsap;
  if (!root || !gsap) return;

  const ease = "power3.easeOut";
  const state = {
    pills: [...root.querySelectorAll("[data-pill-link]")],
    mobileLinks: [...root.querySelectorAll("[data-pill-mobile-link]")],
    timelines: [],
    activeTweens: [],
    metrics: [],
    logoTween: null,
    mobileMenuOpen: false,
    rebuildPillTimelines: null,
  };

  function layoutPillHoverCircles() {
    state.pills.forEach((pill, index) => {
      const circle = pill.querySelector(".hover-circle");
      if (!circle) return;

      const { width: w, height: h } = pill.getBoundingClientRect();
      if (!w || !h) return;

      const R = ((w * w) / 4 + h * h) / (2 * h);
      const D = Math.ceil(2 * R) + 2;
      const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
      const originY = D - delta;
      const label = pill.querySelector(".pill-label");
      const hoverLabel = pill.querySelector(".pill-label-hover");

      circle.style.width = `${D}px`;
      circle.style.height = `${D}px`;
      circle.style.bottom = `-${delta}px`;

      gsap.set(circle, {
        xPercent: -50,
        scale: 0,
        transformOrigin: `50% ${originY}px`,
      });

      if (label) gsap.set(label, { y: 0 });
      if (hoverLabel) gsap.set(hoverLabel, { y: Math.ceil(h + 100), opacity: 0 });

      state.metrics[index] = { height: h };
    });

    state.rebuildPillTimelines?.();
  }

  function bindPillHover() {
    const rebuildPillTimelines = () => {
      state.timelines.forEach((tl) => tl?.kill());
      state.timelines = [];

      state.pills.forEach((pill, index) => {
        const circle = pill.querySelector(".hover-circle");
        const label = pill.querySelector(".pill-label");
        const hoverLabel = pill.querySelector(".pill-label-hover");
        const height = state.metrics[index]?.height || pill.getBoundingClientRect().height || 42;
        const tl = gsap.timeline({ paused: true });

        if (circle) {
          tl.to(circle, {
            scale: 1.2,
            xPercent: -50,
            duration: 2,
            ease,
            overwrite: "auto",
          }, 0);
        }

        if (label) {
          tl.to(label, {
            y: -(height + 8),
            duration: 2,
            ease,
            overwrite: "auto",
          }, 0);
        }

        if (hoverLabel) {
          tl.to(hoverLabel, {
            y: 0,
            opacity: 1,
            duration: 2,
            ease,
            overwrite: "auto",
          }, 0);
        }

        state.timelines[index] = tl;
      });
    };

    state.rebuildPillTimelines = rebuildPillTimelines;

    state.pills.forEach((pill, index) => {
      pill.addEventListener("mouseenter", () => {
        const tl = state.timelines[index];
        if (!tl) return;
        state.activeTweens[index]?.kill();
        state.activeTweens[index] = tl.tweenTo(tl.duration(), {
          duration: 0.3,
          ease,
          overwrite: "auto",
        });
      });

      pill.addEventListener("mouseleave", () => {
        const tl = state.timelines[index];
        if (!tl) return;
        state.activeTweens[index]?.kill();
        state.activeTweens[index] = tl.tweenTo(0, {
          duration: 0.2,
          ease,
          overwrite: "auto",
        });
      });
    });

    rebuildPillTimelines();
  }

  function bindLogoHover() {
    const logo = root.querySelector(".pill-logo");
    const logoText = root.querySelector(".pill-logo-text") || logo;
    if (!logo || !logoText) return;

    logo.addEventListener("mouseenter", () => {
      state.logoTween?.kill();
      gsap.set(logoText, { rotate: 0, transformOrigin: "50% 50%" });
      state.logoTween = gsap.to(logoText, {
        rotate: 360,
        duration: 0.28,
        ease,
        overwrite: "auto",
      });
    });
  }

  function setupMobilePillMenu() {
    const button = root.querySelector(".mobile-menu-button");
    const menu = root.querySelector(".mobile-menu-popover");
    if (!button || !menu) return;

    const lines = [...button.querySelectorAll(".hamburger-line")];
    gsap.set(menu, { visibility: "hidden", opacity: 0, y: 10, scaleY: 1 });

    const setMenuOpen = (nextState) => {
      state.mobileMenuOpen = nextState;
      button.setAttribute("aria-expanded", String(nextState));

      if (lines.length >= 2) {
        gsap.to(lines[0], {
          rotation: nextState ? 45 : 0,
          y: nextState ? 3 : 0,
          duration: 0.3,
          ease,
          overwrite: "auto",
        });
        gsap.to(lines[1], {
          rotation: nextState ? -45 : 0,
          y: nextState ? -3 : 0,
          duration: 0.3,
          ease,
          overwrite: "auto",
        });
      }

      if (nextState) {
        gsap.set(menu, { visibility: "visible" });
        gsap.fromTo(menu, {
          opacity: 0,
          y: 10,
          scaleY: 1,
        }, {
          opacity: 1,
          y: 0,
          scaleY: 1,
          duration: 0.3,
          ease,
          transformOrigin: "top center",
          overwrite: "auto",
        });
        return;
      }

      gsap.to(menu, {
        opacity: 0,
        y: 10,
        scaleY: 1,
        duration: 0.2,
        ease,
        transformOrigin: "top center",
        overwrite: "auto",
        onComplete: () => {
          if (!state.mobileMenuOpen) gsap.set(menu, { visibility: "hidden" });
        },
      });
    };

    button.addEventListener("click", () => setMenuOpen(!state.mobileMenuOpen));
    state.mobileLinks.forEach((link) => link.addEventListener("click", () => setMenuOpen(false)));
  }

  function setupPillActiveState() {
    const ScrollTrigger = window.ScrollTrigger;
    const sections = [
      { href: "#top", element: document.querySelector(".parallax-landing") },
      { href: "#route", element: document.querySelector("#route") },
      { href: "#atlas", element: document.querySelector("#atlas") },
      { href: "#moments", element: document.querySelector("#moments") },
    ].filter((item) => item.element);

    const setActiveHref = (href) => {
      const links = [...state.pills, ...state.mobileLinks];
      links.forEach((link) => {
        const isActive = link.getAttribute("href") === href;
        link.classList.toggle("is-active", isActive);
        if (isActive) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    };

    if (ScrollTrigger) {
      sections.forEach(({ href, element }) => {
        ScrollTrigger.create({
          trigger: element,
          start: "top center",
          end: "bottom center",
          onEnter: () => setActiveHref(href),
          onEnterBack: () => setActiveHref(href),
        });
      });
      return;
    }

    let bestHref = "#top";
    const observer = new IntersectionObserver((entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (!visibleEntries.length) return;

      const match = sections.find((item) => item.element === visibleEntries[0].target);
      if (!match || match.href === bestHref) return;
      bestHref = match.href;
      setActiveHref(bestHref);
    }, {
      rootMargin: "-38% 0px -38% 0px",
      threshold: [0.18, 0.32, 0.48, 0.64],
    });

    sections.forEach(({ element }) => observer.observe(element));
  }

  bindPillHover();
  layoutPillHoverCircles();
  bindLogoHover();
  setupMobilePillMenu();
  setupPillActiveState();

  window.addEventListener("resize", layoutPillHoverCircles);
  document.fonts?.ready?.then(layoutPillHoverCircles).catch(() => {});
}

function setupPremiumMotion() {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("motion-enhanced");
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true, limitCallbacks: true });
  gsap.defaults({ ease: "power4.out", duration: 1.2, overwrite: "auto" });

  if (reduceMotion) {
    gsap.set([".hero-marquee", ".marquee-window", ".route-title h2", ".atlas-copy h2", ".moments-head h2"], {
      clearProps: "all",
    });
    return;
  }

  const sectionTitles = [".route-title h2", ".atlas-copy h2", ".moments-head h2"];
  sectionTitles.forEach((selector) => {
    document.querySelectorAll(selector).forEach((title) => {
      title.classList.add("motion-title");
    });
  });

  document.querySelectorAll(".album-card img, .atlas-detail-media img, .atlas-zone img, .moments-card img").forEach((image) => {
    image.classList.add("motion-image");
  });

  gsap.set(".site-nav", { y: -18, autoAlpha: 0 });
  gsap.set(".hero-marquee", {
    autoAlpha: 0,
    clipPath: "inset(0 50% 0 50%)",
    scaleX: 0.62,
    scaleY: 1.18,
    filter: "blur(14px)",
    transformOrigin: "50% 50%",
  });
  gsap.set(".marquee-track", { yPercent: 120, scaleX: 0.78 });
  gsap.set(".hero-bottom-bar > *", { y: 36, autoAlpha: 0 });
  gsap.set(".viewfinder span", { scale: 0.62, autoAlpha: 0, transformOrigin: "50% 50%" });

  heroOpeningTl = gsap.timeline({ paused: true, defaults: { ease: "power4.out" } });
  heroOpeningTl
    .to(".site-nav", { y: 0, autoAlpha: 1, duration: 1.1 }, 0.08)
    .to(".viewfinder span", { scale: 1, autoAlpha: 1, duration: 1.2, stagger: { amount: 0.2, from: "edges" } }, 0.18)
    .to(".hero-marquee", {
      autoAlpha: 1,
      clipPath: "inset(0 0% 0 0%)",
      scaleX: 1,
      scaleY: 1,
      filter: "blur(0px)",
      duration: 1.75,
    }, 0.3)
    .to(".marquee-track", { yPercent: 0, scaleX: 1, duration: 1.45 }, 0.54)
    .fromTo(".hero-layer img", { scale: 1.16, filter: "blur(10px) saturate(0.82)" }, {
      scale: 1.03,
      filter: "blur(0px) saturate(1.02)",
      duration: 2.2,
      stagger: 0.14,
    }, 0.08)
    .to(".hero-bottom-bar > *", { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.12 }, 1.12);

  const makeSectionTimeline = (section, titleSelector, cardSelector, imageSelector) => {
    if (!section) return;
    const title = section.querySelector(titleSelector);
    const cards = [...section.querySelectorAll(cardSelector)];
    const images = [...section.querySelectorAll(imageSelector)];
    if (!title) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top 72%",
        end: "bottom 24%",
        toggleActions: "play reverse play reverse",
      },
    });

    tl.fromTo(title, {
      yPercent: 120,
      scaleY: 0.58,
      scaleX: 1.22,
      autoAlpha: 0,
      clipPath: "inset(0 0 100% 0)",
      filter: "blur(10px)",
    }, {
      yPercent: 0,
      scaleY: 1,
      scaleX: 1,
      autoAlpha: 1,
      clipPath: "inset(0 0 0% 0)",
      filter: "blur(0px)",
      duration: 1.35,
    });

    if (cards.length) {
      tl.fromTo(cards, {
        y: 80,
        z: -80,
        rotationX: 14,
        rotationY: -8,
        autoAlpha: 0,
        filter: "blur(8px)",
      }, {
        y: 0,
        z: 0,
        rotationX: 0,
        rotationY: 0,
        autoAlpha: 1,
        filter: "blur(0px)",
        duration: 1.12,
        stagger: { amount: 0.42, from: "start" },
        clearProps: "transform,filter,opacity,visibility",
      }, "-=0.72");
    }

    if (images.length) {
      tl.fromTo(images, {
        clipPath: "inset(18% 0 18% 0)",
        scale: 1.14,
        filter: "blur(8px) saturate(0.72)",
      }, {
        clipPath: "inset(0% 0 0% 0)",
        scale: 1.02,
        filter: "blur(0px) saturate(1)",
        duration: 1.2,
        stagger: 0.08,
        clearProps: "transform,filter,clipPath",
      }, "-=0.94");
    }

    const st = tl.scrollTrigger;
    if (st) st.update();
  };

  makeSectionTimeline(document.querySelector("#route"), ".route-title h2", ".album-card, .route-board li, .route-flow-label", ".album-card img");
  makeSectionTimeline(document.querySelector("#atlas"), ".atlas-copy h2", ".atlas-detail-card, .atlas-point-chip, .atlas-map-stage", ".atlas-detail-media img, .atlas-zone img");
  makeSectionTimeline(document.querySelector("#moments"), ".moments-head h2", ".moments-head .eyebrow, .moments-head p, .moments-gallery", ".moments-carousel-stage");

  gsap.utils.toArray(".atlas-detail-media img").forEach((image) => {
    gsap.to(image, {
      yPercent: -8,
      scale: 1.08,
      ease: "none",
      scrollTrigger: {
        trigger: image.closest(".section-panel") || image,
        start: "top bottom",
        end: "bottom top",
        scrub: 1.1,
      },
    });
  });

  gsap.to(".giant-text, .atlas-bg-word, .moments-bg-word", {
    yPercent: -10,
    ease: "none",
    scrollTrigger: {
      trigger: "main",
      start: "top top",
      end: "bottom bottom",
      scrub: 1.4,
    },
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());
}

revealItems.forEach((item) => item.classList.add("reveal"));

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("is-visible", entry.isIntersecting);
    });
  },
  { threshold: 0.18 },
);

revealItems.forEach((item) => revealObserver.observe(item));
// section blend transition: keeps neighboring screens visually connected while scrolling.
function getSectionTheme(section) {
  if (!section) return "hero";
  if (section.classList.contains("route")) return "route";
  if (section.classList.contains("atlas")) return "atlas";
  if (section.classList.contains("moments")) return "moments";
  return "hero";
}

function updateSectionBlend() {
  if (!transitionSections.length) return;

  const viewportAnchor = window.innerHeight * 0.52;
  let activeSection = transitionSections[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  transitionSections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const isNear = rect.top < window.innerHeight * 0.88 && rect.bottom > window.innerHeight * 0.12;
    const centerDistance = Math.abs(rect.top + rect.height * 0.5 - viewportAnchor);
    section.classList.toggle("is-transition-near", isNear);

    if (rect.bottom > 0 && rect.top < window.innerHeight && centerDistance < nearestDistance) {
      nearestDistance = centerDistance;
      activeSection = section;
    }
  });

  const activeRect = activeSection.getBoundingClientRect();
  const progress = Math.min(Math.max((viewportAnchor - activeRect.top) / Math.max(activeRect.height, 1), 0), 1);
  const theme = getSectionTheme(activeSection);

  document.body.dataset.sectionTheme = theme;
  document.documentElement.style.setProperty("--section-progress", progress.toFixed(3));
  sectionBlend?.style.setProperty("--section-progress", progress.toFixed(3));
  sectionBlendTicking = false;
}

function requestSectionBlendUpdate() {
  if (sectionBlendTicking) return;
  sectionBlendTicking = true;
  window.requestAnimationFrame(updateSectionBlend);
}

if (atlasSection) {
  const atlasObserver = new IntersectionObserver(
    (entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      atlasSection.querySelectorAll(".reveal").forEach((item) => item.classList.add("is-visible"));
      observer.disconnect();
    },
    { threshold: 0.12 },
  );
  atlasObserver.observe(atlasSection);
}

function finishIntro(options = {}) {
  if (!introSplash || introDone) return;
  const { instant = false } = options;
  introDone = true;
  window.clearInterval(introFrameTimer);
  window.clearInterval(introProgressTimer);
  document.body.classList.remove("intro-active");

  if (instant) {
    document.body.classList.remove("intro-revealing");
    introSplash.hidden = true;
    playHeroOpening();
    armHeroReplayAfterOpening();
    return;
  }

  document.body.classList.add("intro-revealing");
  introSplash.classList.add("is-leaving");
  window.setTimeout(() => {
    introSplash.hidden = true;
    document.body.classList.remove("intro-revealing");
    playHeroOpening();
    armHeroReplayAfterOpening();
  }, INTRO_EXIT_DURATION);
}

function scrollToCurrentHash() {
  if (!window.location.hash) return;
  const targetId = decodeURIComponent(window.location.hash.slice(1));
  const target = document.getElementById(targetId);
  if (!target) return;

  window.requestAnimationFrame(() => {
    target.scrollIntoView({ block: "start" });
    requestSceneUpdate();
    window.ScrollTrigger?.refresh();
  });
}

function setupIntro() {
  if (!introSplash) return;

  introSkip?.addEventListener("click", () => finishIntro());

  if (new URLSearchParams(window.location.search).has("skipIntro")) {
    finishIntro({ instant: true });
    return;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finishIntro({ instant: true });
    return;
  }

  const duration = INTRO_FULL_DURATION;
  const frameDelay = 1800;

  let frameIndex = 0;
  introFrameTimer = window.setInterval(() => {
    frameIndex = (frameIndex + 1) % introFrames.length;
    introFrames.forEach((frame, index) => frame.classList.toggle("is-active", index === frameIndex));
  }, frameDelay);

  const startedAt = performance.now();
  const updateIntroProgress = () => {
    const progress = Math.min(1, (performance.now() - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(eased * 100);
    if (introNumber) introNumber.textContent = String(value).padStart(2, "0");
    introSplash.style.setProperty("--intro-progress", `${value}%`);
    if (progress >= 1) finishIntro();
  };

  updateIntroProgress();
  introProgressTimer = window.setInterval(() => {
    updateIntroProgress();
  }, 60);
}

function updateParallax() {
  const y = window.scrollY;
  parallaxItems.forEach((item) => {
    const speed = Number(item.dataset.speed || 0);
    item.style.transform = `translate3d(0, ${y * speed}px, 0)`;
  });

  parallaxTicking = false;
}

function requestParallaxUpdate() {
  if (parallaxTicking) return;
  parallaxTicking = true;
  window.requestAnimationFrame(updateParallax);
}

function requestSceneUpdate() {
  requestParallaxUpdate();
  requestSectionBlendUpdate();
}

window.addEventListener("scroll", requestSceneUpdate, { passive: true });
window.addEventListener("resize", requestSceneUpdate);
updateParallax();
updateSectionBlend();

function updatePointerEffects() {
  pointerTicking = false;
  const event = latestPointerEvent;
  if (!event) return;

  if (glow) glow.style.transform = `translate3d(${event.clientX - 130}px, ${event.clientY - 130}px, 0)`;

  if (atlasStage && atlasMapPanel && widePointerQuery.matches) {
    const rect = atlasStage.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0 && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) {
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      atlasStage.style.setProperty("--atlas-tilt-x", `${x * 6}deg`);
      atlasStage.style.setProperty("--atlas-tilt-y", `${y * -4}deg`);
      atlasDepthItems.forEach((item, index) => {
        const depth = index === 1 ? -18 : -10;
        item.style.setProperty("--atlas-mx", `${x * depth}px`);
        item.style.setProperty("--atlas-my", `${y * depth * 0.55}px`);
      });
    }
  }

  if (momentsScene && momentsDepthItems.length) {
    const rect = momentsScene.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      momentsDepthItems.forEach((item) => {
        const depth = Number(item.dataset.momentsDepth || (item.classList.contains("moments-bg-word") ? -26 : -12));
        item.style.setProperty("--mx", `${x * depth}px`);
        item.style.setProperty("--my", `${y * depth * 0.45}px`);
      });
    }
  }
}

window.addEventListener("pointermove", (event) => {
  latestPointerEvent = { clientX: event.clientX, clientY: event.clientY };
  if (pointerTicking) return;
  pointerTicking = true;
  window.requestAnimationFrame(updatePointerEffects);
}, { passive: true });

function setActiveAlbumCard(card) {
  albumCards.forEach((item) => {
    const isActive = item === card;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });
  setRouteFocus(card.dataset.routeTarget);
}

function resetAlbumCardTilt() {
  routeAlbum?.style.setProperty("--album-rx", "0deg");
  routeAlbum?.style.setProperty("--album-ry", "0deg");
  routeAlbum?.style.setProperty("--album-glow-x", "50%");
  routeAlbum?.style.setProperty("--album-glow-y", "42%");
}

function updateAlbumCardTilt(event) {
  const activeCard = event.currentTarget;
  if (!activeCard.classList.contains("is-active") || !routeAlbum) return;
  const rect = activeCard.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  const rotateY = (x - 0.5) * 18;
  const rotateX = (0.5 - y) * 14;
  routeAlbum.style.setProperty("--album-rx", `${rotateX.toFixed(2)}deg`);
  routeAlbum.style.setProperty("--album-ry", `${rotateY.toFixed(2)}deg`);
  routeAlbum.style.setProperty("--album-glow-x", `${(x * 100).toFixed(1)}%`);
  routeAlbum.style.setProperty("--album-glow-y", `${(y * 100).toFixed(1)}%`);
}

function setRouteFocus(target = "gate") {
  routeFlow?.setAttribute("data-active-route", target);
  routePoints.forEach((point) => {
    point.classList.toggle("is-route-active", point.dataset.routePoint === target);
  });
}

function setAtlasFocus(point) {
  if (!point) return;
  const target = point.dataset.atlasPoint;
  atlasStage?.setAttribute("data-active-atlas", target);

  atlasPoints.forEach((item) => {
    const isActive = item === point;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });

  atlasPointChips.forEach((chip) => {
    const isActive = chip.dataset.atlasTarget === target;
    chip.classList.toggle("is-active", isActive);
    chip.setAttribute("aria-pressed", String(isActive));
  });

  atlasRoutes.forEach((route) => {
    route.classList.toggle("is-active", route.dataset.atlasRoute === target);
  });

  if (atlasDetailIndex) atlasDetailIndex.textContent = point.dataset.atlasIndex || "01";
  if (atlasDetailTitle) atlasDetailTitle.textContent = point.dataset.atlasTitle || "宿舍";
  if (atlasDetailEn) atlasDetailEn.textContent = point.dataset.atlasEn || "Dormitory";
  if (atlasDetailDesc) atlasDetailDesc.textContent = point.dataset.atlasDesc || "入住、收纳和每天回到校园生活的起点。";
  if (atlasDetailTime) atlasDetailTime.textContent = point.dataset.atlasTime || "入住核心点";
  if (atlasDetailImage && point.dataset.atlasImage) {
    atlasDetailImage.style.opacity = "0";
    window.setTimeout(() => {
      atlasDetailImage.src = point.dataset.atlasImage;
      atlasDetailImage.alt = point.dataset.atlasImageAlt || point.dataset.atlasTitle || "校园点位图片";
      atlasDetailImage.style.opacity = "1";
    }, 120);
  }
}

function setAtlasFocusByTarget(target) {
  const point = atlasPoints.find((item) => item.dataset.atlasPoint === target);
  setAtlasFocus(point);
}

albumCards.forEach((card) => {
  card.addEventListener("click", () => setActiveAlbumCard(card));
  card.addEventListener("pointermove", updateAlbumCardTilt);
  card.addEventListener("pointerleave", resetAlbumCardTilt);
  card.addEventListener("focus", () => setActiveAlbumCard(card));
});

const activeAlbum = albumCards.find((card) => card.classList.contains("is-active"));
setRouteFocus(activeAlbum?.dataset.routeTarget);

atlasPoints.forEach((point) => {
  point.addEventListener("pointerenter", () => setAtlasFocus(point));
  point.addEventListener("focus", () => setAtlasFocus(point));
  point.addEventListener("click", () => setAtlasFocus(point));
});

atlasPointChips.forEach((chip) => {
  chip.addEventListener("pointerenter", () => setAtlasFocusByTarget(chip.dataset.atlasTarget));
  chip.addEventListener("focus", () => setAtlasFocusByTarget(chip.dataset.atlasTarget));
  chip.addEventListener("click", () => setAtlasFocusByTarget(chip.dataset.atlasTarget));
});

atlasStage?.addEventListener("pointerleave", () => {
  atlasStage.style.setProperty("--atlas-tilt-x", "0deg");
  atlasStage.style.setProperty("--atlas-tilt-y", "0deg");
  atlasDepthItems.forEach((item) => {
    item.style.setProperty("--atlas-mx", "0px");
    item.style.setProperty("--atlas-my", "0px");
  });
});


function openAtlasZoom() {
  if (!atlasStage) return;
  atlasStage.classList.add("is-map-zoomed");
  atlasSection?.classList.add("is-atlas-zoomed");
  document.body.classList.add("atlas-zoom-active");
}

function closeAtlasZoom() {
  if (!atlasStage) return;
  atlasStage.classList.remove("is-map-zoomed");
  atlasSection?.classList.remove("is-atlas-zoomed");
  document.body.classList.remove("atlas-zoom-active");
}

atlasStage?.addEventListener("click", (event) => {
  const clickedMapObject = event.target.closest("[data-atlas-point], .atlas-zone, .atlas-map-hub, .atlas-route-svg");
  if (!atlasStage.classList.contains("is-map-zoomed")) {
    openAtlasZoom();
    return;
  }

  if (!clickedMapObject) closeAtlasZoom();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && atlasStage?.classList.contains("is-map-zoomed")) closeAtlasZoom();
});
setAtlasFocus(atlasPoints.find((point) => point.classList.contains("is-active")) || atlasPoints[0]);

document.querySelector(".route-board button")?.addEventListener("click", () => {
  const path = document.querySelector(".route-path-line");
  const points = [...document.querySelectorAll(".route-flow circle, .route-tasks li > span")];

  path?.animate([{ strokeDashoffset: "120" }, { strokeDashoffset: "0" }], {
    duration: 1200,
    easing: "cubic-bezier(.16, 1, .3, 1)",
  });

  points.forEach((point, index) => {
    point.animate(
      [
        { transform: "scale(1)", filter: "brightness(1)" },
        { transform: "scale(1.18)", filter: "brightness(1.55)" },
        { transform: "scale(1)", filter: "brightness(1)" },
      ],
      {
        duration: 520,
        delay: index * 90,
        easing: "cubic-bezier(.16, 1, .3, 1)",
      },
    );
  });
});

function setupFinaleReveal() {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const finale = document.querySelector("[data-moments-finale]");
  const finaleOrb = document.querySelector(".moments-finale__orb");
  const finaleCopy = document.querySelector(".moments-finale__copy");
  const momentsGallery = document.querySelector(".moments-gallery");

  if (!gsap || !ScrollTrigger || !finale || !finaleOrb || !finaleCopy || !momentsGallery) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".moments-finale",
      start: "top 60%",
      end: "bottom bottom",
      scrub: 1.2,
      invalidateOnRefresh: true,
      onUpdate(self) {
        console.log("finale progress:", self.progress.toFixed(3), "direction:", self.direction);
      },
    },
  });

  tl.fromTo(finaleOrb, {
    scale: 0.06,
    yPercent: 20,
  }, {
    scale: 1.25,
    yPercent: 0,
    ease: "none",
  }, 0)
    .fromTo(finaleCopy, {
      autoAlpha: 0,
      y: 0,
      filter: "blur(0px)",
    }, {
      autoAlpha: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 0.35,
      ease: "power3.out",
    }, 0.5);
}

// setupSilkBackground();
setupGrainientBackground();
setupPremiumMotion();
setupHeroReplayTrigger();
initPillNav();
setupFinaleReveal();
setupIntro();
