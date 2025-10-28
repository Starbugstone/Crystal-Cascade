export class GameLoop {
  constructor({ tick }) {
    this.tick = tick;
    this.rafId = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    const step = (time) => {
      if (!this.isRunning) {
        return;
      }
      this.tick?.(time);
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  stop() {
    if (!this.isRunning) {
      return;
    }
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
