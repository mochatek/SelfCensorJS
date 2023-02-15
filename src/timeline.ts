import Segment from './segment';

type TrackName = string;
type Track = Segment[];
type TrackTable =  Map<TrackName, Track>;

/**
 * Timeline represents the timeline of the censoring service.
 * It maintains a table with all the available track names as the key
 * and the array of segments to be skipped in that track as their corresponding value.
 * It also maintains 2 pointers: one for keeping track of the current track name and
 * the other one called 'marker', points to an index of the current track's segments.
 * These 2 pointers together identifies the segment to be censored at any point of time.
 */
class Timeline {
    #trackTable: TrackTable;
    #currentTrack: TrackName
    #markerPosition: number;
  
    /**
     * Build the internal table from the JSON data and initializes the pointers
     * The first track is chosen by default. Marker is set on the appropriate
     * segment based on the current time of the video.
     */
    constructor(censorData: Record<string, [string, string][]>, time: number) {
        this.#trackTable = new Map();
        Object.entries(censorData).forEach(([track, segments]) => {
            this.#trackTable.set(track, segments.map((interval) => new Segment(...interval)));
        });
        this.#currentTrack = this.#trackTable.keys().next().value;
        this.#markerPosition = 0;
        this.seek(time);
    }
  
    /**
     * Returns the segment given by the current track and marker.
     */
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
  
    /**
     * Advance the marker to the next segment in the track.
     */
    advance() {
        this.#markerPosition += 1;
    }
  
    /**
     * Seeks the marker to the appropriate segment based on the current time of the video.
     * Binary search strategy is used to find the segment index.
     */
    seek(time: number) {
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
  
    /**
     * Switches to the supplied track and seeks the marker to the right segment.
     */
    switch(track: TrackName, time: number) {
        this.#currentTrack = track;
        this.seek(time);
    }
  
    /**
     * Resets the marker to the first segment
     */
    reset() {
        this.#markerPosition = 0;
    }
}

export default Timeline;