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

const Transponder	= require("./Transponder");

function getStatsFromOutgoingSource(source) 
{
	return {
		numPackets	: source.numPackets,
		numRTCPPackets	: source.numRTCPPackets,
		totalBytes	: source.totalBytes,
		totalRTCPBytes	: source.totalRTCPBytes,
		bitrate		: source.bitrate.GetInstant() // Acumulator window is 1000ms so Instant==InstantAvg
	};
}

/**
 * Audio or Video track of a media stream sent to a remote peer
 */
class OutgoingStreamTrack
{
	constructor(sender,track,source)
	{
		//Store track info
		this.id		= track.getId();
		this.media	= track.getMedia();
		this.sender	= sender;
		this.source	= source;
		this.muted	= false;
		
		//Create event emitter
		this.emitter	= new EventEmitter();
		
		//The listener for attached tracks end event
		this.onAttachedTrackStopped = () => {
			//Dettach
			this.detach();
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
	 * Get stats for all encodings 
	 * 
	 * You will get stats for media, rtx and fec sources (if used):
	 * {
	 *   media: mediaStats,
	 *   rtx  : rtxStats,
	 *   fec  : fecStats
	 * }
	 * 
	 * The stats objects will privide the follwing info for each source
	 *  - numPackets	: number of rtp packets sent
	 *  - numRTCPPackets	: number of rtcp packsets sent
	 *  - totalBytes	: total rtp sent bytes
	 *  - totalRTCPBytes	: total rtp sent bytes
	 *  - bitrate		: average bitrate sent during last second
	 *  
	 * @returns {Map<String,Object>} Map with stats by encodingId
	 */
	getStats()
	{
		//Return the stats for each source
		return {
			media : getStatsFromOutgoingSource(this.source.media),
			rtx   : getStatsFromOutgoingSource(this.source.rtx),
			fec   : getStatsFromOutgoingSource(this.source.fec)
		};
	}

	/**
	 * Return ssrcs associated to this track
	 * @returns {Object}
	 */
	getSSRCs()
	{
		//Return the sssrcs map
		return {
			media : this.source.media,
			rtx   : this.source.rtx,
			fec   : this.source.fec
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
		console.log("mute"+muting +" muted:"+this.muted);
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
			* @event OutgoingStreamTrack#stopped
			* @type {object}
			*/
			this.emitter.emit("muted",this.muted);
		}
		console.log("mute"+muting +" muted:"+this.muted);
	}
	
	/**
	 * Listen media from the incoming stream track and send it to the remote peer of the associated transport.
	 * @param {IncomingStreamTrack} incomingStreamTrack - The incoming stream to listen media for
	 * @returns {Transponder} Track transponder object
	 */
	attachTo(incomingStreamTrack)
	{
		//Detach first just in case 
		this.detach();
		
		//Listen to 
		incomingStreamTrack.on("stopped",this.onAttachedTrackStopped);
		
		//Create native transponder object
		//TODO: Maybe move to constructor??
		const transponder  = new Native.RTPStreamTransponderFacade(this.source,this.sender);
		
		//Store transponder wrapper
		this.transponder = new Transponder(transponder);
		
		//If we are muted
		if (this.muted)
			//Mute transponder also
			this.transponder.mute(this.muted);
		
		//Set track
		this.transponder.setIncomingTrack(incomingStreamTrack);
		
		//Listen the stop event
		this.transponder.on("stopped",()=>{
			//Remove listener
			this.attached.off("stopped",this.onAttachedTrackStopped);
			//Dettach
			this.transponder = null;
			this.attached = null;
		});
		
		//Attached
		this.attached = incomingStreamTrack;
		
		//Return transponder
		return this.transponder;
	}
	
	/**
	 * Stop listening for media 
	 */
	detach()
	{
		//If not attached
		if (!this.transponder)
			//Do nothing
			return;
		//Stop transponder
		this.transponder.stop();
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
		
		//Detach
		this.detach();
		
		/**
		* OutgoingStreamTrack stopped event
		*
		* @event OutgoingStreamTrack#stopped
		* @type {object}
		*/
		this.emitter.emit("stopped");
		
		//Remove transport reference, so destructor is called on GC
		this.source = null;
		this.sender = null;
	}
	
}

module.exports = OutgoingStreamTrack;