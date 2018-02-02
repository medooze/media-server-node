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

function getStatsFromIncomingSource(source) 
{
	return {
		lostPackets	: source.lostPackets,
		numPackets	: source.numPackets,
		numRTCPPackets	: source.numRTCPPackets,
		totalBytes	: source.totalBytes,
		totalRTCPBytes	: source.totalRTCPBytes,
		bitrate		: source.bitrate.GetInstant() // Acumulator window is 1000ms so Instant==InstantAvg
	};
}

/**
 * Audio or Video track of a remote media stream
 */
class IncomingStreamTrack
{
	constructor(receiver,track,sources)
	{
		//Store track info
		this.id		= track.getId();
		this.media	= track.getMedia();
		this.receiver	= receiver;
	
		//Create source map
		this.encodings = new Map();
		
		//For each source
		for (let id of Object.keys(sources))
			//Push new encoding
			this.encodings.set(id, {
				id		: id,
				source		: sources[id],
				depacketizer	: new Native.StreamTrackDepacketizer(sources[id])
			});
		
		//Create event emitter
		this.emitter = new EventEmitter();
	}
	
	/**
	 * Get stats for all encodings 
	 * 
	 * For each encoding you will get stats for media, rtx and fec sources (if used):
	 * {
	 *   media: mediaStats,
	 *   rtx  : rtxStats,
	 *   fec  : fecStats
	 * }
	 * 
	 * The stats objects will provide the follwing info for each source
	 *  - lostPackets	: total lost packkets
	 *  - numPackets	: number of rtp packets received
	 *  - numRTCPPackets	: number of rtcp packsets received
	 *  - totalBytes	: total rtp received bytes
	 *  - totalRTCPBytes	: total rtp received bytes
	 *  - bitrate		: average bitrate received during last second
	 *  
	 * @returns {Map<String,Object>} Map with stats by encodingId
	 */
	getStats()
	{
		const stats = {};
		
		//For each source
		for (let encoding of this.encodings.values())
			//Push new encoding
			stats[encoding.id] = {
				media : getStatsFromIncomingSource(encoding.source.media),
				rtx   : getStatsFromIncomingSource(encoding.source.rtx),
				fec   : getStatsFromIncomingSource(encoding.source.fec)
			};
		//Return the stats array
		return stats;
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
	 * Removes the track from the incoming stream and also detaches any attached outgoing track or recorder
	 */
	stop()
	{
		//Don't call it twice
		if (!this.receiver) return;
		
		//for each encoding
		for (let encoding of this.encodings.values())
			//Stop the depacketizer
			encoding.depacketizer.Stop();
		
		/**
		* IncomingStreamTrack stopped event
		*
		* @event IncomingStreamTrack#stopped
		* @type {object}
		*/
		this.emitter.emit("stopped");
		
		//remove encpodings
		this.encodings.clear();
		
		//Remove transport reference, so destructor is called on GC
		this.receiver = null;
	}

}

module.exports = IncomingStreamTrack;