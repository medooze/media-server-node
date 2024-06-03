const Native		= require("./Native");
const SharedPointer	= require("./SharedPointer");
const Emitter		= require("medooze-event-emitter");
const SemanticSDP	= require("semantic-sdp");
const {
	SDPInfo,
	Setup,
	MediaInfo,
	CandidateInfo,
	DTLSInfo,
	ICEInfo,
	StreamInfo,
	TrackInfo,
	SourceGroupInfo,
} = require("semantic-sdp");

const Transponder	= require("./Transponder");

/**
 * @typedef {Object} TrackStats stats for media, rtx, and fec sources (if used)
 * @property {number} timestamp timestamp on when this stats were created
 * @property {MediaStats} media stats for the media stream
 * @property {MediaStats} fec stats for the FEC stream
 * @property {MediaStats} rtx stats for the RTX stream
 * @property {number} [remb] remote estimated bitate (if remb is in use)
 * @property {number} numFrames Total sent frames
 * @property {number} numFramesDelta sent frames during last second
 * @property {number} numPackets number of rtp packets sent
 * @property {number} numPacketsDelta number of rtp packets sent during last second 
 * @property {number} rtt Round Trip Time in ms
 * @property {number} bitrate Bitrate for media stream only in bps
 * @property {number} total Accumulated bitrate for media, rtx and fec streams in bps (deprecated)
 * @property {number} totalBitrate Accumulated bitrate for media, rtx and fec streams in bps
 * @property {number} totalBytes total rtp sent bytes for this layer
 */

/**
 * @typedef {Object} MediaStats stats for each RTP source
 * @property {number} rtt Round Trip Time in ms
 * @property {number} numFrames Total sent frames
 * @property {number} numFramesDelta sent frames during last second
 * @property {number} numPackets Number of rtp packets sent
 * @property {number} numPacketsDelta Number of rtp packets sent during last second
 * @property {number} numRTCPPackets Number of rtcp packets sent
 * @property {number} totalBytes Total rtp sent bytes
 * @property {number} totalRTCPBytes Total rtp sent bytes
 * @property {number} bitrate Average bitrate sent during last second in bps
 * @property {number} totalBitrate Accumulated bitrate for media and rtx streams in bps 
 * @property {number} reportCount Number of RTCP receiver reports received
 * @property {number} reportCountDelta Number of RTCP receiver reports received during last second
 * @property {ReceiverReport} [reported] Last report, if available
 * 
 */

/**
 * @typedef {Object} ReceiverReport RTP receiver report stats
 * @property {number} lostCount Total packet loses reported
 * @property {number} lostCountDelta Packet losses reported in last second
 * @property {number} fractionLost Fraction loss media reported during last second
 * @property {number} jitter Last reported jitter buffer value
 */

/** @returns {TrackStats} */
function getSourceStats(/** @type {Native.RTPOutgoingSourceGroup} */ source)
{
	const mediaStats = getStatsFromOutgoingSource(source.media);
	const rtxStats = getStatsFromOutgoingSource(source.rtx);
	const fecStats = getStatsFromOutgoingSource(source.fec);

	return {
		media		: mediaStats,
		fec			: fecStats,
		rtx			: rtxStats,
		remb		: source.media.remb,
		timestamp	: Date.now(),
		rtt		: Math.max(mediaStats.rtt, fecStats.rtt, rtxStats.rtt),
		bitrate		: mediaStats.bitrate,
		total		: mediaStats.totalBitrate + fecStats.totalBitrate + rtxStats.totalBitrate, // DEPRECATED
		totalBitrate	: mediaStats.totalBitrate + fecStats.totalBitrate + rtxStats.totalBitrate,
		totalBytes	: mediaStats.totalBytes + rtxStats.totalBytes,
		numFrames	: mediaStats.numFrames,
		numFramesDelta	: mediaStats.numFramesDelta,
		numPackets	: mediaStats.numPackets + fecStats.numPackets + rtxStats.numPackets,
		numPacketsDelta	: mediaStats.numPacketsDelta + fecStats.numPacketsDelta + rtxStats.numPacketsDelta,
	};
}

/** @returns {MediaStats} */
function getStatsFromOutgoingSource(/** @type {Native.RTPOutgoingSource} */ source) 
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
		totalBitrate		: source.totalBitrate,
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
 * @typedef {Object} OutgoingStreamTrackEvents
 * @property {(self: OutgoingStreamTrack, stats: TrackStats) => void} stopped
 * @property {(muted: boolean) => void} muted
 * @property {(bitrate: number, self: OutgoingStreamTrack) => void} remb
 */

/**
 * Audio or Video track of a media stream sent to a remote peer
 * @extends {Emitter<OutgoingStreamTrackEvents>}
 */
