const Native		= require("./Native");
const Emitter		= require("./Emitter");
const IncomingStream    = require("./IncomingStream");
const RecorderTrack	= require("./RecorderTrack");
const Refresher		= require("./Refresher");
/**
 * MP4 recorder that allows to record several streams/tracks on a single mp4 file
 */
class Recorder extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(filename,params)
	{
		//Init emitter
		super();

		//Store params
		this.params = Object.assign({},params);
		
		//Check mp4 file name
		if ((!filename || !filename.length) && !this.params.timeShift)
			//Error
			throw new Error("MP4 filename nos specified");
		
		//Store filename
		this.filename = filename;
	
		//Create native recorder
		this.recorder = new Native.MP4RecorderFacadeShared(this);
		
		//Check if not doing a time shifted recording
		if (!this.params.timeShift)
		{
			//Create file
			this.recorder.Create(this.filename);
			//Start recording it now
			this.recorder.Record(!!this.params.waitForIntra,!!this.params.disableHints);
			//Recording
			this.recording = true;
			//recording start time
			this.startTime = new Date();
		} else {
			//Set timeshift
			this.recorder.SetTimeShiftDuration(parseInt(this.params.timeShift));
		}
			
		//init track list
		this.tracks = new Set();
		//The track max
		this.maxTrackId = 1;
		
		//If we have to periodically refrhes streams
		if (this.params.refresh)
			//Create new refresher
			this.refresher = new Refresher(this.params.refresh);
		
		//Listener for player facade events
		this.onstarted = (timestamp) => {
			/**
			* Recorder started event. This event will be triggered when the first media frame is being recorded.
			*
			* @name started
			* @memberof Recorder
			* @kind event
			* @argument {Recorder}  recorder
			* @argument {Number}  timestamp - Timestamp of the first frame in milliseconds
			*/
			this.emitter.emit("started",this,timestamp);
		};
	}
	
	/**
	 * Get recording filename
	 * @returns {String} 
	 */
	getFilename()
	{
		return this.filename;
	}
	
	/**
	 * Get recording filename
	 * @returns {Date} 
	 */
	getStartTime()
	{
		return this.startTime;
	}
	
	/**
	 * Is the recording time shifted?
	 * @returns {Boolean} 
	 */
	isTimeShifted()
	{
		return !!this.params.timeShift;
	}
	
	/**
	 * Start recording time shiftt buffer. 
	 * @param {String} filename - Override filename [Optional]
	 */
	flush(filename)
	{
		//Chcek not already recording
		if (this.recording)
			return;
		
		//Check mp4 file name
		if (filename && filename.length)
			//store new one
			this.filename = filename;
		
		//Create file
		this.recorder.Create(this.filename);
		//Start recording it now
		this.recorder.Record(!!this.params.waitForIntra,!!this.params.disableHints);
		//Recording
		this.recording = true;
		//recording start time
		this.startTime = new Date();
	}
	
	/**
	 * Start recording and incoming
	 * @param {IncomingStream|IncomingStreamTrack} incomingStreamOrTrack - Incomining stream or track to be recordeds
	 * @returns {Array<RecorderTrack>} 
	 */
	record(incomingStreamOrTrack, options)
	{
		const tracks = [];

		//Set defaults
		options = Object.assign({
			multitrack: true
		}, options);

		//Get all tracks to be recorded
		const incomingStreamTracks = incomingStreamOrTrack instanceof IncomingStream ? incomingStreamOrTrack.getTracks() : [incomingStreamOrTrack];
		
		//If we have any
		if (!incomingStreamTracks.length)
			//Nothing
			return tracks;
		
		//Try to match each ones
		for (let i=0;i<incomingStreamTracks.length;++i)
		{
			//Get incoming stream track
			const incomingStreamTrack = incomingStreamTracks[i];
			//Check if it has out of band h264 parameters
			if (incomingStreamTrack.hasH264ParameterSets && incomingStreamTrack.hasH264ParameterSets())
				//TODO: Support H264 parameter sets per track instead of per recorder
				this.recorder.SetH264ParameterSets(incomingStreamTrack.getH264ParameterSets());
			//If doing multitrack
			if (options.multitrack)
			{
				//For each encoding
				for (let encoding of incomingStreamTracks[i].encodings.values())
				{
					//Create new track in recorder
					const recorderTrack = new RecorderTrack(this.maxTrackId++, incomingStreamTrack, encoding.depacketizer, this.recorder);
					//Listen for stop event
					recorderTrack.once("stopped", () =>
					{
						//remove it
						this.tracks.delete(recorderTrack);
					});
					//Push to recorder tracks
					this.tracks.add(recorderTrack);
					//And to the array
					tracks.push(recorderTrack);
				}
			}
			else
			{
				//Create new track in recorder
				const recorderTrack = new RecorderTrack(this.maxTrackId++, incomingStreamTrack, incomingStreamTrack.depacketizer, this.recorder);
				//Listen for stop event
				recorderTrack.once("stopped", () =>
				{
					//remove it
					this.tracks.delete(recorderTrack);
				});
				//Push to recorder tracks
				this.tracks.add(recorderTrack);
				//And to the array
				tracks.push(recorderTrack);
			}
			
			//Request first refresh noe
			incomingStreamTrack.refresh();
		}

		//If we need to periodically refresh
		if (this.refresher)
			//Do the refresh on the stream periodically
			this.refresher.add(incomingStreamOrTrack);
		
		//Return all the added tracks
		return tracks;
	}
	
	/**
	 * Mute/Unmute all tracks
	 * This operation will not change the muted state of the stream this track belongs too.
	 * @param {boolean} muting - if we want to mute or unmute
	 */
	mute(muting) 
	{
		//For each track
		for (let track of this.tracks.values())
			//Mute track
			track.mute(muting);
	}

	/**
	 * Stop recording and close file. NOTE: File will be flsuh async,
	 * @returns {undefined} -  TODO: return promise when flush is ended
	 */
	async stop()
	{
		//Don't call it twice
		if (!this.recorder) return;
		
		//Stop all streams it will detach them
		for (let track of this.tracks.values())
			//Stop track
			track.stop();
		
		//Stop refresher
		this.refresher && this.refresher.stop();
		
		//Clear tracks jic
		this.tracks.clear();
		
		//Call async
		await new Promise((resolve)=>{
			//Create close handler that resolves the promise
			this.onclosed = resolve;
			//Close it
			this.recorder.Close();
		});
		
		/**
		* Recorder stopped event
		*
		* @name stopped
		* @memberof Recorder
		* @kind event
		* @argument {Recorder}  recorder
		*/
		this.emitter.emit("stopped",this);

		//Stop emitter
		super.stop();
		
		//Free
		this.refresher = null;
		this.recorder = null;
	}
	
	
}

module.exports = Recorder;
