const Native		= require("./Native");
const EventEmitter	= require('events').EventEmitter;
const SemanticSDP	= require("semantic-sdp");
const IncomingStreamTrack	= require("./IncomingStreamTrack");

const TrackInfo		= SemanticSDP.TrackInfo;

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
		this.player = new Native.PlayerFacade();
		//Open file
		if (!this.player.Open(filename))
			//Error
			throw new Error("MP4 filenamec could not be opened");
		
		//init track list
		this.tracks = new Map();
		
		//Check if player has video track
		if (this.player.HasVideoTrack())
		{
			//Get audio source
			const source = this.player.GetVideoSource();
			
			//Create track info
			const track = new TrackInfo("video","video");
			
			//Create new track
			const incomingStreamTrack = new IncomingStreamTrack(null,track,[source]);
			
			//Add listener
			incomingStreamTrack.on("stop",()=>{
				//REmove from map
				this.tracks.delete(track.getId());
			});
			//Add it to map
			this.tracks.set(track.getId(),incomingStreamTrack);
		} 
		
		//If it has audio
		if (this.player.HasAudioTrack())
		{
			//Get audio source
			const source = this.player.GetAudioSource();
			
			//Create track info
			const track = new TrackInfo("audio","audio");
			
			//Create new track
			const incomingStreamTrack = new IncomingStreamTrack(null,track,[source]);
			
			//Add listener
			incomingStreamTrack.on("stop",()=>{
				//REmove from map
				this.tracks.delete(track.getId());
			});
			//Add it to map
			this.tracks.set(track.getId(),incomingStreamTrack);
		}
		//Create event emitter
		this.emitter = new EventEmitter();
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
	
	play()
	{
		return this.player.Play();
	}
	
	pause()
	{
		return this.player.Stop();
	}
	
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
		* @event IncomingStreamTrack#stopped
		* @type {object}
		*/
		this.emitter.emit("stopped");
		
		//Free
		this.player = null;
	}
	
	
}

module.exports = Player;