class OutgoingStreamTrack extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 */
	constructor(
		/** @type {SemanticSDP.TrackType} */ media,
		/** @type {string} */ id,
		/** @type {string} */ mediaId,
		/** @type {SharedPointer.Proxy<Native.RTPSenderShared>} */ sender,
		/** @type {SharedPointer.Proxy<Native.RTPOutgoingSourceGroupShared>} */ source)
	{
		//Init emitter
		super();

		//Store track info
		this.id		= id;
		this.mediaId	= mediaId;
		this.media	= media;
		this.sender	= sender;
		this.source	= source;
		this.muted	= false;
		this.transponder = /** @type {Transponder | null} */ (null);
		
		//Create info
		this.trackInfo = new TrackInfo(media, id);
		//If it has mediaId
		if (this.mediaId)
			//Set it
			this.trackInfo.setMediaId(this.mediaId);
		
		//Add ssrcs to track
		this.trackInfo.addSSRC(source.media.ssrc);
		source.rtx?.ssrc && this.trackInfo.addSSRC(source.rtx.ssrc);
		source.fec?.ssrc && this.trackInfo.addSSRC(source.fec.ssrc);
		
		//Add RTX and FEC group	
		source.rtx?.ssrc && this.trackInfo.addSourceGroup(new SourceGroupInfo("FID",[source.media.ssrc,source.rtx.ssrc]));
		source.fec?.ssrc && this.trackInfo.addSourceGroup(new SourceGroupInfo("FEC-FR",[source.media.ssrc,source.fec.ssrc]));

		//Init stats
		this.stats = getSourceStats(this.source);

		//Native REMB event
		this.onremb = (/** @type {number} */ bitrate) => {
			this.emit("remb",bitrate,this);
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
	 * @returns {TrackStats}
	 */
	getStats()
	{
		//Get current timestamp
		const ts = Date.now();

		//Check if we have old cached stats
		if (this.source && (ts - this.stats.timestamp)>100 )
		{
			//If it was updated to long ago
			if ((ts - this.source.lastUpdated)>100)
				//Update the source
				this.source.Update();
		
			//Cache stats
			this.stats = getSourceStats(this.source);

		}
		//Return the cached stats
		return this.stats;
	}

	/**
	 * Get stats for all encodings 
	 * @returns {Promise<TrackStats>}
	 */
	async getStatsAsync()
	{
		//Get current timestamp
		const ts = Date.now();

		//Check if we have old cached stats
		if (this.source && (ts - this.stats.timestamp)>100)
		{
			//If it was updated to long ago
			if ((ts - this.source.lastUpdated)>100)
				//Update the source
				await new Promise(resolve=>this.source.UpdateAsync({resolve}));
		
			//If not stopped while waiting
			if (this.source)
				//Cache stats
				this.stats = getSourceStats(this.source);
		}
		//Return the cached stats
		return this.stats;
	}

	/**
	 * Return ssrcs associated to this track
	 * @returns {import("./Transport").SSRCs}
	 */
	getSSRCs()
	{
		//Return the sssrcs map
		return {
			media : this.source.media.ssrc,
			fec	  : this.source.fec.ssrc,
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
	
	/**
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
			this.emit("muted",this.muted);
		}
	}
	
	/**
	 * Check if this outgoing stream track is alredy attached to an incoming stream track.
	 * @returns {Boolean} true if attached, false otherwise
	 */
	isAttached()
	{
		return !!this.transponder?.getIncomingTrack();
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
			//If already stopped
			if (this.stopped)
				//Throw error, can cause seg fault on native code otherwise
				throw new Error("Cannot create transponder, OutgoingStreamTrack is already stopped");

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
				this.transponder = null;
			});
		}

		return this.transponder;
	}

	forcePlayoutDelay(/** @type {number} */ minDelay, /** @type {number} */ maxDelay)
	{
		this.source.SetForcedPlayoutDelay(minDelay, maxDelay);
	}

	
	/**
	 * Listen media from the incoming stream track and send it to the remote peer of the associated transport.
	 * This will stop any previous transponder created by a previous attach.
	 * @param {import("./IncomingStreamTrack")} incomingStreamTrack - The incoming stream to listen media for
	 * @param {Transponder.LayerSelection} [layers]
	 * @returns {Transponder} Track transponder object
	 */
	attachTo(incomingStreamTrack, layers)
	{
		//Detach first just in case 
		this.detach();
		
		//If we don't have transponder yet
		if (!this.transponder)
			//Create it
			this.transponder = this.createTransponder();
		
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
	 * Get attached transponder for this track
	 * @returns {Transponder | null} Attached transponder or null if not attached
	 */
	getTransponder() 
	{
		return this.transponder;
	}

	/**
	 * Removes the track from the outgoing stream and also detaches from any attached incoming track
	 */
	stop()
	{
		//Don't call it twice
		if (this.stopped) return;

		//Stopped
		this.stopped = true;
		
		//If we had a transponder
		if (this.transponder)
			//Stop transponder
			this.transponder.stop();

		//Update stats
		this.stats = getSourceStats(this.source);

		//Stop source source
		this.source.Stop();
		
		//Stop listening for events, as they might have been queued
		this.onremb = ()=>{};
		
		this.emit("stopped",this, this.stats);
		
		//Stop emitter
		super.stop();
		
		//Remove transport reference, so destructor is called on GC
		//@ts-expect-error
		this.source = null;
		//@ts-expect-error
		this.sender = null;
	}
}

module.exports = OutgoingStreamTrack;
