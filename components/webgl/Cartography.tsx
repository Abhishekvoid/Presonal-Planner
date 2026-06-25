"use client";

import { RefObject, useEffect, useRef } from "react";
import * as THREE from "three";
import { readRGB, prefersReducedMotion } from "@/lib/webgl";
import { useTheme } from "@/lib/theme";

/*
  The Cartography of Effort. A full-viewport generative topographic map: an fbm
  elevation field drawn as contour lines that drift slowly and morph as scroll
  progress rises, with the focus-halo bloom growing from the centre — the map of
  your days coming into relief. Shares the fbm + warm-tint language of
  PaperGrain / FocusHalo. rAF pauses when offscreen or the tab is hidden;
  reduced motion → a single static frame.
*/

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform vec2  uRes;
  uniform float uTime;
  uniform float uProgress;
  uniform vec3  uLine;
  uniform vec3  uGlow;
  uniform float uAlpha;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),
               mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
  }
  float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<6;i++){v+=a*noise(p);p*=2.02;a*=0.5;} return v; }

  void main(){
    vec2 uv = gl_FragCoord.xy / uRes;
    float aspect = uRes.x / uRes.y;
    vec2 p = vec2((uv.x-0.5)*aspect, uv.y-0.5);

    float t = uTime * 0.025;
    // elevation field, morphing with scroll progress
    float h = fbm(p * 2.6 + vec2(t, -t*0.7));
    h += uProgress * 0.45 * fbm(p * 1.4 - vec2(t*0.5, t*0.3));

    // contour lines: bands of equal elevation
    float bands = 9.0;
    float ring = abs(fract(h * bands) - 0.5);
    float contour = smoothstep(0.06, 0.0, ring);

    // focus-halo bloom from the centre, grows with progress
    float d = length(p);
    float glow = smoothstep(0.62, 0.0, d) * uProgress;

    vec3 col = mix(uLine * contour, uGlow, glow * 0.6);
    float alpha = (contour * 0.55 + glow * 0.5) * uAlpha;
    gl_FragColor = vec4(col, alpha);
  }
`;

export default function Cartography({
  progressRef,
  className = "",
}: {
  progressRef: RefObject<number>;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    } catch {
      return; // no WebGL — section caption still reads on paper
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const [lr, lg, lb] = readRGB(
      theme === "dark" ? "--olive-soft-rgb" : "--coffee-rgb",
      theme === "dark" ? [0.5, 0.5, 0.35] : [0.43, 0.34, 0.27],
    );
    const [gr, gg, gb] = readRGB(
      theme === "dark" ? "--olive-deep-rgb" : "--olive-rgb",
      [0.43, 0.44, 0.28],
    );
    const uniforms = {
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uProgress: { value: progressRef.current ?? 0 },
      uLine: { value: new THREE.Color(lr, lg, lb) },
      uGlow: { value: new THREE.Color(gr, gg, gb) },
      uAlpha: { value: theme === "dark" ? 0.5 : 0.42 },
    };

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    );
    scene.add(mesh);

    const resize = () => {
      const w = host.clientWidth || window.innerWidth;
      const h = host.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const reduced = prefersReducedMotion();
    const clock = new THREE.Clock();
    let raf = 0;
    let onScreen = true;
    let running = false;

    const render = () => {
      uniforms.uProgress.value = progressRef.current ?? 0;
      renderer.render(scene, camera);
    };

    const loop = () => {
      if (!running) return;
      uniforms.uTime.value = clock.getElapsedTime();
      render();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || reduced) return;
      running = true;
      loop();
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver(
      ([e]) => {
        onScreen = e.isIntersecting;
        if (onScreen && !document.hidden) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(host);

    const onVis = () => {
      if (document.hidden) stop();
      else if (onScreen) start();
    };
    document.addEventListener("visibilitychange", onVis);

    if (reduced) render(); // single static frame
    else start();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return <div ref={hostRef} aria-hidden className={`pointer-events-none ${className}`} />;
}
