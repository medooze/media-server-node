const IncomingStream		= require("./IncomingStream");
const IncomingStreamTrack	= require("./IncomingStreamTrack");
const EventEmitter		= require('events').EventEmitter;
/**
 * Periodically request an I frame on all incoming stream or tracks
 */
class Refresher
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(period)
	{
		//No tracks
		this.tracks = new Set();
		
		//Create event emitter
		this.emitter	= new EventEmitter();
		
		//The refresh interval
		this.interval = setInterval(()=>{
			/**
			* Refresher event to indicate that refesh is taking place
			*
			* @name refreshing
			* @memberof Refresher
			* @kind event
			* @argument {Refresher}  refreser
			*/
			//Emit event
			this.emitter.emit("refreshing",this);
			//For each track on set
			for (const track of this.tracks)
				//request an iframe
				track.refresh();
		},period);
		
		//Listener for stop track events
		this.ontrackstopped = (track) => {
			//Remove from set, but check that it exists as event might be fired after stop()
			this.tracks && this.tracks.delete(track);
		};
	}

	/**
	 * Add stream or track to request 
	 * @param {IncomintgStream|IncomingStreamTrack} streamOrTrack 
	 */
	add(streamOrTrack)
	{
		//If it is a media stream
		if (streamOrTrack instanceof IncomingStream)
		{
			//Get all video tracks
			for (const track of streamOrTrack.getVideoTracks())
				//Add it
				this.add(track);
		//If it is a media stream
		} else if (streamOrTrack instanceof IncomingStreamTrack) {
			//Ensure it is a video one
			if (streamOrTrack.getMedia()==="video")
			{
				//Add to set
				this.tracks.add(streamOrTrack);
				//Remove it on stop
				streamOrTrack.once("stopped",this.ontrackstopped);
			}
		}
	}
	
	/**
	 * Add event listener
	 * @param {String} event	- Event name 
	 * @param {function} listener	- Event listener
	 * @returns {IncomingStream} 
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
	 * @returns {OutgoingStream} 
	 */
	off() 
	{
		//Delegate event listeners to event emitter
		this.emitter.removeListener.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}

	/**
	 * Stop refresher
	 */
	stop()
	{
		//Stop interval
		clearInterval(this.interval);
		
		//For each track on set
		for (const track of this.tracks)
			//Remove stop edevent
			track.off("stopped",this.ontrackstopped);
		
		/**
		* Refresher stopped event
		* 
		* @name stopped
		* @memberof Refresher
		* @kind event
		* @argument {Refresher}  refresher
		*/
		this.emitter.emit("stopped",this);
			
		//Clean set
		this.tracks = null;
	}
}

module.exports = Refresher;
