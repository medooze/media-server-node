const Native			= require("./Native");
const SharedPointer		= require("./SharedPointer");
const Emitter		= require("medooze-event-emitter");
const SemanticSDP		= require("semantic-sdp");
const OutgoingStreamTrack	= require("./OutgoingStreamTrack");
const Transponder		= require("./Transponder");
const { v4: uuidV4 }		= require("uuid");

const {
	SDPInfo,
	Setup,
	MediaInfo,
	CandidateInfo,
	DTLSInfo,
	ICEInfo,
	StreamInfo,
	TrackInfo,
} = require("semantic-sdp");

/**
 * @typedef {Object} OutgoingStreamEvents
 * @property {(self: OutgoingStream, stats: ReturnType<OutgoingStream['getStats']>) => void} stopped
 * @property {(track: OutgoingStreamTrack) => void} track Track was created
 * @property {(muted: boolean) => void} muted
 */

/**
 * The incoming streams represent the media stream sent to a remote peer.
 * @extends {Emitter<OutgoingStreamEvents>}
 */
class OutgoingStream extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(
		/** @type {string} */ id,
		/** @type {Native.DTLSICETransport | null} */ transport,
	)
	{
		//Init emitter
		super();

		//Store id
		this.id		= id;
		this.muted	= false;

		//Create stream info
		this.info = new StreamInfo(id);
		
		//Store sources
		this.tracks = /** @type {Map<string, OutgoingStreamTrack>} */ (new Map());
	}
	
	/**
	 * Get statistics for all tracks in the stream
	 * 
	 * See {@link OutgoingStreamTrack.getStats} for information about the stats returned by each track.
	 * 
	 * @returns {{ [trackId: string]: OutgoingStreamTrack.TrackStats }}
	 */
	getStats() 
	{
		const stats = /** @type {{ [trackId: string]: OutgoingStreamTrack.TrackStats }} */ ({});
		
		//for each track
		for (let track of this.tracks.values())
			//Append stats
			stats[track.getId()] = track.getStats();
		
		return stats;
	}

	/**
	 * Get statistics for all tracks in the stream
	 * 
	 * See {@link OutgoingStreamTrack.getStats} for information about the stats returned by each track.
	 * 
	 * @returns {Promise<{ [trackId: string]: OutgoingStreamTrack.TrackStats }>}
	 */
	async getStatsAsync() 
	{
		// construct a list of promises for each [track ID, track stats] entry
		const promises = this.getTracks().map(async track => /** @type {const} */ (
			[track.getId(), await track.getStatsAsync()] ));

		// wait for all stats to arrive, and then assemble the object from the entries
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
	 * Listen media from the incoming stream and send it to the remote peer of the associated transport.
	 * @param {import("./IncomingStream")} incomingStream - The incoming stream to listen media for
	 * @param {Transponder.LayerSelection} [layers]
	 * @returns {Transponder[]} Track transponders array
	 */
	attachTo(incomingStream, layers)
	{
		//Dettach
		this.detach();
		
		//The transponders
		const transponders = /** @type {Transponder[]} */ ([]);
		
		//Get all of our audio streams
		const audio = this.getAudioTracks();
		
		//If we have any
		if (audio.length)
		{
			//Get incoming audiotracks
			const tracks = incomingStream.getAudioTracks();
			//Try to match each ones
			for (let i=0; i<audio.length && i<tracks.length; ++i)
				//Attach them
				transponders.push(audio[i].attachTo(tracks[i]));
		}
		
		//Get all of our audio streams
		const video = this.getVideoTracks();
		
		//If we have any
		if (video.length)
		{
			//Get incoming audiotracks
			const tracks = incomingStream.getVideoTracks();
			//Try to match each ones
			for (let i=0; i<video.length && i<tracks.length; ++i)
				//Attach them and get transponder
				transponders.push(video[i].attachTo(tracks[i], layers));
		}
		
		//Return transponders array
		return transponders;
	}
	
	/**
	 * Stop listening for media 
	 */
	detach()
	{
		//For each track
		for (let track of this.tracks.values())
			//Detach it
			track.detach();
	}
	/**
	 * Get the stream info object for signaling the ssrcs and stream info on the SDP to the remote peer
	 * @returns {StreamInfo} The stream info object
	 */
	getStreamInfo()
	{
		return this.info;
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
	 * Get all the tracks
	 * @param {SemanticSDP.TrackType} [type]	- The media type (Optional)
	 * @returns {Array<OutgoingStreamTrack>}	- Array of tracks
	 */
	getTracks(type) 
	{
		//Create array from tracks
		const tracks = Array.from(this.tracks.values());
		//Return a track array
		return type ? tracks.filter(track => track.getMedia().toLowerCase()===type) : tracks;
	}
	
	/**
	 * Get track by id
	 * @param {String} trackId	- The track id
	 * @returns {OutgoingStreamTrack | undefined}	- requested track or null
	 */
	getTrack(trackId) 
	{
		//get it
		return this.tracks.get(trackId);
	}
	
	/**
	 * Get an array of the media stream audio tracks
	 * @returns {OutgoingStreamTrack[]}	- Array of tracks
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
	 * @returns {OutgoingStreamTrack[]}	- Array of tracks
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
	 * Adds an incoming stream track created using {@link Transport.createOutgoingStreamTrack} to this stream
	 *  
	 * @param {OutgoingStreamTrack} track
	 */
	addTrack(track)
	{
		//Ensure we don't have that id alread
		if (this.tracks.has(track.getId()))
			//Error
			throw new Error("Track id already present in stream");

		//Add track info to stream
		this.info.addTrack(track.getTrackInfo());

		//Add listener
		track.once("stopped",()=>{
			//Remove from info
			this.info.removeTrackById(track.getId());
			//Remove from map
			this.tracks.delete(track.getId());
		});
		//Add it to map
		this.tracks.set(track.getId(),track);
	}
	
	/**
	 * Create new track from a TrackInfo object and add it to this stream
	 * @param {SemanticSDP.TrackType} media Media type
	 * @param {TrackInfoLike } params Params plain object or TrackInfo object
	 * @returns The new outgoing stream
	 */
	createTrack(media, params)
	{
		//Delegate to transport
		return this.transport.createOutgoingStreamTrack(media, params, this);
	}
	
	stop()
	{
		//Don't call it twice
		if (this.stopped) return;

		//Stopped
		this.stopped = true;
		
		//Stop all streams it will detach them
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
		//@ts-expect-error
		this.transport = null;
	}
};

module.exports = OutgoingStream;
