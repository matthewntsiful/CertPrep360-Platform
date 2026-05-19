class SoundEffects {
  private static ctx: AudioContext | null = null;

  private static getContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Tactical click
  public static playClick() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.03);

      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      console.warn('Failed to play click:', e);
    }
  }

  // Rising positive chime arpeggio
  public static playSuccess() {
    try {
      const ctx = this.getContext();
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 major arpeggio
      const noteDelay = 0.08;

      notes.forEach((freq, i) => {
        const time = ctx.currentTime + i * noteDelay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.1, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);

        osc.start(time);
        osc.stop(time + 0.35);
      });
    } catch (e) {
      console.warn('Failed to play success:', e);
    }
  }

  // Soft completed notification chime
  public static playCompletion() {
    try {
      const ctx = this.getContext();
      const notes = [261.63, 392.00]; // C4 -> G4
      const noteDelay = 0.12;

      notes.forEach((freq, i) => {
        const time = ctx.currentTime + i * noteDelay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.08, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);

        osc.start(time);
        osc.stop(time + 0.5);
      });
    } catch (e) {
      console.warn('Failed to play completion:', e);
    }
  }
}

export default SoundEffects;
