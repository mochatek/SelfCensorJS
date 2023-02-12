import Segment from './segment';

type TrackName = string;
type Track = Segment[];
type TrackTable =  Map<TrackName, Track>;

class Timeline {
    #trackTable: TrackTable;
    #currentTrack: TrackName
    #markerPosition: number;
  
    constructor(censorData: Record<string, [string, string][]>, time: number) {
        this.#trackTable = new Map();
        Object.entries(censorData).forEach(([track, segments]) => {
            this.#trackTable.set(track, segments.map((interval) => new Segment(...interval)));
        });
        this.#currentTrack = this.#trackTable.keys().next().value;
        this.#markerPosition = 0;
        this.seek(time);
    }
  
    get currentSegment() {
        const segments = this.#trackTable.get(this.#currentTrack)!;
        if (this.#markerPosition < segments.length) {
            return segments[this.#markerPosition];
        }
        return null;
    }
  
    get currentTrack() {
        return this.#currentTrack;
    }
  
    advance() {
        this.#markerPosition += 1;
    }
  
    seek(time: number) {
        /**
         * If a segment is found where the time will fall, set marker on that segment
         */
        const segments = this.#trackTable.get(this.#currentTrack)!;
        let low = 0;
        let high = segments.length - 1;
  
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const segment = segments[mid];
  
            if (segment.includes(time)) {
                this.#markerPosition = mid;
                break;
            } else if (time < segment.start) {
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }
        if (low > high) {
            this.#markerPosition = low;
        }
    }
  
    switch(track: TrackName, time: number) {
        this.#currentTrack = track;
        this.seek(time);
    }
  
    reset() {
        this.#markerPosition = 0;
    }
}

export default Timeline;