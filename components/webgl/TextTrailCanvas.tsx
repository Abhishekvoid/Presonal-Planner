"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useScroll, useVelocity, useReducedMotion } from "framer-motion";
import { readRGB } from "@/lib/webgl";
import { useTheme } from "@/lib/theme";

const SAMPLE_COUNT = 300;
const BASE_WIDTH = 2.5; // pixel width factor for ribbon

// Shaders for the ink ribbon spline
const RIBBON_VERT = /* glsl */ `
  uniform float uVelocity;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;
    
    // High-frequency drag wiggle perpendicular to the spline based on scroll velocity
    if (uVelocity > 0.01) {
      float wave = sin(pos.y * 0.08 + uTime * 25.0) * cos(pos.x * 0.05 + uTime * 15.0);
      pos.x += wave * uVelocity * 4.5;
      pos.y += wave * uVelocity * 2.5;
    }
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const RIBBON_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform vec3 uGlowColor;
  uniform float uProgress;
  uniform float uVelocity;
  uniform float uTime;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    // vUv.x represents length along the spline (0 to 1)
    // vUv.y represents width across the spline (0 to 1, center is 0.5)

    // Clip rendering beyond scroll progress
    if (vUv.x > uProgress) {
      discard;
    }

    // Smooth drawing fade at leading edge
    float edgeFade = smoothstep(uProgress, uProgress - 0.012, vUv.x);

    // Dynamic comet-tail trailing highlight immediately behind uProgress
    float distToEdge = uProgress - vUv.x;
    float cometTail = exp(-distToEdge * 32.0) * (0.8 + uVelocity * 0.4);

    // Distance from the center of the ribbon (scaled by velocity to taper thin when fast)
    float distToCenter = abs(vUv.y - 0.5) * 2.0;
    float thicknessFactor = 1.0 - uVelocity * 0.42; // tapers down to 58% thickness when fast
    float scaledDist = distToCenter / thicknessFactor;

    // Ink bleeding effect - bleeds wider and softer when slow/stationary
    float bleedSpread = 0.08 + (1.0 - uVelocity) * 0.05;
    float bleed = noise(vUv * 18.0 + vec2(uTime * 0.12, 0.0)) * bleedSpread;
    float lineAlpha = smoothstep(1.0, 0.12, scaledDist + bleed);

    // Core line vs outer glow
    float core = smoothstep(0.42, 0.0, scaledDist + bleed * 0.5);
    float glow = smoothstep(1.0, 0.0, scaledDist);

    // Color progression: starts dark charcoal at top, morphs to violet/indigo Accents
    vec3 baseCol = mix(uColor, uGlowColor, smoothstep(0.12, 0.55, vUv.x));
    
    // Core highlight color (white-hot at the tip highlight)
    vec3 finalCol = mix(baseCol, vec3(1.0, 1.0, 1.0), cometTail * 0.35);
    finalCol = mix(finalCol, uGlowColor, glow * 0.55 + cometTail * 0.4);

    // Opacity with trailing highlight
    float alpha = (core * 0.85 + glow * 0.3 + cometTail * 0.6) * edgeFade * lineAlpha;

    gl_FragColor = vec4(finalCol, alpha);
  }
`;

// Shaders for the leading tip glowing particle
const PARTICLE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PARTICLE_FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uVelocity;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float dist = length(vUv - 0.5);
    // Radial gradient glow
    float glow = smoothstep(0.5, 0.0, dist);
    // Core high intensity center
    float core = smoothstep(0.12, 0.0, dist);
    
    // Pulsing frequency is increased based on velocity
    float pulseSpeed = uTime * (1.0 + uVelocity * 2.5);
    float alpha = (glow * 0.65 + core * 0.35) * (0.8 + 0.2 * sin(pulseSpeed));
    gl_FragColor = vec4(uColor, alpha);
  }
