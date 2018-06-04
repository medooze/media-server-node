const Native		= require("./Native");
const EventEmitter	= require('events').EventEmitter;

/**
 * ActiveSpeakerDetector accumulate received voice activity and fires an event when it changes
 */
class ActiveSpeakerDetector
{
	constructor()
	{
		//Create event emitter
		this.emitter	= new EventEmitter();
		
		//List of the tracks associated to the speakers
		this.tracks = new Map();
		
		//Create native detector
		this.detector = new Native.ActiveSpeakerDetectorFacade(this);
		
		//Listen for speaker changes		
		this.onactivespeakerchanged = (ssrc) => {
			//Emit event
			this.emitter.emit("onactivespeakerchanged",this.tracks.get(ssrc));
		};
		
		//The listener for attached tracks end event
		this.onTrackStopped = (track) => {
			//Get first source
			const source = track.encodings.values().next().value.source;
			//Check source
			if (source)
				//Delete from track list
				this.tracks.delete(source.media.ssrc);
		};	
	}
	
	/**
	 * Set minimum period between active speaker changes
	 * @param {Number} minChangePeriod
	 */
	setMinChangePeriod(minChangePeriod)
	{
		this.detector.SetMinChangePeriod(minChangePeriod);
	}
	
	/**
	 * Add incoming track for speaker detection
	 * @param {IncomingStreamTrakc} track
	 */
	addSpeaker(track) 
	{
		console.dir(track.encodings);
		//Get first source
		const source = track.encodings.values().next().value.source;
		//Check source
		if (!source)
			//Error
			throw new Error("Could not find ssrc for track");
		//Store source ssrc
		this.tracks.set(source.media.ssrc,track);
		//Start listening to it
		this.detector.AddIncomingSourceGroup(source);
		
		//Listen for stop events
		track.once("stopped", this.onTrackStopped);
		
	}
	
	/**
	 * Remove track from speaker detection
	 * @param {IncomingStreamTrakc} track
	 */
	removeSpeaker(track) 
	{
		//Get first source
		const source = track.encodings.values().next().value.source;
		//Check source
		if (!source)
			//Error
			throw new Error("Could not find sourc for track");
		//Store source ssrc
		this.tracks.delete(source.media.ssrc);
		//Stop listening to it
		this.detector.RemoveIncomingSourceGroup(source);
	}
	
	
	/**
	 * Add event listener
	 * @param {String} event	- Event name 
	 * @param {function} listener	- Event listener
	 * @returns {IncomingStreamTrack} 
	 */
	on() 
	{
		//Delegate event listeners to event emitter
		this.emitter.on.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Add event listener once
	 * @param {String} event	- Event name 
	 * @param {function} listener	- Event listener
	 * @returns {IncomingStream} 
	 */
	once() 
	{
		//Delegate event listeners to event emitter
		this.emitter.once.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Remove event listener
	 * @param {String} event	- Event name 
	 * @param {function} listener	- Event listener
	 * @returns {IncomingStreamTrack} 
	 */
	off() 
	{
		//Delegate event listeners to event emitter
		this.emitter.removeListener.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Stop this transponder, will dettach the OutgoingStreamTrack
	 */
	stop()
	{
		//Stop listening on any track
		for (const track of this.tracks.values())
		{
			//Get first source
			const source = track.encodings.values().next().value.source;
			//Check source
			if (source)
				//Stop listening to it
				this.detector.RemoveIncomingSourceGroup(source);
			//Stopp listening events
			track.once("stopped", this.onTrackStopped);
		}
		
		//Clear tracks
		this.tracks.clear();
		
		/**
		* ActiveSpeakerDetector stopped event
		*
		* @event ActiveSpeakerDetector#stopped
		* @type {object}
		*/
		this.emitter.emit("stopped");
		
		//Remove native reference, so destructor is called on GC
		this.detector = null;
	}
	
};


module.exports = ActiveSpeakerDetector;