class Segment {
    #start: number;
    #end: number;
  
    constructor(start: string, end: string) {
        [this.#start, this.#end] = [start, end].map(Segment.TimeStampToSeconds);
    }
  
    get start() {
        return this.#start;
    }
  
    get end() {
        return this.#end;
    }
  
    includes(time: number) {
        return (this.#start <= time) && (time < this.#end);
    }
  
    static TimeStampToSeconds = (timestamp: string) => {
        // (60 * ((60 * HH) + MM)) + SS
        const timeParts = timestamp.split(':').map((part) => +part);
        return timeParts.reduce((seconds, part) => (60 * seconds) + part);
    };

    static secondsToTimestamp = (seconds: number) => {
        // Date() requires milliseconds => '1970-01-01T00:00:10.000Z'
        const dateString = new Date(seconds * 1000).toISOString();
        return dateString.slice(11).split('.')[0];
    };
}

export default Segment;
  