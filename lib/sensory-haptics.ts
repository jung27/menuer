// Milliseconds: vibration, pause, vibration... No amplitude control on the web.
export const HAPTIC_PATTERNS: Record<string, { pulse: number[]; interval: number }> = {
  crunch: { pulse: [45, 25, 55], interval: 210 },
  fresh: { pulse: [40, 45, 40], interval: 260 },
  bread: { pulse: [45], interval: 280 },
  broth: { pulse: [40, 35, 55, 60, 40], interval: 310 },
  squish: { pulse: [80], interval: 220 },
  stretch: { pulse: [55, 35, 75], interval: 210 },
};

export class SensoryHaptics {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private active = false;
  private kind = "squish";

  start(pointerType: string, kind: string) {
    this.stop();
    if (pointerType !== "touch" || typeof navigator === "undefined" ||
        !/Android/i.test(navigator.userAgent) || typeof navigator.vibrate !== "function") return;
    this.active = true;
    this.kind = kind;
    this.tick();
  }

  setKind(kind: string) {
    // Switch at the next pulse; pointermove must not restart vibrations.
    this.kind = kind;
  }

  private tick = () => {
    if (!this.active) return;
    if (document.hidden) { this.stop(); return; }
    const profile = HAPTIC_PATTERNS[this.kind] ?? HAPTIC_PATTERNS.squish;
    try {
      if (!navigator.vibrate([...profile.pulse])) { this.stop(); return; }
    } catch { this.stop(); return; }
    this.timer = setTimeout(this.tick, profile.interval);
  };

  stop() {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    const wasActive = this.active;
    this.active = false;
    if (wasActive) {
      try { navigator.vibrate(0); } catch { /* Unsupported device settings. */ }
    }
  }
}
