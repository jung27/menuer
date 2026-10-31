// Milliseconds: vibration, pause, vibration... No amplitude control on the web.
export const HAPTIC_PATTERNS: Record<string, { pulse: number[]; interval: number }> = {
  crunch: { pulse: [12, 35, 18], interval: 260 },
  fresh: { pulse: [10, 65, 10], interval: 340 },
  bread: { pulse: [14], interval: 380 },
  broth: { pulse: [12, 55, 16, 90, 10], interval: 410 },
  squish: { pulse: [35], interval: 310 },
  stretch: { pulse: [25, 55, 40], interval: 250 },
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
