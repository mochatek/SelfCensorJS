import Segment from './segment';
import TimeLine from './timeline';
import EventManager from './eventManager';

type State = 'STARTED' | 'RUNNING' | 'PAUSED' | 'STOPPED';
type EventType = 'READY' | 'ERROR';
type EventObject = { detail: any };
type CensorData = ConstructorParameters<typeof TimeLine>[0];

/**
 * API of the library for performing the video censoring
 */
class SelfCensor {
    static #allowedEvents = ['ready', 'error'];
  
    #videoId: string;
    #censorTimeline: TimeLine | null;
    #eventManager: EventManager | null;
    #forceSeek: boolean;
    #state: State;
    #censorTracks: string[];
  
    /**
     * Initializes the censoring service. videoId is the ID of the HTML video element.
     * If initialized on an invalid video, then it will throw an error.
     */
    constructor(videoId: string) {
        this.#videoId = videoId
        this.#censorTimeline = null;
        this.#eventManager = null;
        this.#forceSeek = false;
        this.#state = 'STOPPED';
        this.#censorTracks = [];
    
        const video =  document.getElementById(this.#videoId) as HTMLVideoElement;
        if (!SelfCensor.#isValidVideo(video)) {
            throw new Error(`Element with id: ${this.#videoId} is not an HTMLVideoElement, or it doesn't exist`);
        }
    }

    /**
     * Returns the current state of the censoring service
     */
    get state() {
        return this.#state;
    }
  
    /**
     * Starts the censoring service.
     * Validates the target video element and then proceed to initialize the censoring service.
     * Sets state to STARTED.
     * Checks the ready state of the video. If it is already loaded, then directly initializes the service.
     * Otherwise the initialization occurs after the metadata of the video is loaded. 
     * If the service is active (STARTED/RUNNING/PAUSED), then calling this method will not have any effect.
     */
    start() {
        if (this.#state === 'STOPPED') {
            const video =  document.getElementById(this.#videoId) as HTMLVideoElement;
            if (SelfCensor.#isValidVideo(video)) {
                this.#state = 'STARTED';
                if (video.readyState === 4) {
                    this.#init(video);
                } else {
                    video.addEventListener('loadedmetadata', () => this.#init(video), { once: true })
                }
            } else {
                throw new Error(`Element with id: ${this.#videoId} is not an HTMLVideoElement, or it doesn't exist`);
            }
        }
    }
  
    /**
     * Stops the censoring service. Removes all the attached listeners.
     * Free up the internal services and set the state to STOPPED.
     * If the service is inactive (STARTED/STOPPED), then calling this method will not have any effect.
     */
    stop() {
        if (['RUNNING', 'PAUSED'].includes(this.#state)) {
            const video =  document.getElementById(this.#videoId) as HTMLVideoElement;
            if (SelfCensor.#isValidVideo(video)) {
                video.removeEventListener('seeked', this.#seekCensorTimeline);
                video.removeEventListener('timeupdate', this.#processFrame);
                video.removeEventListener('ended', this.#resetService);
            }
            this.#censorTimeline = null;
            this.#eventManager = null;
            this.#forceSeek = false;
            this.#censorTracks = [];
            this.#state = 'STOPPED';
        }
    }
  
    /**
     * Extract the url of the censor file from the data-censor attribute of the video element.
     * Download and validate the censor data from the censor file.
     * Initialize the censor timeline as per the current time of the video.
     * Set the tracks available for the video.
     * Attach the listeners on the video, which are required for the censoring service.
     * Set the state to 'RUNNING' and emit the ready event from the service.
     * The ready event data will contain the current track name and list of available tracks
     * on the detail property. If any error occurred during this process, it is emitted from the service.
     */
    #init = async (video: HTMLVideoElement) => {
        if (video?.duration) {
            const censorFile = video.dataset['censor']
            if (censorFile) {
                try {
                    const censorData = await SelfCensor.#download(censorFile);
                    SelfCensor.#validate(censorData);
                    this.#censorTimeline = new TimeLine(censorData, video.currentTime);
                    this.#censorTracks = Object.keys(censorData);
                    video.addEventListener('seeked', this.#seekCensorTimeline);
                    video.addEventListener('timeupdate', this.#processFrame);
                    video.addEventListener('ended', this.#resetService);
                    this.#state = 'RUNNING';
                    this.#emit('READY',  {
                        censorTracks: [...this.#censorTracks],
                        currentTrack: this.#censorTimeline.currentTrack,
                    });
                } catch (error) {
                    this.#emit('ERROR', error);
                }
            }
        }
    }
  
    /**
     * Seeks the censor timeline along with the seeked video time.
     * This is done only when user seeked the video from the UI.
     * The forceSeek field will be true whenever the censor service seeks the video time.
     */
    #seekCensorTimeline = (event: Event) => {
        if (this.#state === 'RUNNING') {
            const video = event.target as HTMLVideoElement;
            if (!this.#forceSeek) {
                this.#censorTimeline!.seek(video.currentTime);
            } else {
                this.#forceSeek = false;
            }
        }
    }
  
    /**
     * The heart of the library where the censoring actually happens.
     * Get the current time of the video. Retrieve the current segment from the timeline.
     * If the current time falls in the current segment, then skip the video to the end of
     * that segment. Set the forSeek field to true before skipping in order to suppress
     * the seek event processing (seekCensorTimeline). Advance the timeline to the next segment
     * after video is skipped.
     */
    #processFrame = (event: Event) => {
        if (this.#state === 'RUNNING') {
            const video = event.target as HTMLVideoElement;
            const { currentTime } = video;
            const currentSegment = this.#censorTimeline!.currentSegment;
            
            if (currentSegment && currentSegment.includes(currentTime)) {
                this.#forceSeek = true;
                video.currentTime = currentSegment.end;
                this.#censorTimeline!.advance();
            }
        }
    }
  
    /**
     * Resets the video and censoring timeline to the beginning.
     */
    #resetService = (event: Event) => {
        if (this.#state === 'RUNNING') {
            const video = event.target as HTMLVideoElement;
            video.currentTime = 0;
            this.#censorTimeline!.reset();
        }
    }

    /**
     * Temporarily pauses censoring it service is active.
     */
    pause() {
        if (this.#state === 'RUNNING') {
            this.#state = 'PAUSED';
        }
    }

    /**
     * Resumes censoring if it was paused.
     * While resuming the service, if the target video is invalid, then the service is stopped.
     */
    resume() {
        if (this.#state === 'PAUSED') {
            const video =  document.getElementById(this.#videoId) as HTMLVideoElement;
            if (SelfCensor.#isValidVideo(video)) {
                this.#censorTimeline?.seek(video.currentTime);
                this.#state = 'RUNNING';
            } else {
                this.stop();
            }
        }
    }
  
    /**
     * Validates the video and switches the censor track to the supplied track
     * only if such a track is available. Otherwise it results in an error during which
     * the registered listeners are notified through the 'error' event, if event manager is active.
     * Otherwise the error is thrown.
     * If the service is inactive (STARTED/STOPPED), then calling this method will not have any effect.
     */
    switchTrack = (track: string) => {
        if (['RUNNING', 'PAUSED'].includes(this.#state)) {
            try {
                if (this.#censorTracks.includes(track)) {
                    const video = document.getElementById(this.#videoId) as HTMLVideoElement;
                    if (SelfCensor.#isValidVideo(video)) {
                        this.#censorTimeline!.switch(track, video.currentTime);
                    } else {
                        throw new Error(`Element with id: ${this.#videoId} is not an HTMLVideoElement, or it doesn't exist`);
                    }
                } else {
                    throw new Error(`Invalid track. Available tracks are: ${this.#censorTracks}`);
                }
            } catch (error) {
                this.#emit('ERROR', error);
            }
        }
    }
  
    /**
     * Registers the listener for the event in th event manager, if that event is allowed.
     * Instantiates the event manager only if at least one listener is attached.
     */
    on(event: EventType, handler: (event: EventObject) => any) {
        if (SelfCensor.#allowedEvents.includes(event.toLowerCase())) {
            if (!this.#eventManager) {
                this.#eventManager = new EventManager();
            }
            this.#eventManager.register(event, handler);
        }
    }
  
    /**
     * Un-registers the listener attached to the event, if that event is allowed.
     * Destroys the event manager if it is inactive after the un-registration.
     */
    off(event: EventType, handler: (event: EventObject) => any) {
        if (SelfCensor.#allowedEvents.includes(event.toLowerCase())) {
            if (this.#eventManager) {
                this.#eventManager.unregister(event, handler);
                if (!this.#eventManager.isActive()) {
                    this.#eventManager = null;
                }
            }
        }
    }

    /**
     * Wrapper method around the emit method of event manager.
     * Notifies all registered listeners of the event. Event payload is an object
     * which contain the data on the details attribute. In case of error event,
     * the error is thrown if it doesn't have any subscribers.
     */
    #emit(event: EventType, detail: any) {
        if (event === 'ERROR') {
            if (this.#eventManager?.isActive('error')) {
                this.#eventManager.emit('error', { detail });
            } else {
                throw detail;
            }
        } else if (event === 'READY') {
            this.#eventManager?.emit('ready', { detail });
        }
    }
  
    /**
     * Validates the existence of the target video element in DOM
     */
    static #isValidVideo(video: HTMLVideoElement) {
        return video && video.constructor.name === 'HTMLVideoElement';
    };
  
    /**
     * Downloads the censor data from the source file (JSON).
     * If the source is invalid or data is not JSON, it will throw error.
     */
    static #download = async (censorFile: string) => {
        try {
            const response = await fetch(censorFile);
            const censorData: Promise<CensorData> = response.json();
            return censorData;
        } catch (error) {
            throw new Error(`Censor file download failed. Reason: ${(error as Error).message}}`);
        }
    };
  
    /**
     * Validation for the censor data.
     *   - Must be a JSON object with at least 1 track and the segments must be an array of intervals.
     *   - Segment array can be empty meaning no segment is to be skipped in that track.
     *   - If track is not empty, then all segment in that track must be an interval.
     *   - Interval must have 2 values and that must be the start and end timestamp, where start < end.
     *   - Segments in the track must be in increasing order of time.
     */
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

            if (segments.constructor.name !== 'Array') {
                throw new Error(`Unsupported segments type encountered in track: ${censorTrack}. Segments must be an array of intervals to be skipped`)
            }
        
            segments.forEach((segment, index) => {
                if (segment.length < 2) {
                    throw new Error(`Invalid segment: ${JSON.stringify(segment)} in track: ${censorTrack}. Missing start/end timestamp`);
                }
  
                let start, end;
                try {
                    [start, end] = segment.map(Segment.TimeStampToSeconds);
                } catch (error) {
                    throw new Error(`${(error as Error).message}, track: ${censorTrack}, segment: ${JSON.stringify(segment)}`);
                }
  
                if (previousEnd <= start) {
                    if (start < end) {
                        previousEnd = end;
                    } else {
                        throw new Error(`Invalid segment: ${JSON.stringify(segment)} in track: ${censorTrack}. Start must be < End`);
                    }
                } else {
                    throw new Error(`Corrupted segments: ${JSON.stringify(segments[index-1])} -> ${JSON.stringify(segment)} in track: ${censorTrack}. Segments must be in increasing order`);
                }
            });
        });
    };
}

export default SelfCensor;