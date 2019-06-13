const Native		= require("./Native");
const EventEmitter	= require('events').EventEmitter;

/**
 * Track of the recorder associated to an incoming strem track
 */
class RecorderTrack
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(id,track,encoding,recorder)
	{
		//Store track info
		this.id		= id;
		this.track	= track;
		this.encoding	= encoding;
		this.recorder	= recorder;
		//Not muted
		this.muted = false;
		
		//Start listening for frames
		this.encoding.depacketizer.AddMediaListener(this.recorder);

		//Create event emitter
		this.emitter = new EventEmitter();
		
		//Listener for stop track events
		this.onTrackStopped = () => {
			//stop recording
			this.stop();
		};
		
		//Listen for track stop event
		this.track.once("stopped", this.onTrackStopped);
	}
	
	/**
	* Get recorder track id
	*/
	getId()
	{
		return this.id;
	}
	
	/**
	* Get incoming stream track 
	* @returns {IncomingStreamTrack} 
	*/
	getTrack()
	{
		return this.track;
	}
	
	/**
	* Get incoming encoding
	* @returns {Object} 
	*/
	getEncoding()
	{
		return this.encoding;
	}
	
	/**
	 * Check if the track is muted or not
	 * @returns {boolean} muted
	 */
	isMuted()
	{
		return this.muted;
	}
	
	/*
	 * Mute/Unmute track
	 * This operation will not change the muted state of the stream this track belongs too.
	 * @param {boolean} muting - if we want to mute or unmute
	 */
	mute(muting) 
	{
		//If we are different
		if (this.muted!==muting)
		{
			//Check what are we doing
			if (muting) {
				//Stop listening for frames
				this.encoding.depacketizer.RemoveMediaListener(this.recorder);
			}else {
				//Start listening for frames
				this.encoding.depacketizer.AddMediaListener(this.recorder);
				//Request a refresh on the track
				this.track.refresh();
			}
				
			//Store it
			this.muted = muting;
			
			/**
			* Transponder muted event
			*
			* @name muted
			* @memberof Transponder
			* @kind event
			* @argument {Transponder}  transponder
			*/
			this.emitter.emit("muted",this.muted);
		}
	}
	
	/**
	 * Add event listener
	 * @param {String} event	- Event name 
	 * @param {function} listener	- Event listener
	 * @returns {RecorderTrack} 
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
	 * @returns {RecorderTrack} 
	 */
	off() 
	{
		//Delegate event listeners to event emitter
		return this.emitter.removeListener.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Stop recording this track
	 */
	stop()
	{
		//Don't call it twice
		if (!this.track) return;
		
		//Stop listening for frames
		this.encoding.depacketizer.RemoveMediaListener(this.recorder);
		
		//Remove listener
		this.track.off("stopped",this.onTrackStopped);
		
		/**
		* OutgoingStreamTrack stopped event
		*
		* @name stopped
		* @memberof RecorderTrack
		* @kind event
		* @argument {RecorderTrack}  recorderTrack
		*/
		this.emitter.emit("stopped",this);
		
		//Remove track
		this.track = null;
		this.encoding = null;
		this.recorder = null;
	}
	
}

module.exports = RecorderTrack;
