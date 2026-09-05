// Measures time the player can act. Rendering, forced animations and pauses
// never affect speed rewards. A monotonic clock avoids system-clock changes.
export class PlayClock {
  constructor(now = () => performance.now()) {
    this.now = now;
    this.reset();
  }
  reset() {
    this.elapsed = 0;
    this.runningSince = null;
    this.started = false;
  }
  read() {
    return (
      this.elapsed + (this.runningSince === null ? 0 : Math.max(0, this.now() - this.runningSince))
    );
  }
  setRunning(running) {
    if (running && this.runningSince === null) {
      this.runningSince = this.now();
      this.started = true;
    } else if (!running && this.runningSince !== null) {
      this.elapsed = this.read();
      this.runningSince = null;
    }
    return this.read();
  }
}
