"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { readRGB, prefersReducedMotion } from "@/lib/webgl";
import { useTheme } from "@/lib/theme";

/*
  Preloader ink field. A transparent fullscreen shader: warm ink blooms out of
  the centre as `uProgress` rises (paper soaking up ink). Shares the fbm +
  warm-tint language of PaperGrain. Reduced-motion → one static frame at the
  current progress. No WebGL → nothing (the wordmark fade still carries it).
*/

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform vec2  uRes;
  uniform float uTime;
  uniform float uProgress; // 0..1
  uniform vec3  uInk;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),
               mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
  }
  float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){v+=a*noise(p);p*=2.03;a*=0.5;} return v; }
  void main(){
    vec2 uv = gl_FragCoord.xy / uRes;
    float aspect = uRes.x / uRes.y;
    vec2 p = vec2((uv.x-0.5)*aspect, uv.y-0.5);
    float d = length(p);
    float edge = mix(0.05, 0.95, uProgress);          // bleed radius grows
    float field = fbm(p*3.2 + vec2(uTime*0.04, -uTime*0.03));
    float ink = smoothstep(edge, edge-0.35, d + (field-0.5)*0.28);
    gl_FragColor = vec4(uInk, ink * 0.5 * uProgress);
  }
`;

export default function InkReveal({
  progress,
  className = "",
}: {
  progress: number;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const progRef = useRef(progress);
  progRef.current = progress;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const [r, g, b] = readRGB(
      theme === "dark" ? "--olive-soft-rgb" : "--coffee-rgb",
      theme === "dark" ? [0.5, 0.5, 0.35] : [0.43, 0.34, 0.27],
    );
    const uniforms = {
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uProgress: { value: progress },
      uInk: { value: new THREE.Color(r, g, b) },
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
    let raf = 0;
    const clock = new THREE.Clock();
    const draw = () => {
      uniforms.uProgress.value = progRef.current;
      renderer.render(scene, camera);
    };
    if (reduced) {
      draw();
    } else {
      const loop = () => {
        uniforms.uTime.value = clock.getElapsedTime();
        draw();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return <div ref={hostRef} aria-hidden className={`pointer-events-none ${className}`} />;
}
