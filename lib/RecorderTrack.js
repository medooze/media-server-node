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
	constructor(id,track,encoding)
	{
		//Store track info
		this.id		= id;
		this.track	= track;
		this.encoding	= encoding;

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
	}
	
}

module.exports = RecorderTrack;