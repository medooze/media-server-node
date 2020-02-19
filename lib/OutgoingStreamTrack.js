const Native		= require("./Native");
const EventEmitter	= require('events').EventEmitter;
const SemanticSDP	= require("semantic-sdp");
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
		numPackets	: source.numPackets,
		numRTCPPackets	: source.numRTCPPackets,
		totalBytes	: source.totalBytes,
		totalRTCPBytes	: source.totalRTCPBytes,
		bitrate		: source.bitrate // Acumulator window is 1000ms so Instant==InstantAvg
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
	constructor(media,id,sender,source)
	{
		//Store track info
		this.id		= id;
		this.media	= media;
		this.sender	= sender;
		this.source	= source;
		this.muted	= false;
		
		//Create info
		this.trackInfo = new TrackInfo(media, id);
		
		//Add ssrcs to track
		this.trackInfo.addSSRC(source.media.ssrc);
		source.rtx.ssrc && this.trackInfo.addSSRC(source.rtx.ssrc);
		source.fec.ssrc && this.trackInfo.addSSRC(source.fec.ssrc);
		
		//Add RTX and FEC group	
		source.rtx.ssrc &&this.trackInfo.addSourceGroup(new SourceGroupInfo("FID",[source.media.ssrc,source.rtx.ssrc]));
		source.fec.ssrc && this.trackInfo.addSourceGroup(new SourceGroupInfo("FEC-FR",[source.media.ssrc,source.fec.ssrc]));
		
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
	 * You will get stats for media, rtx and fec sources (if used):
	 * {
	 *   media: mediaStats,
	 *   rtx  : rtxStats,
	 *   fec  : fecStats
	 *   timestmap : timestamp
	 * }
	 * 
	 * The stats objects will privide the follwing info for each source
	 *  - numPackets	: number of rtp packets sent
	 *  - numRTCPPackets	: number of rtcp packsets sent
	 *  - totalBytes	: total rtp sent bytes
	 *  - totalRTCPBytes	: total rtp sent bytes
	 *  - bitrate		: average bitrate sent during last second in bps
	 *  
	 * @returns {Map<String,Object>} Map with stats by encodingId
	 */
	getStats()
	{
		//Check if we have cachedd stats
		if (!this.stats || (Date.now() - this.stats.timestamp)>200 )
		{
			//Create new stats
			this.stats = {};
			
			//Update the source
			this.source.Update();
		
			//Cache stats
			this.stats = {
				media : getStatsFromOutgoingSource(this.source.media),
				rtx   : getStatsFromOutgoingSource(this.source.rtx),
				fec   : getStatsFromOutgoingSource(this.source.fec),
				timestamp : Date.now()
			};
		}
		//Return a clone of cached stats;
		return Object.assign({},this.stats);
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
			rtx   : this.source.rtx.ssrc,
			fec   : this.source.fec.ssrc
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
	 * Listen media from the incoming stream track and send it to the remote peer of the associated transport.
	 * This will stop any previous transpoder created by a previous attach.
	 * @param {IncomingStreamTrack} incomingStreamTrack - The incoming stream to listen media for
	 * @returns {Transponder} Track transponder object
	 */
	attachTo(incomingStreamTrack)
	{
		//Detach first just in case 
		this.detach();
		
		//If we don't have transponder yet
		if (!this.transponder)
		{
			//Create native transponder object
			const transponder  = new Native.RTPStreamTransponderFacade(this.source,this.sender,this);

			//Store transponder wrapper
			this.transponder = new Transponder(transponder);

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
		
		//Set track
		this.transponder.setIncomingTrack(incomingStreamTrack);
		
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
