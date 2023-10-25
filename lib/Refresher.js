const IncomingStream		= require("./IncomingStream");
const IncomingStreamTrack	= require("./IncomingStreamTrack");
const Emitter		= require("medooze-event-emitter");

/**
 * @typedef {Object} RefresherEvents
 * @property {(self: Refresher) => void} stopped
 * @property {(self: Refresher) => void} refreshing A refresh is taking place
 */

/**
 * Periodically request an I frame on all incoming stream or tracks
 * @extends {Emitter<RefresherEvents>}
 */
class Refresher extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(/** @type {number} */ period)
	{
		//Init emitter
		super();

		//No tracks
		this.tracks = /** @type {Set<IncomingStreamTrack>} */ (new Set());
		
		//Listener for stop track events
		this.ontrackstopped = (/** @type {IncomingStreamTrack} */ track) => {
			//Remove from set
			this.tracks.delete(track);
		};

		//Start refreshing
		this.restart(period);
	}

	/**
	 * Restart refreshing interval
	 * @param {Number} period - Refresh period in ms
	 */
	restart(period)
	{
		//Stop previous one
		clearInterval(this.interval);
		//Start the refresh interval
		this.interval = setInterval(()=>{
			//Emit event
			this.emit("refreshing",this);
			//For each track on set
			for (const track of this.tracks)
				//request an iframe
				track.refresh();
		}, period);
	}

	/**
	 * Add stream or track to request 
	 * @param {IncomingStream|IncomingStreamTrack} streamOrTrack 
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
	 * Remove stream or track to request 
	 * @param {IncomingStream|IncomingStreamTrack} streamOrTrack 
	 */
	remove(streamOrTrack)
	{
		//If it is a media stream
		if (streamOrTrack instanceof IncomingStream)
		{
			//Get all video tracks
			for (const track of streamOrTrack.getVideoTracks())
				//Remove it
				this.remove(track);
		//If it is a media stream
		} else if (streamOrTrack instanceof IncomingStreamTrack) {
			//Ensure it is a video one
			if (streamOrTrack.getMedia()==="video")
			{
				//Add to set
				this.tracks.delete(streamOrTrack);
				//Remove it on stop
				streamOrTrack.off("stopped",this.ontrackstopped);
			}
		}
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
		
		this.emit("stopped",this);
		
		//Stop emitter
		super.stop();
			
		//Clean set
		//@ts-expect-error
		this.tracks = null;
	}
}

module.exports = Refresher;
