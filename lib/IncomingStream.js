const Native		= require("./Native");
const SharedPointer	= require("./SharedPointer");
const Emitter	= require("medooze-event-emitter");
const SemanticSDP	= require("semantic-sdp");
const IncomingStreamTrack	= require("./IncomingStreamTrack");

const {
	SDPInfo,
	Setup,
	MediaInfo,
	CandidateInfo,
	DTLSInfo,
	ICEInfo,
	StreamInfo,
	StreamInfoLike,
	TrackInfo,
	TrackInfoLike
} = require("semantic-sdp");

/**
 * @typedef {Object} IncomingStreamEvents
 * @property {(self: IncomingStream, stats: ReturnType<IncomingStream['getStats']>) => void} stopped
 * @property {(self: IncomingStream) => void} attached
 * @property {(self: IncomingStream) => void} detached
 * @property {(muted: boolean) => void} muted
 * @property {(self: IncomingStream, track: IncomingStreamTrack) => void} track IncomingStreamTrack added to stream
 * @property {(self: IncomingStream, track: IncomingStreamTrack) => void} trackremoved IncomingStreamTrack removed from stream
 */

/**
 * The incoming streams represent the recived media stream from a remote peer.
 * @extends {Emitter<IncomingStreamEvents>}
 */
class IncomingStream extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(
		/** @type {string} */ id,
		/** @type {Transport} */ transport
	)
	{
		//Init emitter
		super();

		//Store id
		this.id	= id;

		//Create stream info
		this.info = new StreamInfo(id);

		//Store transport
		this.transport = transport;

		//Not muted
		this.muted = false;
		//Attached counter
		this.counter = 0;
		
		this.onTrackAttached = () => {
			//Increase attach counter
			this.counter++;

			//If it is the first
			if (this.counter===1)
				this.emit("attached",this);
		};
		
		this.onTrackDetached = () => {
			//Decrease attach counter
			this.counter--;

			//If it is the last
			if (this.counter===0)
				this.emit("detached",this);
		};
		
		//Store sources
		this.tracks = /** @type {Map<string, IncomingStreamTrack>} */ (new Map());
	}
	
	/**
	 * The media stream id as announced on the SDP
	 * @returns {String}
	 */
	getId() 
	{
		return this.id;
	}
	
	/**
	 * Get the stream info object for signaling the ssrcs and stream info on the SDP from the remote peer
	 * @returns {StreamInfo} The stream info object
	 */
	getStreamInfo()
	{
		//Create new stream info
		const info = new StreamInfo(this.id);
		//For each track
		for (const [trackId,track] of this.tracks)
			//Append
			info.addTrack(track.getTrackInfo().clone());
		//Return it
		return info;
	}

	/**
	 * Get statistics for all tracks in the stream
	 * 
	 * See {@link IncomingStreamTrack.getStats} for information about the stats returned by each track.
	 * 
	 * @returns {{ [trackId: string]: IncomingStreamTrack.TrackStats }}
	 */
	getStats() 
	{
		const stats = /** @type {{ [trackId: string]: IncomingStreamTrack.TrackStats }} */ ({});
		
		//for each track
		for (let track of this.tracks.values())
			//Append stats
			stats[track.getId()] = track.getStats();
		
		return stats;
	}

	/**
	 * Get statistics for all tracks in the stream
	 * 
	 * See {@link IncomingStreamTrack.getStats} for information about the stats returned by each track.
	 * 
	 * @returns {Promise<{ [trackId: string]: IncomingStreamTrack.TrackStats }>}
	 */
	async getStatsAsync() 
	{
		// construct a list of promises for each [track ID, track stats] entry
		const promises = this.getTracks().map(async track => /** @type {const} */ (
			[ track.getId(), await track.getStatsAsync() ]));

		// wait for all entries to arrive, then assemble the object from the entries
		return Object.fromEntries(await Promise.all(promises));
	}

	/**
	 * Check if the stream is muted or not
	 * @returns {boolean} muted
	 */
	isMuted()
	{
		return this.muted;
	}
	
	/**
	 * Mute/Unmute this stream and all the tracks in it
	 * @param {boolean} muting - if we want to mute or unmute
	 */
	mute(muting) 
	{
		//For each track
		for (let track of this.tracks.values())
			//Mute track
			track.mute(muting);
		
		//If we are different
		if (this.muted!==muting)
		{
			//Store it
			this.muted = muting;
			this.emit("muted",this.muted);
		}
	}
	
	/**
	 * Get track by id
	 * @param {String} trackId	- The track id
	 * @returns {IncomingStreamTrack | undefined}	- requested track or null
	 */
	getTrack(trackId) 
	{
		//get it
		return this.tracks.get(trackId);
	}
	
	/**
	 * Get all the tracks
	 * @param {"audio" | "video"} [type]	- The media type (Optional)
	 * @returns {Array<IncomingStreamTrack>}	- Array of tracks
	 */
	getTracks(type) 
	{
		//Create array from tracks
		const tracks = Array.from(this.tracks.values());
		//Return a track array
		return type ? tracks.filter(track => track.getMedia().toLowerCase()===type) : tracks;
	}
	
	/**
	 * Get an array of the media stream audio tracks
	 * @returns {Array<IncomingStreamTrack>}	- Array of tracks
	 */
	getAudioTracks() 
	{
		let audio = [];
		
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
		let video = [];
		
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
	 * Adds an incoming stream track created using {@link Transport.createIncomingStreamTrack} to this stream
	 *  
	 * @param {IncomingStreamTrack} incomingStreamTrack
	 */
	addTrack(incomingStreamTrack)
	{
		//Ensure we don't have that id alread
		if (this.tracks.has(incomingStreamTrack.getId()))
			//Error
			throw new Error("Track id already present in stream");

		//If the track is already attached
		if (incomingStreamTrack.isAttached())
		{
			this.onTrackAttached();
		}

		//Add attach/detach events
		incomingStreamTrack
			.on("attached", this.onTrackAttached)
			.on("detached", this.onTrackDetached);

		//Add listener
		incomingStreamTrack.once("stopped",()=>{
			//REmove from map
			this.tracks.delete(incomingStreamTrack.getId());
		});
		//Add it to map
		this.tracks.set(incomingStreamTrack.getId(),incomingStreamTrack);

		!this.stopped && this.emit("track",this,incomingStreamTrack);
	}
	
	/**
	 * Remove a track from stream. Note the removed track is not stopped by calling this
	 * function. It's the caller's responsibility to stop it if the track is not used by
	 * any stream any more.
	 * 
	 * @param {string} trackId - Id of the track to be removed
	 * @returns {IncomingStreamTrack | undefined} - Removed track if found
	 */
	removeTrack(trackId)
	{
		//Get incoming track by id
		let incomingStreamTrack = this.tracks.get(trackId);
		//If track found
		if (incomingStreamTrack)
		{
			//Remove events
			incomingStreamTrack
				.off("attached", this.onTrackAttached)
				.off("detached", this.onTrackDetached);
			
			//Remove track from map
			this.tracks.delete(trackId);

			//Fire event
			this.emit("trackremoved", this, incomingStreamTrack);
			
			//If track was attached
			if (incomingStreamTrack.isAttached())
			{
				//Detach it manually
				this.onTrackDetached();
			}
		}
		//Return the removed track
		return incomingStreamTrack;
	}

	/**
	 * Create new track from a TrackInfo object and add it to this stream
	 * @param {SemanticSDP.TrackType} media Media type
	 * @param {TrackInfoLike} params Track info
	 * @returns {IncomingStreamTrack}
	 */
	createTrack(media, params)
	{
		//Delegate to transport
		return this.transport.createIncomingStreamTrack(media, params, this);
	}

	/**
	 * Reset ssrc state of all tracks
	 */
	reset()
	{
		//For all tracks
		for (let track of this.tracks.values())
			//Reset the track
			track.reset();
	}


	/**
	 * Return if the stream is attached or not
	 */
	isAttached()
	{
		//For all tracks
		for (let track of this.tracks.values())
			//If it is attached
			if (track.isAttached())
				//The stream is attached
				return true;
		//Not attached
		return false;
	}

	/**
	 * Removes the media strem from the transport and also detaches from any attached incoming stream
	 */
	stop()
	{
		//Don't call it twice
		if (this.stopped) return;

		//Stopped
		this.stopped = true;
		
		//Stop all streams
		for (let track of this.tracks.values())
			//Stop track
			track.stop();

		//Get last stats for all tracks
		const stats = this.getStats();
		
		//Clear tracks jic
		this.tracks.clear();
		
		this.emit("stopped",this,stats);
		
		//Stop emitter
		super.stop();
		
		//Remove transport reference, so destructor is called on GC
		this.transport = null;
	}
}


module.exports = IncomingStream;
