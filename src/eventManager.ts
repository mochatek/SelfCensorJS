type EventName = string;
type Handler = (event: { detail: any }) => any;
type ListenerTable = Map<EventName, Handler[]>;

/**
 * Event manager maintains an internal dictionary with event name as the key and
 * an array of listeners (callback functions) as the value.
 * Upon calling the emit method, it executes all the listeners registered for that event.
 */
class EventManager {
    #listenerTable: ListenerTable;

    constructor() {
        this.#listenerTable = new Map();
    }
  
    /**
     * Manager is active if there is at least one event registered in the table.
     * An event is active if at least 1 listener is registered for that event
     */
    isActive(event?: EventName) {
        if (event) {
            return this.#listenerTable.has(event);
        }
        return [...this.#listenerTable.keys()].length > 0;
    }
  
    /**
     * Method to attach a listener to an event
     */
    register(event: EventName, handler: Handler) {
        if (!this.#listenerTable.has(event)) {
            this.#listenerTable.set(event, []);
        }
        this.#listenerTable.get(event)!.push(handler);
    }
  
    /**
     * Method to remove a listener which was earlier attached to an event
     * After removing the listener, if the listener array is empty, then event key
     * itself is removed from the table.
     */
    unregister(event: EventName, handler: Handler) {
        if (this.#listenerTable.has(event)) {
            const newHandlers = this.#listenerTable.get(event)!.filter((callback) => callback !== handler);
            if (newHandlers.length) {
                this.#listenerTable.set(event, newHandlers);
            } else {
                this.#listenerTable.delete(event);
            }
        }
    }
  
    /**
     * Method to notify the event to all registered listeners.
     */
    async emit(event: EventName, data: any) {
        this.#listenerTable.get(event)!.forEach((handler) => handler(data));
    }
}

export default EventManager;