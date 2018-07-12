const IncomingStream		= require("./IncomingStream");
const IncomingStreamTrack	= require("./IncomingStreamTrack");
const EventEmitter		= require('events').EventEmitter;
/**
 * Periodically request an I frame on all incoming stream or tracks
 */
class Refresher
{
	/**
	 * Constructor
	 * @param {type} period
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
			* @event Refresher#activespeakerchanged
			* @type {object}
			*/
			//Emit event
			this.emitter.emit("refreshing");
			//For each track on set
			for (const track of this.tracks)
				//request an iframe
				track.refresh();
		},period);
		
		//Listener for stop track events
		this.ontrackstopped = (track) => {
			//Remove from set
			this.tracks.delete(track);
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
			
		//Clean set
		this.tracks = null;
	}
}

module.exports = Refresher;