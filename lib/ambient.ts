/* Ambient sound engine — a singleton WebAudio graph, no audio files.
   All sounds are synthesized from noise. The module holds no React; the
   ambient store drives it. Created lazily on first play to satisfy the
   browser autoplay gesture requirement. */

export type SoundId = "brown" | "pink" | "white" | "rain" | "wind";

export const SOUNDS: { id: SoundId; label: string }[] = [
  { id: "brown", label: "Brown" },
  { id: "pink", label: "Pink" },
  { id: "white", label: "White" },
  { id: "rain", label: "Rain" },
  { id: "wind", label: "Wind" },
];

const RAMP = 0.12; // seconds — gain ramps to avoid clicks
const BUF_SECONDS = 3;

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let masterGain: GainNode | null = null;
let active: { sound: SoundId; teardown: () => void } | null = null;
let volume = 0.6;

// Noise buffers are generated once and reused across sounds.
let whiteBuf: AudioBuffer | null = null;
let brownBuf: AudioBuffer | null = null;
let pinkBuf: AudioBuffer | null = null;

function makeWhite(c: Ctx): AudioBuffer {
  const len = c.sampleRate * BUF_SECONDS;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function makeBrown(c: Ctx): AudioBuffer {
  const len = c.sampleRate * BUF_SECONDS;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    d[i] = last * 3.5; // normalize up toward unity
  }
  return buf;
}

function makePink(c: Ctx): AudioBuffer {
  // Paul Kellet's economical pink-noise filter.
  const len = c.sampleRate * BUF_SECONDS;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return buf;
}

function looping(c: Ctx, buf: AudioBuffer): AudioBufferSourceNode {
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.start();
  return src;
}

/** Build the node chain for a sound and return a teardown function. */
function buildChain(c: Ctx, master: GainNode, sound: SoundId): () => void {
  const nodes: AudioNode[] = [];
  const stoppables: AudioScheduledSourceNode[] = [];

  if (sound === "brown" || sound === "pink" || sound === "white") {
    const buf = sound === "brown" ? brownBuf! : sound === "pink" ? pinkBuf! : whiteBuf!;
    const src = looping(c, buf);
    src.connect(master);
    nodes.push(src);
    stoppables.push(src);
  } else if (sound === "rain") {
    const src = looping(c, whiteBuf!);
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1400;
    bp.Q.value = 0.5;
    const amp = c.createGain();
    amp.gain.value = 0.85;
    // gentle amplitude shimmer
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.25;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0.12;
    lfo.connect(lfoGain).connect(amp.gain);
    lfo.start();
    src.connect(bp).connect(amp).connect(master);
    nodes.push(src, bp, amp, lfoGain);
    stoppables.push(src, lfo);
  } else {
    // wind: low-passed brown noise with a slowly sweeping cutoff + swells
    const src = looping(c, brownBuf!);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 480;
    const amp = c.createGain();
    amp.gain.value = 0.9;
    const sweep = c.createOscillator();
    sweep.frequency.value = 0.08;
    const sweepGain = c.createGain();
    sweepGain.gain.value = 220;
    sweep.connect(sweepGain).connect(lp.frequency);
    sweep.start();
    const swell = c.createOscillator();
    swell.frequency.value = 0.12;
    const swellGain = c.createGain();
    swellGain.gain.value = 0.18;
    swell.connect(swellGain).connect(amp.gain);
    swell.start();
    src.connect(lp).connect(amp).connect(master);
    nodes.push(src, lp, amp, sweepGain, swellGain);
    stoppables.push(src, sweep, swell);
  }

  return () => {
    stoppables.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    });
    nodes.forEach((n) => {
      try {
        n.disconnect();
      } catch {
        /* noop */
      }
    });
  };
}

function ensure(): Ctx | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(ctx.destination);
    whiteBuf = makeWhite(ctx);
    brownBuf = makeBrown(ctx);
    pinkBuf = makePink(ctx);
  }
  return ctx;
}

export const ambient = {
  isSupportedSound: (id: string): id is SoundId =>
    SOUNDS.some((s) => s.id === id),

  play(sound: SoundId) {
    const c = ensure();
    if (!c || !masterGain) return;
    if (c.state === "suspended") void c.resume();
    if (active) active.teardown();
    active = { sound, teardown: buildChain(c, masterGain, sound) };
    masterGain.gain.cancelScheduledValues(c.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, c.currentTime);
    masterGain.gain.linearRampToValueAtTime(volume, c.currentTime + RAMP);
  },

  setSound(sound: SoundId) {
    if (active && active.sound !== sound) this.play(sound);
  },

  stop() {
    if (!ctx || !masterGain || !active) return;
    const c = ctx;
    const toTeardown = active;
    active = null;
    masterGain.gain.cancelScheduledValues(c.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, c.currentTime);
    masterGain.gain.linearRampToValueAtTime(0, c.currentTime + RAMP);
    // teardown after the fade so it doesn't click
    setTimeout(() => toTeardown.teardown(), RAMP * 1000 + 60);
  },

  setVolume(v: number) {
    volume = Math.max(0, Math.min(1, v));
    if (ctx && masterGain && active) {
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + RAMP);
    }
  },
};
