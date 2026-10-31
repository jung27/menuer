export type SensorySound = "broth" | "squish" | "stretch" | "crunch" | "fresh";
const files: Record<SensorySound, string> = {
  broth: "/sounds/broth-touch.wav", squish: "/sounds/squish-touch.wav",
  stretch: "/sounds/stretch-touch.wav", crunch: "/sounds/crunch-touch.wav", fresh: "/sounds/fresh-touch.wav",
};
const volumes: Record<SensorySound, number> = {
  broth: 0.32, squish: 0.3, stretch: 0.28, crunch: 0.35, fresh: 0.35,
};
let context: AudioContext | undefined;
const downloads = new Map<SensorySound, Promise<ArrayBuffer>>();
const decoded = new Map<SensorySound, Promise<AudioBuffer>>();
const ready = new Map<SensorySound, AudioBuffer>();

function audioContext() {
  const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return context ??= new AudioCtor({ latencyHint: "interactive" });
}

function decode(kind: SensorySound, ctx: AudioContext) {
  let buffer = decoded.get(kind);
  if (!buffer) {
    buffer = download(kind).then(data => ctx.decodeAudioData(data.slice(0)))
      .then(audio => { ready.set(kind, audio); return audio; })
      .catch(error => { decoded.delete(kind); throw error; });
    decoded.set(kind, buffer);
  }
  return buffer;
}

export async function prepareSensoryAudio() {
  const ctx = audioContext();
  await Promise.all((Object.keys(files) as SensorySound[]).map(kind => decode(kind, ctx)));
}

export function soundForGesture(pattern: string, dragging: boolean): SensorySound {
  if (pattern === "broth") return "broth";
  if (pattern === "fresh") return "fresh";
  if (pattern === "fried") return "crunch";
  if (dragging && (pattern === "noodle" || pattern === "bread" || pattern === "tteok")) return "stretch";
  return "squish";
}

function download(kind: SensorySound) {
  let pending = downloads.get(kind);
  if (!pending) {
    pending = fetch(files[kind]).then(response => {
      if (!response.ok) throw new Error("Sound unavailable");
      return response.arrayBuffer();
    }).catch(error => { downloads.delete(kind); throw error; });
    downloads.set(kind, pending);
  }
  return pending;
}

// One voice per card. A generation counter cancels playback that finishes loading
// after pointer-up, navigation, mute, or a change from pressing to stretching.
export class SensoryAudio {
  private generation = 0;
  private wanted: SensorySound | null = null;
  private voice: { source: AudioBufferSourceNode; gain: GainNode } | null = null;

  preload(pattern: string) {
    let ctx: AudioContext;
    try { ctx = audioContext(); } catch { return; }
    for (const kind of new Set([soundForGesture(pattern, false), soundForGesture(pattern, true)])) {
      void decode(kind, ctx).catch(() => {});
    }
  }

  play(kind: SensorySound) {
    if (this.wanted === kind) return;
    this.stop(true);
    this.wanted = kind;
    const generation = this.generation;
    try {
      const ctx = audioContext();
      const start = (audio: AudioBuffer) => {
        if (generation !== this.generation || this.wanted !== kind) return;
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        source.buffer = audio;
        source.loop = kind !== "crunch" && kind !== "fresh";
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volumes[kind], ctx.currentTime + 0.002);
        source.connect(gain);
        gain.connect(ctx.destination);
        const voice = { source, gain };
        this.voice = voice;
        source.onended = () => {
          source.disconnect(); gain.disconnect();
          if (this.voice === voice) this.voice = null;
        };
        source.start();
      };
      const fail = () => {
        if (generation === this.generation) this.wanted = null;
      };
      const cached = ready.get(kind);
      if (cached && ctx.state === "running") {
        start(cached); // Warm touches schedule audio in this same event, no await.
      } else {
        // Only the first browser audio unlock needs resume; decoding is done
        // before the card becomes interactive under normal operation.
        void Promise.all([ctx.resume(), cached ?? decode(kind, ctx)])
          .then(([, audio]) => start(audio)).catch(fail);
      }
    } catch {
      this.wanted = null; // Audio support must never block card interaction.
    }
  }

  stop(immediate = false) {
    this.generation++;
    this.wanted = null;
    const voice = this.voice;
    if (!voice || !context) return;
    const now = context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + (immediate ? 0 : 0.08));
    voice.source.stop(now + (immediate ? 0 : 0.085));
    if (immediate) {
      voice.source.disconnect(); voice.gain.disconnect();
      this.voice = null;
    }
  }
}
