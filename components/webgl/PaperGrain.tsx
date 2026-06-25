"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { readRGB, prefersReducedMotion } from "@/lib/webgl";
import { useTheme } from "@/lib/theme";

/*
  Living paper. A transparent fullscreen shader layered *over* the static SVG
  grain (which stays as the texture + no-WebGL fallback). It adds two slow,
  barely-there gestures:
    1. a large-scale tonal drift (the page "breathes")
    2. a soft ink bloom that pools toward the cursor
  Both tint with the warm palette and flip with the theme. Alpha is capped low
  so it reads as atmosphere, never decoration. Reduced-motion → one static frame.
*/

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec2  uRes;
  uniform float uTime;
  uniform vec2  uMouse;     // 0..1, smoothed
  uniform vec3  uInk;       // bloom / drift tint
  uniform float uAlpha;     // master strength
  uniform float uMouseAmt;  // bloom presence (0 until pointer moves)

  // hash + value noise + fbm
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i+vec2(0,0)), hash(i+vec2(1,0)), u.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++){ v += a*noise(p); p *= 2.02; a *= 0.5; }
    return v;
  }

  void main(){
    vec2 uv = gl_FragCoord.xy / uRes;
    float aspect = uRes.x / uRes.y;
    vec2 auv = vec2(uv.x * aspect, uv.y);

    // slow flowing tonal drift
    float t = uTime * 0.03;
    float drift = fbm(auv * 2.2 + vec2(t, -t * 0.6));
    drift = smoothstep(0.35, 0.95, drift);

    // soft bloom toward cursor
    vec2 m = vec2(uMouse.x * aspect, uMouse.y);
    float d = distance(auv, m);
    float bloom = smoothstep(0.55, 0.0, d) * uMouseAmt;

    float strength = (drift * 0.5 + bloom * 0.65) * uAlpha;
    gl_FragColor = vec4(uInk, strength);
  }
`;

export function PaperGrain() {
  const hostRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const inkRef = useRef<THREE.Color>(new THREE.Color(0, 0, 0));

  // keep the ink tint in sync with the theme without re-creating the renderer
  useEffect(() => {
    // dark: a warm light glow lifts the surface; light: a warm shadow pools
    const [r, g, b] = readRGB(
      theme === "dark" ? "--olive-soft-rgb" : "--coffee-rgb",
      theme === "dark" ? [0.5, 0.5, 0.35] : [0.43, 0.34, 0.27],
    );
    inkRef.current.setRGB(r, g, b);
  }, [theme]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    } catch {
      return; // no WebGL — static CSS grain remains the fallback
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const geometry = new THREE.PlaneGeometry(2, 2);
    const uniforms = {
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uInk: { value: inkRef.current },
      uAlpha: { value: 0.16 },
      uMouseAmt: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
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

    // smoothed pointer
    const target = new THREE.Vector2(0.5, 0.5);
    const onPointer = (e: PointerEvent) => {
      target.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
      uniforms.uMouseAmt.value = Math.min(uniforms.uMouseAmt.value + 0.04, 1);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const reduced = prefersReducedMotion();
    let raf = 0;
    const clock = new THREE.Clock();

    const renderOnce = () => {
      uniforms.uMouse.value.lerp(target, 0.06);
      uniforms.uInk.value = inkRef.current;
      renderer.render(scene, camera);
    };

    const loop = () => {
      uniforms.uTime.value = clock.getElapsedTime();
      renderOnce();
      raf = requestAnimationFrame(loop);
    };
    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!reduced) raf = requestAnimationFrame(loop);
    };

    if (reduced) {
      uniforms.uTime.value = 12.0; // a pleasant static frame
      renderOnce();
    } else {
      raf = requestAnimationFrame(loop);
      document.addEventListener("visibilitychange", onVis);
    }

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{ contain: "layout paint" }}
    />
  );
}

export default PaperGrain;
