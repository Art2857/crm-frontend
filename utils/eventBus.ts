export type EventHandler<T = any> = (event: CustomEvent<T>) => void;

class EventBus {
  private bus: EventTarget;

  constructor() {
    this.bus = typeof window !== 'undefined' ? window : new EventTarget();
  }

  emit<T = any>(eventName: string, detail?: T) {
    const event = new CustomEvent<T>(eventName, { detail });
    this.bus.dispatchEvent(event);
  }

  on<T = any>(eventName: string, handler: EventHandler<T>): () => void {
    const wrappedHandler = handler as EventListener;
    this.bus.addEventListener(eventName, wrappedHandler);
    return () => this.bus.removeEventListener(eventName, wrappedHandler);
  }
}

export const eventBus = new EventBus();

export const emit = eventBus.emit.bind(eventBus) as <T = any>(
  eventName: string,
  detail?: T,
) => void;
export const on = eventBus.on.bind(eventBus) as <T = any>(
  eventName: string,
  handler: EventHandler<T>,
) => () => void;