`;

interface PointCache {
  current: THREE.Vector3;
  target: THREE.Vector3;
  initialized: boolean;
}

export default function TextTrailCanvas({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const { scrollYProgress } = useScroll();
  const scrollVelocity = useVelocity(scrollYProgress);
  const isReduced = useReducedMotion();

  useEffect(() => {
    const host = hostRef.current;
    if (!host || isReduced) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    // 1. Setup Three.js scene and Orthographic camera (1-to-1 mapping with screen pixels)
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      0.1,
      1000
    );
    camera.position.z = 10;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return; // WebGL not supported, degrade gracefully to silent background
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    host.appendChild(renderer.domElement);

    // 2. Setup colors from computed layout variables
    const [cR, cG, cB] = readRGB(
      theme === "dark" ? "--espresso-rgb" : "--coffee-rgb",
      theme === "dark" ? [0.94, 0.91, 0.85] : [0.35, 0.27, 0.2]
    );
    const [gR, gG, gB] = readRGB("--flow-rgb", [0.35, 0.32, 0.65]);

    const uniforms = {
      uColor: { value: new THREE.Color(cR, cG, cB) },
      uGlowColor: { value: new THREE.Color(gR, gG, gB) },
      uProgress: { value: 0 },
      uVelocity: { value: 0 },
      uTime: { value: 0 },
    };

    // 3. Ribbon Spline Mesh creation
    const ribbonGeometry = new THREE.BufferGeometry();
    const maxVertices = (SAMPLE_COUNT + 1) * 2;
    const maxIndices = SAMPLE_COUNT * 6;
    
    const positions = new Float32Array(maxVertices * 3);
    const uvs = new Float32Array(maxVertices * 2);
    const indices = new Uint16Array(maxIndices);

    ribbonGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    ribbonGeometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    ribbonGeometry.setIndex(new THREE.BufferAttribute(indices, 1));

    const ribbonMaterial = new THREE.ShaderMaterial({
      vertexShader: RIBBON_VERT,
      fragmentShader: RIBBON_FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: theme === "dark" ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    const ribbonMesh = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
    scene.add(ribbonMesh);

    // 4. Leading Tip Particle Mesh creation
    const particleGeometry = new THREE.PlaneGeometry(28, 28);
    const particleMaterial = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      uniforms: {
        uColor: { value: new THREE.Color(gR, gG, gB) },
        uVelocity: { value: 0 },
        uTime: { value: 0 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particleMesh = new THREE.Mesh(particleGeometry, particleMaterial);
    particleMesh.visible = false;
    scene.add(particleMesh);

    // Cache to smoothly interpolate spline coordinates
    let nodeCaches: PointCache[] = [];

    // 5. Node updates and screen position conversions
    const updateNodes = () => {
      // Find all tagged text nodes currently in the DOM, filtering out hidden/collapsed ones
      const nodes = Array.from(document.querySelectorAll("[data-trail-node]")).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.top !== 0;
      });

      if (nodes.length < 2) {
        ribbonMesh.visible = false;
        particleMesh.visible = false;
        return;
      }
      ribbonMesh.visible = true;

      // Synchronize lengths of cache array
      while (nodeCaches.length < nodes.length) {
        nodeCaches.push({
          current: new THREE.Vector3(),
          target: new THREE.Vector3(),
          initialized: false,
        });
      }
      if (nodeCaches.length > nodes.length) {
        nodeCaches = nodeCaches.slice(0, nodes.length);
      }

      // Read bounds and convert to camera projection coordinate system
      nodes.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const threeX = centerX - width / 2;
        const threeY = -(centerY - height / 2);

        const cache = nodeCaches[index];
        cache.target.set(threeX, threeY, 0);

        if (!cache.initialized) {
          cache.current.copy(cache.target);
          cache.initialized = true;
        } else {
          // Lerp for smooth fluid motion during scrolls and transitions
          cache.current.lerp(cache.target, 0.1);
        }
      });

      // Construct continuous curve with Hermite spline and windowed sine swings for perfect roundness
      const splinePoints = nodeCaches.map((c) => c.current);

      // Pre-compute cumulative arc lengths for uniform point distribution
      const cumulativeDists = [0];
      let totalDist = 0;
      for (let i = 0; i < splinePoints.length - 1; i++) {
        const p1 = splinePoints[i];
        const p2 = splinePoints[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        totalDist += dist;
        cumulativeDists.push(totalDist);
      }

      const getCustomCurvePoint = (t: number) => {
        if (splinePoints.length < 2) return new THREE.Vector3();
        
        // Map target parameter t (0..1) to physical arc length
        const targetDist = t * totalDist;
        
        // Find segment index where targetDist lies
        let segmentIndex = 0;
        while (
          segmentIndex < splinePoints.length - 2 &&
          cumulativeDists[segmentIndex + 1] < targetDist
        ) {
          segmentIndex++;
        }
        
        const segStartDist = cumulativeDists[segmentIndex];
        const segEndDist = cumulativeDists[segmentIndex + 1];
        const segLen = segEndDist - segStartDist;
        const segmentT = segLen > 0.001 ? (targetDist - segStartDist) / segLen : 0;
        
        const p1 = splinePoints[segmentIndex];
        const p2 = splinePoints[segmentIndex + 1];
        
        // Hermite blending functions
        const t2 = segmentT * segmentT;
        const t3 = t2 * segmentT;
        
        const h1 = 2 * t3 - 3 * t2 + 1;
        const h2 = -2 * t3 + 3 * t2;
        const h3 = t3 - 2 * t2 + segmentT;
        const h4 = t3 - t2;
        
        const dy = p2.y - p1.y;
        
        // Downward vertical tangents at both endpoints
        const v1 = new THREE.Vector3(0, dy, 0);
        const v2 = new THREE.Vector3(0, dy, 0);
        
        const p = new THREE.Vector3()
          .addScaledVector(p1, h1)
          .addScaledVector(p2, h2)
          .addScaledVector(v1, h3)
          .addScaledVector(v2, h4);
          
        // Organic rounded horizontal swing windowed by sin(t * PI)
        const absDy = Math.abs(dy);
        if (absDy > 180) {
          const cycles = Math.max(1, Math.floor(absDy / 350));
          const direction = segmentIndex % 2 === 0 ? 1 : -1;
          const swingWidth = direction * Math.min(140, width * 0.12);
          const swing = Math.sin(segmentT * Math.PI * cycles) * Math.sin(segmentT * Math.PI) * swingWidth;
          p.x += swing;
        }
        
        return p;
      };

      // Generate quads ribbon strip by sampling our smooth curve function
      const sampledPoints: THREE.Vector3[] = [];
      for (let i = 0; i <= SAMPLE_COUNT; i++) {
        sampledPoints.push(getCustomCurvePoint(i / SAMPLE_COUNT));
      }
      const posAttr = ribbonGeometry.getAttribute("position") as THREE.BufferAttribute;
      const uvAttr = ribbonGeometry.getAttribute("uv") as THREE.BufferAttribute;
      
      const posArray = posAttr.array as Float32Array;
      const uvArray = uvAttr.array as Float32Array;
      const indexArray = ribbonGeometry.index!.array as Uint16Array;

      for (let i = 0; i <= SAMPLE_COUNT; i++) {
        const p = sampledPoints[i];

        // Normal estimation along spline path
        let tangent;
        if (i < SAMPLE_COUNT) {
          tangent = new THREE.Vector3().subVectors(sampledPoints[i + 1], p).normalize();
        } else {
          tangent = new THREE.Vector3().subVectors(p, sampledPoints[i - 1]).normalize();
        }
        const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();

        // Ribbons taper naturally at both ends
        const t = i / SAMPLE_COUNT;
        const taper = Math.sin(t * Math.PI);
        const thickness = BASE_WIDTH * (0.35 + 0.65 * taper);

        const leftPoint = new THREE.Vector3().addVectors(p, new THREE.Vector3().copy(normal).multiplyScalar(thickness));
        const rightPoint = new THREE.Vector3().subVectors(p, new THREE.Vector3().copy(normal).multiplyScalar(thickness));

        const vIdx = i * 2;
        posArray[vIdx * 3] = leftPoint.x;
        posArray[vIdx * 3 + 1] = leftPoint.y;
        posArray[vIdx * 3 + 2] = leftPoint.z;

        posArray[(vIdx + 1) * 3] = rightPoint.x;
        posArray[(vIdx + 1) * 3 + 1] = rightPoint.y;
        posArray[(vIdx + 1) * 3 + 2] = rightPoint.z;

        uvArray[vIdx * 2] = t;
        uvArray[vIdx * 2 + 1] = 0;

        uvArray[(vIdx + 1) * 2] = t;
        uvArray[(vIdx + 1) * 2 + 1] = 1;
      }

      // Build face indices
      let iIdx = 0;
      for (let i = 0; i < SAMPLE_COUNT; i++) {
        const a = i * 2;
        const b = i * 2 + 1;
        const c = (i + 1) * 2;
        const d = (i + 1) * 2 + 1;

        indexArray[iIdx++] = a;
        indexArray[iIdx++] = b;
        indexArray[iIdx++] = c;

        indexArray[iIdx++] = b;
        indexArray[iIdx++] = d;
        indexArray[iIdx++] = c;
      }

      posAttr.needsUpdate = true;
      uvAttr.needsUpdate = true;
      ribbonGeometry.index!.needsUpdate = true;

      // Positioning particle tip at the front of drawing limit
      const progressVal = uniforms.uProgress.value;
      if (progressVal > 0.001 && progressVal < 0.999) {
        particleMesh.visible = true;
        const tipPos = getCustomCurvePoint(progressVal);
        particleMesh.position.copy(tipPos);
      } else {
        particleMesh.visible = false;
      }
    };

    // 6. Handle viewport resizing
    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      renderer.setSize(width, height);
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // 7. Animation loop
    const clock = new THREE.Clock();
    let rafId = 0;

    const tick = () => {
      const time = clock.getElapsedTime();
      
      // Update progress from scroll
      const targetProgress = scrollYProgress.get();
      uniforms.uProgress.value += (targetProgress - uniforms.uProgress.value) * 0.12;
      
      // Track and smooth scroll velocity factor
      const rawVel = scrollVelocity.get();
      const targetVel = Math.min(1.0, Math.abs(rawVel) * 2.5);
      uniforms.uVelocity.value += (targetVel - uniforms.uVelocity.value) * 0.08;
      
      uniforms.uTime.value = time;
      
      // Update particle uniforms
      particleMaterial.uniforms.uTime.value = time;
      particleMaterial.uniforms.uVelocity.value = uniforms.uVelocity.value;
      
      // Scale and animate the leading particle based on velocity
      const baseScale = 1.0 + 0.15 * Math.sin(time * 12.0);
      const velocityScale = 1.0 - uniforms.uVelocity.value * 0.35;
      const finalScale = baseScale * velocityScale;
      particleMesh.scale.set(finalScale, finalScale, 1.0);

      updateNodes();

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    };

    // Initial trigger
    tick();

    // Clean up
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      
      ribbonGeometry.dispose();
      ribbonMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
      
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [theme, isReduced, scrollYProgress]);

  if (isReduced) return null;

  return (
    <div
      ref={hostRef}
      aria-hidden
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${className}`}
    />
  );
}
