export class EventBus {
  constructor(io = null) {
    this.io = io;
    this.events = [];
  }

  attach(io) {
    this.io = io;
  }

  emit(eventName, payload) {
    this.events.push({ eventName, payload, emittedAt: new Date().toISOString() });
    if (this.io) {
      this.io.emit(eventName, payload);
    }
  }

  clear() {
    this.events = [];
  }
}
