const Native			= require("./Native");
const EventEmitter		= require('events').EventEmitter;
const SemanticSDP		= require("semantic-sdp");
const IncomingStreamTrack	= require("./IncomingStreamTrack");

const TrackInfo			= SemanticSDP.TrackInfo;

/**
 * MP4 recorder that allows to record several streams/tracks on a single mp4 file
 */
class Player
{
	constructor(filename)
	{
		//Check mp4 file name
		if (!filename || !filename.length)
			//Error
			throw new Error("MP4 filename nos specified");
		
		//Create native recorder
		this.player = new Native.PlayerFacade(this);
		
		//Open file
		if (!this.player.Open(filename))
			//Error
			throw new Error("MP4 filenamec could not be opened");
		
		//init track list
		this.tracks = new Map();
		
		//Check if player has video track
		if (this.player.HasVideoTrack())
		{
			//Fake track id
			const trackId = "video";
			
			//Get audio source
			const source = this.player.GetVideoSource();
			
			//Create new track
			const incomingStreamTrack = new IncomingStreamTrack("video",trackId,null,[source]);
			
			//Add listener
			incomingStreamTrack.once("stopped",()=>{
				//REmove from map
				this.tracks.delete(trackId);
			});
			//Add it to map
			this.tracks.set(trackId,incomingStreamTrack);
		} 
		
		//If it has audio
		if (this.player.HasAudioTrack())
		{
			//Fake track id
			const trackId = "audio";
			
			//Get audio source
			const source = this.player.GetAudioSource();
			
			//Create new track
			const incomingStreamTrack = new IncomingStreamTrack("audio",trackId,null,[source]);
			
			//Add listener
			incomingStreamTrack.once("stopped",()=>{
				//REmove from map
				this.tracks.delete(trackId);
			});
			//Add it to map
			this.tracks.set(trackId,incomingStreamTrack);
		}
		//Create event emitter
		this.emitter = new EventEmitter();
		
		//Listener for player facade events
		this.onended = () => {
			//If we have to loop
			if (this.repeat)
			{
				//REstart rtp stugg
				this.player.Reset();
				//Start from the befiging
				this.seek(0);
				//DO nothing more
				return;
			}
			
			/**
			* Playback ended event
			*
			* @event Player#ended
			* @type {Player}
			*/
			this.emitter.emit("ended",this);
	};
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
	 * @returns {IncomingStream} 
	 */
	off() 
	{
		//Delegate event listeners to event emitter
		this.emitter.removeListener.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Get all the tracks
	* @returns {Array<IncomingStreamTrack>}	- Array of tracks
	 */
	getTracks() 
	{
		//Return a track array
		return Array.from(this.tracks.values());
	}
	/**
	 * Get an array of the media stream audio tracks
	 * @returns {Array<IncomingStreamTrack>}	- Array of tracks
	 */
	getAudioTracks() 
	{
		var audio = [];
		
		//For each track
		for (let track of this.tracks.values())
			//If it is an video track
			if(track.getMedia().toLowerCase()==="audio")
				//Append to tracks
				audio.push(track);
		//Return all tracks
		return audio;
	}
	
	/**
	 * Get an array of the media stream video tracks
	 * @returns {Array<IncomingStreamTrack>}	- Array of tracks
	 */
	getVideoTracks() 
	{
		var video = [];
		
		//For each track
		for (let track of this.tracks.values())
			//If it is an video track
			if(track.getMedia().toLowerCase()==="video")
				//Append to tracks
				video.push(track);
		//Return all tracks
		return video;
	}

	/**
	 * Starts playback
	 * @param {Object} params	
	 * @param {Object} params.repeat - Repeat playback when file is ended
	 */
	play(params)
	{
		//Get params
		this.repeat = params && params.repeat;
		//Start playback
		return this.player.Play();
	}
	
	/**
	 * Resume playback
	 */
	resume()
	{
		return this.player.Play();
	}
	
	/**
	 * Pause playback
	 */
	pause()
	{
		return this.player.Stop();
	}
	
	/**
	 * Start playback from given time
	 * @param {Number} time - in miliseconds
	 */
	seek(time)
	{
		return this.player.Seek(time);
	}
	
	/**
	 * Stop playing and close file
	 */
	stop()
	{
		//Don't call it twice
		if (!this.player) return;
		
		//Stop all streams it will detach them
		for (let track of this.tracks.values())
			//Stop track
			track.stop();
		
		//Clear tracks jic
		this.tracks.clear();
		
		//Close
		this.player.Close();
		
		/**
		* Player stopped event
		*
		* @event Player#stopped
		* @type {Player}
		*/
		this.emitter.emit("stopped",this);
		
		//Free
		this.player = null;
	}
	
	
}

module.exports = Player;