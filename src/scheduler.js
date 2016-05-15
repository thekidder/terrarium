
class Scheduler {
  constructor(fn, intervalMs) {
    this.lastFireMs = 0;
    this.currentMs = 0;
    this.intervalMs = intervalMs;
    this.fn = fn;
  }

  update(millis) {
    this.currentMs += millis;

    if (this.currentMs - this.lastFireMs > this.intervalMs) {
      this.fn();
      this.lastFireMs = this.currentMs;
    }
  }
}

export default Scheduler;
