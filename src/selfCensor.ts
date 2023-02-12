import Segment from './segment';
import TimeLine from './timeline';
import EventManager from './eventManager';

type State = 'STALE' | 'STARTED' | 'RUNNING' | 'STOPPED';
type EventType = 'READY' | 'ERROR';
type EventObject = { detail: any };
type CensorData = Record<string, [string, string][]>;

class SelfCensor {
    static #allowedEvents = ['ready', 'error'];
  
    #videoId: string;
    #censorTimeline: TimeLine | null;
    #eventManager: EventManager | null;
    #forceSeek: boolean;
    #state: State;
    censorTracks: string[];
  
    constructor(videoId: string) {
        this.#videoId = videoId
        this.#censorTimeline = null;
        this.#eventManager = null;
        this.#forceSeek = false;
        this.#state = 'STALE';
        this.censorTracks = [];
    
        const video =  document.getElementById(this.#videoId) as HTMLVideoElement;
        if (!SelfCensor.#isValidVideo(video)) {
            throw new Error(`Element with id: ${this.#videoId} is not an HTMLVideoElement, or it doesn't exist`);
        }
    }
  
    start() {
        const video =  document.getElementById(this.#videoId) as HTMLVideoElement;
        if (SelfCensor.#isValidVideo(video)) {
            if (['STALE', 'STOPPED'].includes(this.#state)) {
                this.#state = 'STARTED';
                this.#init(video);
            }
        } else {
            throw new Error(`Element with id: ${this.#videoId} is not an HTMLVideoElement, or it doesn't exist`);
        }
    }
  
    stop() {
        const video =  document.getElementById(this.#videoId) as HTMLVideoElement;
        if (SelfCensor.#isValidVideo(video)) {
            video.removeEventListener('seeked', this.#seekCensorTimeline);
            video.removeEventListener('timeupdate', this.#processFrame);
            video.removeEventListener('ended', this.#resetService);
            this.#censorTimeline = null;
            this.#eventManager = null;
            this.#forceSeek = false;
            this.censorTracks = [];
            this.#state = 'STOPPED';
        }
    }
  
    #init = async (video: HTMLVideoElement) => {
        if (video?.duration) {
            const censorFile = video.dataset['censor']
            if (censorFile) {
                try {
                    const censorData = await SelfCensor.#download(censorFile);
                    SelfCensor.#validate(censorData);
                    this.#censorTimeline = new TimeLine(censorData, video.currentTime);
                    this.censorTracks = Object.keys(censorData);
                    video.addEventListener('seeked', this.#seekCensorTimeline);
                    video.addEventListener('timeupdate', this.#processFrame);
                    video.addEventListener('ended', this.#resetService);
                    this.#state = 'RUNNING';
                    this.#eventManager?.emit('ready', {
                        detail: {
                            censorTracks: this.censorTracks,
                            currentTrack: this.#censorTimeline.currentTrack,
                        },
                    });
                } catch (error) {
                    if (this.#eventManager?.active) {
                        this.#eventManager.emit('error', { detail: error });
                    } else {
                        throw error;
                    }
                }
            }
        }
    }
  
    #seekCensorTimeline = (event: Event) => {
        const video = event.target as HTMLVideoElement;
        if (!this.#forceSeek) {
            this.#censorTimeline!.seek(video.currentTime);
        } else {
            this.#forceSeek = false;
        }
    }
  
    #processFrame = (event: Event) => {
        const video = event.target as HTMLVideoElement;
        const { currentTime } = video;
        const currentSegment = this.#censorTimeline!.currentSegment;
    
        if (currentSegment && currentSegment.includes(currentTime)) {
            this.#forceSeek = true;
            video.currentTime = currentSegment.end;
            this.#censorTimeline!.advance();
        }
    }
  
    #resetService = (event: Event) => {
        const video = event.target as HTMLVideoElement;
        video.currentTime = 0;
        this.#censorTimeline!.reset();
    }
  
    switchTrack = (track: string) => {
        try {
            if (this.censorTracks.includes(track)) {
                const video = document.getElementById(this.#videoId) as HTMLVideoElement;
                if (SelfCensor.#isValidVideo(video)) {
                    this.#censorTimeline!.switch(track, video.currentTime);
                } else {
                    throw new Error(`Element with id: ${this.#videoId} is not an HTMLVideoElement, or it doesn't exist`);
                }
            } else {
                throw new Error(`Invalid track. Available tracks are: ${this.censorTracks}`);
            }
        } catch (error) {
            if (this.#eventManager?.active) {
                this.#eventManager.emit('error', { 
                    detail: new Error(`Invalid track. Available tracks are: ${this.censorTracks}`),
                });
            } else {
                throw error;
            }
        }
    }
  
    on(event: EventType, handler: (event: EventObject) => any) {
        if (SelfCensor.#allowedEvents.includes(event.toLowerCase())) {
            if (!this.#eventManager) {
                this.#eventManager = new EventManager();
            }
            this.#eventManager.register(event, handler);
        }
    }
  
    off(event: EventType, handler: (event: EventObject) => any) {
        if (SelfCensor.#allowedEvents.includes(event.toLowerCase())) {
            if (this.#eventManager) {
                this.#eventManager.unregister(event, handler);
                if (!this.#eventManager.active) {
                    this.#eventManager = null;
                }
            }
        }
    }
  
    static #isValidVideo(video: HTMLVideoElement) {
        return video && video.constructor.name === 'HTMLVideoElement';
    };
  
    static #download = async (censorFile: string) => {
        try {
            const response = await fetch(censorFile);
            const censorData: Promise<CensorData> = response.json();
            return censorData;
        } catch (error) {
            throw new Error(`Censor file download failed. Reason: ${(error as Error).message}}`);
        }
    };
  
    static #validate(censorData: CensorData) {
        if (!(censorData.constructor.name === 'Object')) {
            throw new Error('Invalid censor data format');
        }
  
        const entries = Object.entries(censorData);
        if (!entries.length) {
            throw new Error('Empty censor data');
        }
  
        entries.forEach(([censorTrack, segments]) => {
            let previousEnd = 0;
        
            segments.forEach((interval) => {
                if (interval.length < 2) {
                    throw new Error(`Invalid interval: ${JSON.stringify(interval)} in track: ${censorTrack}. Missing start/end timestamp`);
                }
  
                let start, end;
                try {
                    [start, end] = interval.map(Segment.TimeStampToSeconds);
                } catch (error) {
                    throw new Error(`${(error as Error).message}, track: ${censorTrack}, segment: ${JSON.stringify(interval)}`);
                }
  
                if (previousEnd <= start && start < end ) {
                    previousEnd = end;
                } else {
                    const previousEndTimeStamp = Segment.secondsToTimestamp(previousEnd);
                    throw new Error(`Corrupted censor data in track: ${censorTrack}, segment: - ${previousEndTimeStamp} -> ${JSON.stringify(interval)}`);
                }
            });
        });
    };
}

export default SelfCensor;