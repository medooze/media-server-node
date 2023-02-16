const IncomingStream		= require("./IncomingStream");
const IncomingStreamTrack	= require("./IncomingStreamTrack");
const Emitter		= require("./Emitter");
/**
 * Periodically request an I frame on all incoming stream or tracks
 */
class Refresher extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(period)
	{
		//Init emitter
		super();

		//No tracks
		this.tracks = new Set();
		
		//Listener for stop track events
		this.ontrackstopped = (track) => {
			//Remove from set
			this.tracks.delete(track);
		};

		//Start refreshing
		this.restart(period);
	}

	/**
	 * Restart refreshing interval
	 * @param {Number} timeout - Refresh pedior in ms
	 */
	restart(period)
	{
		//Stop previous one
		clearInterval(this.interval);
		//Start the refresh interval
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
		}, period);
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
	 * Remove stream or track to request 
	 * @param {IncomintgStream|IncomingStreamTrack} streamOrTrack 
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
		
		/**
		* Refresher stopped event
		* 
		* @name stopped
		* @memberof Refresher
		* @kind event
		* @argument {Refresher}  refresher
		*/
		this.emitter.emit("stopped",this);
		
		//Stop emitter
		super.stop();
			
		//Clean set
		this.tracks = null;
	}
}

module.exports = Refresher;