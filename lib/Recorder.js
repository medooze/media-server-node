const Native		= require("./Native");
const EventEmitter	= require('events').EventEmitter;
const IncomingStream    = require("./IncomingStream");
const RecorderTrack	= require("./RecorderTrack");
const Refresher		= require("./Refresher");
/**
 * MP4 recorder that allows to record several streams/tracks on a single mp4 file
 */
class Recorder
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(filename,params)
	{
		//Check mp4 file name
		if (!filename || !filename.length)
			//Error
			throw new Error("MP4 filename nos specified");
		
		//Create native recorder
		this.recorder = new Native.MP4Recorder();
		//Create file
		this.recorder.Create(filename);
		//Start recording it
		this.recorder.Record(params && params.waitForIntra ? true : false);
		//init track list
		this.tracks = new Set();
		//The track max
		this.maxTrackId = 1;
		
		//If we have to periodically refrhes streams
		if (params && params.refresh)
			//Create new refresher
			this.refresher = new Refresher(params.refresh);
		
		//Create event emitter
		this.emitter = new EventEmitter();
	}
	
	/**
	 * Start recording and incoming
	 * @param {IncomingStream|IncomingStreamTrack} incomingStreamOrTrack - Incomining stream or track to be recordeds
	 * @returns {Array<RecorderTrack>} 
	 */
	record(incomingStreamOrTrack)
	{
		const tracks = [];
		
		//Get all tracks to be recorded
		const incomingStreamTracks = incomingStreamOrTrack instanceof IncomingStream ? incomingStreamOrTrack.getTracks() : [incomingStreamOrTrack];
		
		//If we have any
		if (!incomingStreamTracks.length)
			//Nothing
			return tracks;
		
		//Try to match each ones
		for (let i=0;i<incomingStreamTracks.length;++i)
		{
			//For each encoding
			for (let encoding of incomingStreamTracks[i].encodings.values())
			{
				//Create new track in recorder
				const recorderTrack = new RecorderTrack(this.maxTrackId++,incomingStreamTracks[i],encoding,this.recorder);
				//Listen for stop event
				recorderTrack.once("stopped", ()=>{
					//remove it
					this.tracks.delete(recorderTrack);
				});
				//Push to recorder tracks
				this.tracks.add(recorderTrack);
				//And to the array
				tracks.push(recorderTrack);
			}
			
			//Request first refresh noe
			incomingStreamTracks[i].refresh();
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
	stop()
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
		
		//Close
		this.recorder.Close();
		
		/**
		* Recorder stopped event
		*
		* @name stopped
		* @memberof Recorder
		* @kind event
		* @argument {Recorder}  recorder
		*/
		this.emitter.emit("stopped",this);
		
		//Free
		this.refresher = null;
		this.recorder = null;
	}
	
	
}

module.exports = Recorder;
