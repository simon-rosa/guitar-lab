/**
 * Effets de sortie de la lecture : réverbération et léger compresseur.
 *
 * alphaTab relie sa source sonore directement à la sortie de la carte son.
 * On intercepte cette liaison (une seule fois, au chargement) pour faire passer
 * le son par notre chaîne : entrée → compresseur → (sec + réverbération) → sortie.
 */

interface Chain {
  input: GainNode;
  dry: GainNode;
  wet: GainNode;
}

const chains = new Map<BaseAudioContext, Chain>();
let reverbAmount = 0.25; // = DEFAULT_REVERB
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

function chainFor(ctx: BaseAudioContext): Chain {
  let c = chains.get(ctx);
  if (c) return c;
  const input = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 10;
  comp.ratio.value = 2.5;
  comp.attack.value = 0.01;
  comp.release.value = 0.2;
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const conv = ctx.createConvolver();
  conv.buffer = impulse(ctx);
  link(input, comp);
  link(comp, dry);
  link(comp, conv);
  link(conv, wet);
  link(dry, ctx.destination);
  link(wet, ctx.destination);
  c = { input, dry, wet };
  chains.set(ctx, c);
  apply(c);
  return c;
}

function apply(c: Chain) {
  // Le signal sec baisse un peu quand la réverbération monte, pour garder le même volume.
  c.dry.gain.value = 1 - reverbAmount * 0.3;
  c.wet.gain.value = reverbAmount * 0.9;
}

let installed = false;

/** Installe l'interception (idempotent). */
export function installOutputEffects() {
  if (installed || typeof AudioNode === 'undefined') return;
  installed = true;
  AudioNode.prototype.connect = function (this: AudioNode, dest: AudioNode | AudioParam, ...rest: number[]) {
    if (dest instanceof AudioDestinationNode) {
      return (nativeConnect as (d: AudioNode, ...r: number[]) => AudioNode).call(this, chainFor(this.context).input, ...rest);
    }
    return (nativeConnect as (d: AudioNode | AudioParam, ...r: number[]) => AudioNode).call(this, dest, ...rest);
  } as typeof AudioNode.prototype.connect;
}

/** Réverbération de 0 (aucune) à 1. */
export function setReverb(amount: number) {
  reverbAmount = Math.max(0, Math.min(1, amount));
  chains.forEach(apply);
}

export const DEFAULT_REVERB = 0.25;
