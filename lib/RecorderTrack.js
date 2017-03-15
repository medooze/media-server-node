const native = require("../build/Release/medooze-media-server");
const EventEmitter	= require('events').EventEmitter;

/**
 * Track of the recorder associated to an incoming strem track
 */
class RecorderTrack
{
	constructor(id,track, listener)
	{
		//Store track info
		this.id		= id;
		this.track	= track;
		this.listener   = listener;
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
	getMedia()
	{
		return this.track;
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
		//Remove track
		this.track = null;
		
		/**
		* OutgoingStreamTrack stopped event
		*
		* @event OutgoingStreamTrack#stopped
		* @type {object}
		*/
		this.emitter.emit("stopped");
		
		//Remove native reference, so destructor is called on GC
		this.listener = null;
	}
	
}

module.exports = RecorderTrack;