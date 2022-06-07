const Native		= require("./Native");
const EventEmitter	= require('events').EventEmitter;
const SemanticSDP	= require("semantic-sdp");
const cloneDeep		= require('clone-deep');
const SDPInfo		= SemanticSDP.SDPInfo;
const Setup		= SemanticSDP.Setup;
const MediaInfo		= SemanticSDP.MediaInfo;
const CandidateInfo	= SemanticSDP.CandidateInfo;
const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;
const SourceGroupInfo	= SemanticSDP.SourceGroupInfo;

const Transponder	= require("./Transponder");

function getStatsFromOutgoingSource(source) 
{
	return {
		rtt			: source.rtt,
		numFrames		: source.numFrames,
		numFramesDelta		: source.numFramesDelta,
		numPackets		: source.numPackets,
		numPacketsDelta		: source.numPacketsDelta,
		numRTCPPackets		: source.numRTCPPackets,
		totalBytes		: source.totalBytes,
		totalRTCPBytes		: source.totalRTCPBytes,
		bitrate			: source.bitrate,		// Acumulator window is 1000ms so Instant==InstantAvg
		reportCount		: source.reportCount,
		reportCountDelta	: source.reportCountDelta,
		reported		: source.reportCountDelta ? {
			lostCount	: source.reportedLostCount,
			lostCountDelta	: source.reportedLostCountDelta,
			fractionLost	: source.reportedFractionLost,
			jitter		: source.reportedJitter,
		} : undefined,
	};
}

/**
 * Audio or Video track of a media stream sent to a remote peer
 * @hideconstructor
 */
class OutgoingStreamTrack
{
	/**
	 * @ignore
	 * @hideconstructor
	 */
	constructor(media,id,mediaId,sender,source)
	{
		//Store track info
		this.id		= id;
		this.mediaId	= mediaId;
		this.media	= media;
		this.sender	= sender;
		this.source	= source;
		this.muted	= false;
		
		//Create info
		this.trackInfo = new TrackInfo(media, id);
		//If it has mediaId
		if (this.mediaId)
			//Set it
			this.trackInfo.setMediaId(this.mediaId);
		
		//Add ssrcs to track
		this.trackInfo.addSSRC(source.media.ssrc);
		source.rtx.ssrc && this.trackInfo.addSSRC(source.rtx.ssrc);
		
		//Add RTX group	
		source.rtx.ssrc &&this.trackInfo.addSourceGroup(new SourceGroupInfo("FID",[source.media.ssrc,source.rtx.ssrc]));
		
		//Create event emitter
		this.emitter	= new EventEmitter();
		
		//Native REMB event
		this.onremb = (bitrate) => {
			/**
			* OutgoingStreamTrack remb event
			*
			* @name remb
			* @memberof OutgoingStreamTrack
			* @kind event
			* @argument {OutgoingStreamTrack} outgoingStreamTrack
			* @argument {Number} bitrate estimation
			*/
			this.emitter.emit("remb",bitrate,this);
		};
	}
	
	/**
	* Get track id as signaled on the SDP
	*/
	getId()
	{
		return this.id;
	}

	/**
	* Get track media id (mid)
	*/
	getMediaId()
	{
		return this.mediaId;
	}
	
	/**
	* Get track media type
	* @returns {String} "audio"|"video" 
	*/
	getMedia()
	{
		return this.media;
	}
	
	/**
	 * Get track info object
	 * @returns {TrackInfo} Track info
	 */
	getTrackInfo()
	{
		return this.trackInfo;
	}
	
	/**
	 * Get stats for all encodings 
	 * 
	 * You will get stats for media and rtx sources (if used):
	 *  - timestmap		: timestamp on when this stats where created
	 *  - media		: mediaStats,
	 *  - rtx		: rtxStats,
	 *  - remb		: remote estimated bitate (if remb is in use)
	 *  - numPackets	: number of rtp packets sent
	 *  - numPacketsDelta	: number of rtp packets sent during last second 
	 *  - bitrate		: Bitrate for media stream only in bps
	 *  - total		: Accumulated bitrate for media and rtx streams in bps
	 * 
	 * The stats objects will privide the follwing info for each source
	 *  - numFrames			: total recevied frames
	 *  - numFramesDelta		: recevied frames during last second
	 *  - numPackets		: number of rtp packets sent
	 *  - numPacketsDelta		: number of rtp packets sent during last second
	 *  - numRTCPPackets		: number of rtcp packsets sent
	 *  - totalBytes		: total rtp sent bytes
	 *  - totalRTCPBytes		: total rtp sent bytes
	 *  - bitrate			: average bitrate sent during last second in bps
	 *  - reportCount		: number of RTCP receiver reports received
	 *  - reportCountDelta		: number of RTCP receiver reports received during last second
	 *  - reportedLostCount		: total packet loses reported
	 *  - reportedLostCountDelta	: packet losses reported in last second
	 *  - reportedFractionLost	: fraction loss media reported during last second
	 *  - reportedJitter		: last reported jitter buffer value
	 *  
	 * @returns {Map<String,Object>} Map with stats by encodingId
	 */
	getStats()
	{
		//Get current timestamp
		const ts = Date.now();

		//Check if we have cachedd stats
		if (!this.stats || (ts - this.stats.timestamp)>100 )
		{
			//Create new stats
			this.stats = {};
			
			//If it was updated to long ago
			if ((ts - this.source.lastUpdated)>100)
				//Update the source
				this.source.Update();
		
			//Cache stats
			this.stats = {
				media : getStatsFromOutgoingSource(this.source.media),
				rtx   : getStatsFromOutgoingSource(this.source.rtx),
				remb  : this.source.media.remb,
				timestamp : Date.now()
			};
			//Add accumulated bitrate
			this.stats.rtt			= Math.max(this.stats.media.rtt,this.stats.rtx.rtt);
			this.stats.bitrate		= this.stats.media.bitrate;
			this.stats.total		= this.stats.media.bitrate + this.stats.rtx.bitrate;
			//this.stats.numFrames		= this.stats.media.numFrames;
			//this.stats.numFramesDelta	= this.stats.media.numFramesDelta;
			this.stats.numPackets		= this.stats.media.numPackets + this.stats.rtx.numPackets;
			this.stats.numPacketsDelta	= this.stats.media.numPacketsDelta + this.stats.rtx.numPacketsDelta;
		}
		//Return a clone of cached stats;
		return cloneDeep(this.stats);
	}

