"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { readRGB, prefersReducedMotion } from "@/lib/webgl";
import { useTheme } from "@/lib/theme";

/*
  The "discipline halo". A ring of points orbiting the clock that:
    - breathes at rest (a slow, calm pulse),
    - comes alive while running (faster orbit, brighter, GSAP-eased),
    - dims when paused, nearly sleeps when idle,
    - tightens + densifies as the session nears completion (uProgress),
    - tints olive for focus, clay for break.
  Motion here is meaning, not decoration (Apple HIG): the visual state *is*
  the timer state. Reduced-motion → a still ring at low intensity.
*/

const COUNT = 1500;
const COUNT_REDUCED = 420;

const VERT = /* glsl */ `
  precision highp float;
  attribute float aAngle;
  attribute float aRadius;
  attribute float aSeed;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uProgress;
  uniform float uSize;
  uniform float uDpr;
  varying float vAlpha;

  void main() {
    float t = uTime;
    float ang = aAngle + t * (0.12 + 0.45 * uIntensity) + aSeed * 6.2831;
    float wobble = sin(t * 1.4 + aSeed * 24.0) * 0.045 * (0.3 + uIntensity);
    float breathe = 0.022 * sin(t * 0.85);
    // tighten the ring as focus deepens
    float radius = aRadius * (1.0 - 0.13 * uProgress) + wobble + breathe;
    vec2 p = vec2(cos(ang), sin(ang)) * radius;
    gl_Position = vec4(p, 0.0, 1.0);

    gl_PointSize = uSize * (0.45 + 0.9 * uIntensity) * (0.55 + 0.8 * aSeed) * uDpr;
    vAlpha = (0.12 + 0.88 * uIntensity) * (0.45 + 0.55 * aSeed);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.0, length(c));
    gl_FragColor = vec4(uColor, a * vAlpha);
  }
`;

export function FocusHalo({
  progress,
  running,
  paused,
  active,
  mode,
  className = "",
}: {
  progress: number;
  running: boolean;
  paused: boolean;
  active: boolean;
  mode: "work" | "break";
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const uniformsRef = useRef<{
    uTime: { value: number };
    uIntensity: { value: number };
    uProgress: { value: number };
    uSize: { value: number };
    uDpr: { value: number };
    uColor: { value: THREE.Color };
  } | null>(null);
  const materialRef = useRef<THREE.PointsMaterial | THREE.ShaderMaterial | null>(null);
  const progressTarget = useRef(progress);

  // setup (once)
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return;
    }
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const reduced = prefersReducedMotion();
    const count = reduced ? COUNT_REDUCED : COUNT;

    const angles = new Float32Array(count);
    const radii = new Float32Array(count);
    const seeds = new Float32Array(count);
    const positions = new Float32Array(count * 3); // unused but required
    for (let i = 0; i < count; i++) {
      angles[i] = Math.random() * Math.PI * 2;
      // a few soft bands so the ring has depth
      const band = 0.66 + (Math.random() < 0.3 ? Math.random() * 0.16 : Math.random() * 0.06);
      radii[i] = band;
      seeds[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aAngle", new THREE.BufferAttribute(angles, 1));
    geometry.setAttribute("aRadius", new THREE.BufferAttribute(radii, 1));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    const uniforms = {
      uTime: { value: 0 },
      uIntensity: { value: active ? (running ? 1 : 0.4) : 0.14 },
      uProgress: { value: progress },
      uSize: { value: 3.2 },
      uDpr: { value: dpr },
      uColor: { value: new THREE.Color(0.43, 0.44, 0.28) },
    };
    uniformsRef.current = uniforms;

    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: theme === "dark" ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    materialRef.current = material;

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const resize = () => {
      const s = Math.max(1, Math.min(host.clientWidth, host.clientHeight));
      renderer.setSize(s, s, false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let raf = 0;
    const clock = new THREE.Clock();
    const render = () => {
      uniforms.uProgress.value += (progressTarget.current - uniforms.uProgress.value) * 0.05;
      renderer.render(scene, camera);
    };

    const loop = () => {
      uniforms.uTime.value = clock.getElapsedTime();
      render();
      raf = requestAnimationFrame(loop);
    };
    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!reduced) raf = requestAnimationFrame(loop);
    };

    if (reduced) {
      uniforms.uTime.value = 6;
      render();
    } else {
      raf = requestAnimationFrame(loop);
      document.addEventListener("visibilitychange", onVis);
    }

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
      uniformsRef.current = null;
      materialRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GSAP-eased intensity on play / pause / idle transitions
  useEffect(() => {
    const u = uniformsRef.current;
    if (!u) return;
    const target = active ? (running ? 1 : paused ? 0.4 : 0.7) : 0.14;
    const tween = gsap.to(u.uIntensity, {
      value: target,
      duration: 0.7,
      ease: "power3.out",
      overwrite: true,
    });
    return () => {
      tween.kill();
    };
  }, [running, paused, active]);

  // progress is lerped in the render loop
  useEffect(() => {
    progressTarget.current = Math.max(0, Math.min(1, progress));
  }, [progress]);

  // theme + mode → color + blend mode
  useEffect(() => {
    const u = uniformsRef.current;
    const m = materialRef.current as THREE.ShaderMaterial | null;
    if (!u || !m) return;
    const varName = mode === "work" ? "--olive-rgb" : "--clay-rgb";
    const [r, g, b] = readRGB(varName, [0.43, 0.44, 0.28]);
    u.uColor.value.setRGB(r, g, b);
    m.blending = theme === "dark" ? THREE.AdditiveBlending : THREE.NormalBlending;
    m.needsUpdate = true;
  }, [mode, theme]);

  return <div ref={hostRef} aria-hidden className={`pointer-events-none ${className}`} />;
}

export default FocusHalo;
