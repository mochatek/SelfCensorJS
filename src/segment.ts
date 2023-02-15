/**
 * Segment represent the start and end time(in seconds) of an interval.
 */
class Segment {
    #start: number;
    #end: number;
  
    /**
     * Start and end must be timestamp strings in HH:MM:SS format.
     */
    constructor(start: string, end: string) {
        [this.#start, this.#end] = [start, end].map(Segment.TimeStampToSeconds);
    }
  
    get start() {
        return this.#start;
    }
  
    get end() {
        return this.#end;
    }
  
    /**
     * Determine whether a given time(in seconds) is within this segment.
     */
    includes(time: number) {
        return (this.#start <= time) && (time < this.#end);
    }
  
    /**
     * Convert timestamp value to seconds => (60 * ((60 * HH) + MM)) + SS
     */
    static TimeStampToSeconds = (timestamp: string) => {
        // 
        const timeParts = timestamp.split(':').map((part) => +part);
        return timeParts.reduce((seconds, part) => (60 * seconds) + part);
    };

    /**
     * Convert seconds value to timestamp => Date(ms) = '1970-01-01T00:00:10.000Z'
     */
    static secondsToTimestamp = (seconds: number) => {
        const dateString = new Date(seconds * 1000).toISOString();
        return dateString.slice(11).split('.')[0];
    };
}

export default Segment;
  