	/**
	 * Return ssrcs associated to this track
	 * @returns {Object}
	 */
	getSSRCs()
	{
		//Return the sssrcs map
		return {
			media : this.source.media.ssrc,
			rtx   : this.source.rtx.ssrc
		};
	}
	
	/**
	 * Check if the track is muted or not
	 * @returns {boolean} muted
	 */
	isMuted()
	{
		return this.muted;
	}
	
	/*
	 * Mute/Unmute track
	 * This operation will not change the muted state of the stream this track belongs too.
	 * @param {boolean} muting - if we want to mute or unmute
	 */
	mute(muting) 
	{
		//Mute transpoder always
		this.transponder && this.transponder.mute(muting);
		
		//If we are different
		if (this.muted!==muting)
		{
			//Store it
			this.muted = muting;
			/**
			* OutgoingStreamTrack stopped event
			*
			* @name muted
			* @memberof OutgoingStreamTrack
			* @kind event
			* @argument {boolean} muted
			*/
			this.emitter.emit("muted",this.muted);
		}
	}
	
	/**
	 * Check if this outgoing stream track is alredy attached to an incoming stream track.
	 * @returns {Boolean} true if attached, false otherwise
	 */
	isAttached()
	{
		return this.transponder && !!this.transponder.getIncomingTrack();
	}

	/**
	 * Create a transponder if not already attached or return current one.
	 * @returns {Transponder} Track transponder object
	 */
	createTransponder()
	{
		//If we don't have transponder yet
		if (!this.transponder)
		{
			//Create native transponder object
			const transponder  = new Native.RTPStreamTransponderFacade(this.source,this.sender,this);

			//Store transponder wrapper
			this.transponder = new Transponder(transponder, this.media);

			//If we are muted
			if (this.muted)
				//Mute transponder also
				this.transponder.mute(this.muted);

			//Listen the stop event
			this.transponder.once("stopped",()=>{
				//Dettach
				this.transpoder = null;
			});
		}

		return this.transponder;
	}
	
	/**
	 * Listen media from the incoming stream track and send it to the remote peer of the associated transport.
	 * This will stop any previous transpoder created by a previous attach.
	 * @param {IncomingStreamTrack} incomingStreamTrack - The incoming stream to listen media for
	 * @param {Object} layers			- [Optional] Only applicable to video tracks
	 * @param {String} layers.encodingId		- rid value of the simulcast encoding of the track (default: first encoding available)
	 * @param {Number} layers.spatialLayerId	- The spatial layer id to send to the outgoing stream (default: max layer available)
	 * @param {Number} layers.temporalLayerId	- The temporaral layer id to send to the outgoing stream (default: max layer available)
	 * @param {Number} layers.maxSpatialLayerId	- Max spatial layer id (default: unlimited)
	 * @param {Number} layers.maxTemporalLayerId	- Max temporal layer id (default: unlimited)
	 * @returns {Transponder} Track transponder object
	 */
	attachTo(incomingStreamTrack, layers)
	{
		//Detach first just in case 
		this.detach();
		
		//If we don't have transponder yet
		if (!this.transponder)
			//Create it
			this.createTransponder();
		
		//Set track
		this.transponder.setIncomingTrack(incomingStreamTrack, layers);
		
		//Return transponder
		return this.transponder;
	}
	
	/**
	 * Stop forwarding any previous attached track.
	 * This will set the transponder inconming track to null
	 */
	detach()
	{
		//If not attached
		if (!this.transponder)
			//Do nothing
			return;
		
		//Remove null track
		this.transponder.setIncomingTrack(null);
	}
	
	/**
	 * Get attached transpoder for this track
	 * @returns {Transponder} Attached transpoder or null if not attached
	 */
	getTransponder() 
	{
		return this.transponder;
	}
	
	/**
	 * Add event listener
	 * @param {String} event	- Event name 
	 * @param {function} listener	- Event listener
	 * @returns {IncomingStreamTrack} 
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
	 * @returns {IncomingStreamTrack} 
	 */
	off() 
	{
		//Delegate event listeners to event emitter
		this.emitter.removeListener.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Removes the track from the outgoing stream and also detaches from any attached incoming track
	 */
	stop()
	{
		//Don't call it twice
		if (!this.sender) return;
		
		//If we had a transponder
		if (this.transponder)
			//Stop transponder
			this.transponder.stop();
		//Stop source
		this.source.Stop();
		
		//Get stats for all tracks
		const stats = this.getStats();
		
		//Stop listening for events, as they might have been queued
		this.onremb = ()=>{};
		
		/**
		* OutgoingStreamTrack stopped event
		*
		* @name stopped
		* @memberof OutgoingStreamTrack
		* @kind event
		* @argument {OutgoingStreamTrack} outgoingStreamTrack
		*/
		this.emitter.emit("stopped",this);
		
		//Remove transport reference, so destructor is called on GC
		this.source = null;
		this.sender = null;
	}
	
}

module.exports = OutgoingStreamTrack;
