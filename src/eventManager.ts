type EventName = string;
type Handler = (event: { detail: any }) => any;
type ListenerTable = Map<EventName, Handler[]>;

class EventManager {
    #listenerTable: ListenerTable;

    constructor() {
        this.#listenerTable = new Map();
    }
  
    get active() {
        return [...this.#listenerTable.keys()].length > 0
    }
  
    register(event: EventName, handler: Handler) {
        if (!this.#listenerTable.has(event)) {
            this.#listenerTable.set(event, [])
        }
        this.#listenerTable.get(event)!.push(handler)
    }
  
    unregister(event: EventName, handler: Handler) {
        if (this.#listenerTable.has(event)) {
            const newHandlers = this.#listenerTable.get(event)!.filter((callback) => callback !== handler)
            if (newHandlers.length) {
                this.#listenerTable.set(event, newHandlers)
            } else {
                this.#listenerTable.delete(event)
            }
        }
    }
  
    async emit(event: EventName, data: any) {
        this.#listenerTable.get(event)!.forEach((handler) => handler(data))
    }
}

export default EventManager;