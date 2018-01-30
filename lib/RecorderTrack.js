const Native		= require("./Native");
const EventEmitter	= require('events').EventEmitter;

/**
 * Track of the recorder associated to an incoming strem track
 */
class RecorderTrack
{
	constructor(id,track,encoding)
	{
		//Store track info
		this.id		= id;
		this.track	= track;
		this.encoding	= encoding;

		//Create event emitter
		this.emitter = new EventEmitter();
		//Listen for track stop event
		this.track.on("stopped", () => {
			//stop recording
			this.stop();
		});
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
		
		/**
		* OutgoingStreamTrack stopped event
		*
		* @event OutgoingStreamTrack#stopped
		* @type {object}
		*/
		this.emitter.emit("stopped");
		
		//Remove track
		this.track = null;
		this.encoding = null;
	}
	
}

module.exports = RecorderTrack;