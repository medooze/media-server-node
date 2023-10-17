const Native	= require("./Native");
const Emitter	= require("medooze-event-emitter");

/**
 * Track of the recorder associated to an incoming strem track
 */
class RecorderTrack extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(id,track,depacketizer,recorder)
	{
		//Init emitter
		super();

		//Store track info
		this.id			= id;
		this.track		= track;
		this.depacketizer	= depacketizer;
		this.recorder		= recorder;
		//Not muted
		this.muted = false;
		
		//Start listening for frames
		this.depacketizer.AddMediaListener(this.recorder.toMediaFrameListener());

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
	 * Check if the track is muted or not
	 * @returns {boolean} muted
	 */
	isMuted()
	{
		return this.muted;
	}
	
	/**
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
				this.depacketizer.RemoveMediaListener(this.recorder);
			}else {
				//Start listening for frames
				this.depacketizer.AddMediaListener(this.recorder);
				//Request a refresh on the track
				this.track.refresh();
			}
				
			//Store it
			this.muted = muting;
			
			this.emit("muted",this.muted);
		}
	}
	
	/**
	 * Stop recording this track
	 */
	stop()
	{
		//Don't call it twice
		if (!this.track) return;
		
		//Stop listening for frames
		this.depacketizer.RemoveMediaListener(this.recorder.toMediaFrameListener());
		
		//Remove listener
		this.track.off("stopped",this.onTrackStopped);
		
		this.emit("stopped",this);
		
		//Stop emitter
		super.stop();
		
		//Remove track
		this.track = null;
		this.depacketizer = null;
		this.recorder = null;
	}
	
}

module.exports = RecorderTrack;
