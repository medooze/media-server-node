const Native			= require("./Native");
const SharedPointer		= require("./SharedPointer");
const Emitter		= require("./Emitter");
const SemanticSDP		= require("semantic-sdp");
const OutgoingStreamTrack	= require("./OutgoingStreamTrack");
const uuidV4			= require('uuid/v4');

const SDPInfo		= SemanticSDP.SDPInfo;
const Setup		= SemanticSDP.Setup;
const MediaInfo		= SemanticSDP.MediaInfo;
const CandidateInfo	= SemanticSDP.CandidateInfo;
const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;

/**
 * The incoming streams represent the media stream sent to a remote peer.
 */
class OutgoingStream extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(transport,lfsr,info)
	{
		//Init emitter
		super();

		//Store stream info
		this.info = info.constructor.name === "StreamInfo" ? info.clone() : StreamInfo.expand(info);
		
		//Store id
		this.id		= this.info.getId();
		this.muted	= false;
		
		//Store native transport
		this.transport	= transport;
		this.lfsr	= lfsr;
		
		//Store sources
		this.tracks = new Map();
		
		try {
			//For each tracks
			for (let trackInfo of this.info.getTracks().values())
				//Cteate track
				this.createTrack(trackInfo);
		} catch (e) {
			//Stop all previous tracks
			for (let track of this.tracks.values())
				//Stop track
				track.stop();
			//Rethrow
			throw e;
		}
	}
	
	/**
	 * Get statistics for all tracks in the stream
	 * 
	 * See OutgoingStreamTrack.getStats for information about the stats returned by each track.
	 * 
	 * @returns {Map<String>,Object} Map with stats by trackId
	 */
	getStats() 
	{
		const stats = {};
		
		//for each track
		for (let track of this.tracks.values())
			//Append stats
			stats[track.getId()] = track.getStats();
		
		return stats;
	}

	/**
	 * Get statistics for all tracks in the stream
	 * 
	 * See OutgoingStreamTrack.getStats for information about the stats returned by each track.
	 * 
	 * @returns {Map<String>,Object} Map with stats by trackId
	 */
	async getStatsAsync() 
	{
		const stats = {};
		
		//for each track
		for (let track of this.tracks.values())
			//Append promise
			stats[track.getId()] = track.getStatsAsync();

		//Await for all promises
		await Promise.all(Object.values(stats));

		//Resolve the promises
		for (const [trackId,stat] of Object.entries(stats))
			//Get stat
			stats[trackId] = await stat;
		
		return stats;
	}
	
	/**
	 * Check if the stream is muted or not
	 * @returns {boolean} muted
	 */
	isMuted()
	{
		return this.muted;
	}
	
	/*
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
			/**
			* OutgoingStreamTrack stopped event
			*
			* @name muted
			* @memberof OutgoingStream
			* @kind event
			* @argument {boolean} muted
			*/
			this.emitter.emit("muted",this.muted);
		}
	}
	
	/**
	 * Listen media from the incoming stream and send it to the remote peer of the associated transport.
	 * @param {IncomingStream} incomingStream - The incoming stream to listen media for
	 * @returns {Array<Transponder>} Track transponders array
	 * @param {Object} layers			- [Optional] Only applicable to video tracks
	 * @param {String} layers.encodingId		- rid value of the simulcast encoding of the track (default: first encoding available)
	 * @param {Number} layers.spatialLayerId	- The spatial layer id to send to the outgoing stream (default: max layer available)
	 * @param {Number} layers.temporalLayerId	- The temporaral layer id to send to the outgoing stream (default: max layer available)
	 * @param {Number} layers.maxSpatialLayerId	- Max spatial layer id (default: unlimited)
	 * @param {Number} layers.maxTemporalLayerId	- Max temporal layer id (default: unlimited)
	 */
	attachTo(incomingStream, layers)
	{
		//Dettach
		this.detach();
		
		//The transponders
		const transponders = [];
		
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
	 * @param {String} type	- The media type (Optional)
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
	 * @returns {IncomingStreamTrack}	- requested track or null
	 */
	getTrack(trackId) 
	{
		//get it
		return this.tracks.get(trackId);
	}
	
	/**
	 * Get an array of the media stream audio tracks
	 * @returns {Array|OutgoingStreamTracks}	- Array of tracks
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
	 * @returns {Array|OutgoingStreamTrack}	- Array of tracks
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
	
	/*
	 * Adds an incoming stream track created using the Transpocnder.createOutgoingStreamTrack to this stream
	 *  
	 * @param {OuggoingStreamTrack} track
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
	 * @param {Object|TrackInfo|String} params Params plain object, StreamInfo object or media type
	 * @param {String?} params.id		- Stream track id
	 * @param {String?} params.mediaId	- Stream track media id (mid)
	 * @param {String?} params.media	- Media type ("audio" or "video")
	 * @param {Object?} params.ssrcs	- Override the generated ssrcs for this track
	 * @param {Number?} params.ssrcs.media	- ssrc for the track
	 * @param {Number?} params.ssrcs.rtx 	- ssrc for the rtx video track
	 * @returns {OutgoingStream} The new outgoing stream
	 * @param {TrackInfo} trackInfo Track info object
	 * @returns {OugoingStreamTrack}
	 */
	createTrack(params)
	{
		let trackId;
		
		//Get media type
		const media = params.constructor.name === "TrackInfo" ? params.getMedia() : params && params.media ? params.media : params;
		
		//Is it audio or video
		const type  = media==="audio" ? 0 : 1;

		//Get mid
		const mediaId = String((params.constructor.name === "TrackInfo" ? params.getMediaId() : params && params.mediaId ? params.mediaId : "") || "");
		
		//Create incoming track
		const source = new Native.RTPOutgoingSourceGroupShared(mediaId, type, this.transport.GetTimeService());
		
		//The list of streams
		if (params.constructor.name === "TrackInfo")
		{
			//The params is the track info
			const trackInfo = params;
			//Get trackId
			trackId = trackInfo.getId();
			//Set source data
			source.media.ssrc = trackInfo.getSSRCs ()[0];

			//Check groups
			const FID    = trackInfo.getSourceGroup("FID");

			//Set rtx ssrc
			source.rtx.ssrc = FID ? FID.getSSRCs()[1] : 0;

		} else {
			//Get trackId
			trackId = params.id || uuidV4();
			
			//Set source ssrcs
			source.media.ssrc = params.ssrcs ? params.ssrcs.media : this.lfsr.seq(31);
			//If video
			if (media=="video")
			{
				source.rtx.ssrc	  = params.ssrcs ? params.ssrcs.rtx   : this.lfsr.seq(31);
			} else {
				source.rtx.ssrc	  = 0;
			}
		}
		
		//Check we are not duplicating tracks
		if (this.tracks.has(trackId))
			//Launch exception
			throw new Error("Duplicated track id");
		
		//Add it to transport
		if (!this.transport.AddOutgoingSourceGroup(source))
			//Launch exception
			throw new Error("Could not add outgoing source group to native transport");

		//Create new track
		const outgoingStreamTrack = new OutgoingStreamTrack(media, trackId, mediaId, this.transport.toRTPSender(), source);
		
		//Add track info to stream
		this.info.addTrack(outgoingStreamTrack.getTrackInfo());

		//Add listener
		outgoingStreamTrack.once("stopped",()=>{
			//Remove from info
			this.info.removeTrackById(trackId);
			//REmove from map
			this.tracks.delete(trackId);
			//Remove from transport
			this.transport.RemoveOutgoingSourceGroup(source);
		});
		//Add it to map
		this.tracks.set(trackId,outgoingStreamTrack);
		
		/**
		* OutgingStreamTrack created
		*
		* @name track
		* @memberof OutgoingStream
		* @kind event
		* @argument {OutgingStreamTrack} outgoingStreamTrack
		*/
		this.emitter && this.emitter.emit("track",outgoingStreamTrack);
		
		//Done
		return outgoingStreamTrack;
	}
	
	stop()
	{
		//Don't call it twice
		if (!this.transport) return;
		
		//Stop all streams it will detach them
		for (let track of this.tracks.values())
			//Stop track
			track.stop();

		//Get last stats for all tracks
		const stats = this.getStats();
		
		//Clear tracks jic
		this.tracks.clear();
		
		/**
		* OutgoingStream stopped event
		*
		* @name stopped
		* @memberof OutgoingStream
		* @kind event
		* @argument {OutgoingStream} outgoingStream
		* @argument {Objects} last stats before closing
		*/
		this.emitter.emit("stopped",this,stats);
		
		//Stop emitter
		super.stop();
		
		//Remove transport reference, so destructor is called on GC
		this.transport = null;
	}
};

module.exports = OutgoingStream;
