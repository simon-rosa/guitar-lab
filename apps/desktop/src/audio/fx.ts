/**
 * Effets de sortie de la lecture : réverbération et léger compresseur.
 *
 * alphaTab relie sa source sonore directement à la sortie de la carte son.
 * On intercepte cette liaison (une seule fois, au chargement) pour faire passer
 * le son par notre chaîne : entrée → compresseur → (sec + réverbération) → sortie.
 *
 * Deux mesures de niveau (avant et après les effets) permettent de vérifier
 * pendant la lecture que le son passe vraiment ; si les effets bloquent le son
 * sur un navigateur, `bypassEffects()` les retire sans interrompre la lecture.
 */

interface Chain {
  ctx: BaseAudioContext;
  input: GainNode;
  dry: GainNode;
  wet: GainNode;
  inMeter: AnalyserNode;
  outMeter: AnalyserNode;
  bypassed: boolean;
}

const chains = new Map<BaseAudioContext, Chain>();
export const DEFAULT_REVERB = 0.25;
let reverbAmount = DEFAULT_REVERB;
let bypass = false;
const nativeConnect = AudioNode.prototype.connect;
/** Liaison d'origine, sans notre interception. */
const link = (from: AudioNode, to: AudioNode) => (nativeConnect as (d: AudioNode) => AudioNode).call(from, to);

/** Réponse impulsionnelle synthétique : bruit stéréo qui décroît (≈ 2,2 s, salle moyenne). */
function impulse(ctx: BaseAudioContext, seconds = 2.2, decay = 3.2): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const pre = Math.floor(rate * 0.012);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / (len - pre);
      // Bruit légèrement filtré (moins d'aigus dans la queue) qui s'éteint.
      lp += (Math.random() * 2 - 1 - lp) * (0.55 - 0.4 * t);
      data[i] = lp * Math.pow(1 - t, decay);
    }
  }
  return buf;
}

function meter(ctx: BaseAudioContext): AnalyserNode {
  const a = ctx.createAnalyser();
  a.fftSize = 2048;
  return a;
}

/** Compresseur + réverbération entre `input` et `out` (aussi utilisé pour l'export audio). */
export function buildEffects(ctx: BaseAudioContext, amount: number) {
  const input = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 10;
  comp.ratio.value = 2.5;
  comp.attack.value = 0.01;
  comp.release.value = 0.2;
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const out = ctx.createGain();
  const conv = ctx.createConvolver();
  conv.buffer = impulse(ctx);
  link(input, comp);
  link(comp, dry);
  link(comp, conv);
  link(conv, wet);
  link(dry, out);
  link(wet, out);
  dry.gain.value = 1 - amount * 0.3;
  wet.gain.value = amount * 0.9;
  return { input, out, dry, wet };
}

/** Chaîne d'effets du contexte audio, ou `null` si elle ne peut pas être construite. */
function chainFor(ctx: BaseAudioContext): Chain | null {
  const existing = chains.get(ctx);
  if (existing) return existing;
  try {
    const { input, out, dry, wet } = buildEffects(ctx, reverbAmount);
    const inMeter = meter(ctx);
    const outMeter = meter(ctx);
    link(input, inMeter);
    link(out, outMeter);
    link(out, ctx.destination);
    const c: Chain = { ctx, input, dry, wet, inMeter, outMeter, bypassed: false };
    chains.set(ctx, c);
    apply(c);
    if (bypass) bypassChain(c);
    return c;
  } catch (e) {
    console.warn('Effets audio indisponibles, sortie directe.', e);
    return null;
  }
}

function apply(c: Chain) {
  // Le signal sec baisse un peu quand la réverbération monte, pour garder le même volume.
  c.dry.gain.value = 1 - reverbAmount * 0.3;
  c.wet.gain.value = reverbAmount * 0.9;
}

/** Relie l'entrée directement à la sortie : plus d'effets, le son passe tel quel. */
function bypassChain(c: Chain) {
  if (c.bypassed) return;
  c.bypassed = true;
  try {
    c.input.disconnect();
  } catch {
    /* déjà déconnectée */
  }
  link(c.input, c.inMeter);
  link(c.input, c.outMeter);
  link(c.input, c.ctx.destination);
}

let installed = false;

/** Installe l'interception (idempotent). */
export function installOutputEffects() {
  if (installed || typeof AudioNode === 'undefined') return;
  installed = true;
  AudioNode.prototype.connect = function (this: AudioNode, dest: AudioNode | AudioParam, ...rest: number[]) {
    if (dest instanceof AudioDestinationNode) {
      const chain = chainFor(this.context);
      if (chain) return (nativeConnect as (d: AudioNode, ...r: number[]) => AudioNode).call(this, chain.input, ...rest);
    }
    return (nativeConnect as (d: AudioNode | AudioParam, ...r: number[]) => AudioNode).call(this, dest, ...rest);
  } as typeof AudioNode.prototype.connect;
}

/** Réverbération de 0 (aucune) à 1. */
export function setReverb(amount: number) {
  reverbAmount = Math.max(0, Math.min(1, amount));
  chains.forEach(apply);
}

/** Retire les effets (réverbération, compresseur) pour toute la session. */
export function bypassEffects() {
  bypass = true;
  chains.forEach(bypassChain);
}

/** Réglage de réverbération en cours (0 à 1). */
export function currentReverb(): number {
  return reverbAmount;
}

export function effectsBypassed(): boolean {
  return bypass;
}

function peak(a: AnalyserNode): number {
  const buf = new Float32Array(a.fftSize);
  a.getFloatTimeDomainData(buf);
  let m = 0;
  for (const v of buf) {
    if (Number.isNaN(v)) return Number.NaN;
    m = Math.max(m, Math.abs(v));
  }
  return m;
}

/** Niveau crête actuel avant (`input`) et après (`output`) les effets ; NaN si le signal est corrompu. */
export function outputLevels(): { input: number; output: number } | null {
  let input = 0;
  let output = 0;
  let any = false;
  chains.forEach((c) => {
    if (c.ctx.state === 'closed') return;
    any = true;
    const i = peak(c.inMeter);
    const o = peak(c.outMeter);
    input = Number.isNaN(i) || Number.isNaN(input) ? Number.NaN : Math.max(input, i);
    output = Number.isNaN(o) || Number.isNaN(output) ? Number.NaN : Math.max(output, o);
  });
  return any ? { input, output } : null;
}
