const Native		= require("./Native");
const EventEmitter	= require("events").EventEmitter;
const LayerInfo		= require("./LayerInfo");
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
const TrackEncodingInfo = SemanticSDP.TrackEncodingInfo;
const SourceGroupInfo	= SemanticSDP.SourceGroupInfo;

function getStatsFromIncomingSource(source) 
{
	const stats = {
		numFrames		: source.numFrames,
		numFramesDelta		: source.numFramesDelta,
		lostPackets		: source.lostPackets,
		lostPacketsDelta	: source.lostPacketsDelta,
		lostPacketsMaxGap	: source.lostPacketsMaxGap,
		lostPacketsGapCount	: source.lostPacketsGapCount,
		dropPackets		: source.dropPackets,
		numPackets		: source.numPackets,
		numPacketsDelta		: source.numPacketsDelta,
		numRTCPPackets		: source.numRTCPPackets,
		totalBytes		: source.totalBytes,
		totalRTCPBytes		: source.totalRTCPBytes,
		totalPLIs		: source.totalPLIs,
		totalNACKs		: source.totalNACKs,
		bitrate			: source.bitrate, // Acumulator window is 1000ms so Instant==InstantAvg
		skew			: source.skew,
		drift			: source.drift,
		clockrate		: source.clockrate,
		layers			: [],
	};
	
	//Get layers
	const layers = source.layers();
	
	//Not aggregated stats
	const individual = stats.individual = [];

	//Check if it has layer stats
	for (let i=0; i<layers.size(); ++i)
	{
		//Get layer
		const layer = layers.get(i);
		
		//Push layyer stats
		individual.push({
			spatialLayerId  : layer.spatialLayerId,
			temporalLayerId : layer.temporalLayerId,
			totalBytes	: layer.totalBytes,
			numPackets	: layer.numPackets,
			bitrate		: layer.bitrate,
		});
	}
	
	//We need to aggregate layers
	for (let i=0; i<individual.length; ++i)
	{
		//Create empty stat
		const aggregated = {
			spatialLayerId  : individual[i].spatialLayerId,
			temporalLayerId : individual[i].temporalLayerId,
			totalBytes	: 0,
			numPackets	: 0,
			bitrate		: 0
		};
		
		//Search all individual
		for (let j=0; j<individual.length; ++j)
		{
			//If it is from a lower layer than this
			if (individual[j].spatialLayerId<=aggregated.spatialLayerId && individual[j].temporalLayerId<=aggregated.temporalLayerId)
			{
				//accumulate stats
				aggregated.totalBytes	+= individual[j].totalBytes;
				aggregated.numPackets	+= individual[j].numPackets;
				aggregated.bitrate	+= individual[j].bitrate;
			}
		}
		//Add it to layer stats
		stats.layers.push(aggregated);
	}
	//Return complete stats
	return stats;
}

/**
 * Audio or Video track of a remote media stream
 */
class IncomingStreamTrack
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(media,id,receiver,sources)
	{
		//Store track info
		this.id		= id;
		this.media	= media;
		this.receiver	= receiver;
		//Attach counter
		this.counter	= 0;
	
		//Create info
		this.trackInfo = new TrackInfo(media, id);
		
		//Create source map
		this.encodings = new Map();
		
		//For each source
		for (let id of Object.keys(sources))
		{
			//Get source
			const source = sources[id];
			
			//Push new encoding
			this.encodings.set(id, {
				id		: id,
				source		: source,
				depacketizer	: new Native.RTPIncomingMediaStreamDepacketizer(source)
			});
			
			//Add ssrcs to track info
			source.media && source.media.ssrc && this.trackInfo.addSSRC(source.media.ssrc);
			source.rtx && source.rtx.ssrc && this.trackInfo.addSSRC(source.rtx.ssrc);
			source.fec && source.fec.ssrc && this.trackInfo.addSSRC(source.fec.ssrc);
			
			//Add RTX and FEC groups
			source.rtx && source.rtx.ssrc && this.trackInfo.addSourceGroup(new SourceGroupInfo("FID",[source.media.ssrc,source.rtx.ssrc]));
			source.fec && source.fec.ssrc && this.trackInfo.addSourceGroup(new SourceGroupInfo("FEC-FR",[source.media.ssrc,source.fec.ssrc]));
			
			//If doing simulcast
			if (id)
			{
				//Create simulcast info
				const encodingInfo = new TrackEncodingInfo(id);
				//If we have ssrc info also
				if (source.media && source.media.ssrc)
					//Add main ssrc
					encodingInfo.addParam("ssrc",source.media);
				//Add it
				this.trackInfo.addEncoding(encodingInfo);
			}
		}
		
		//Create event emitter
		this.emitter = new EventEmitter();
	}
	
	/**
	 * Get stats for all encodings 
	 * 
	 * For each encoding you will get stats for media, rtx and fec sources (if used):
	 *  - media    : Stats for the media stream
	 *  - rtx      : Stats for the rtx retransmission stream
	 *  - fec      : Stats for the fec stream
	 *  - rtt      : Round Trip Time in ms
	 *  - waitTime : "min","max" and "avg" packet waiting times in rtp buffer before delivering them
	 *  - bitrate  : Bitrate for media stream only in bps
	 *  - total    : Accumulated bitrate for rtx, media and fec streams in bps
	 *  - remb     : Estimated avialable bitrate for receving (only avaailable if not using tranport wide cc)
	 *  - timestamp: When this stats was generated, in order to save workload, stats are cached for 200ms
	 *  - simulcastIdx	: Simulcast layer index based on bitrate received (-1 if it is inactive).
	 *  - lostPackets	: Accumulated lost packets for rtx, media and fec strems
	 *  - numPackets	: Accumulated packets for rtx, media and fec strems
	 *  - lostPacketsRatio	: Lost packets ratio
	 * 
	 * The stats objects will provide the following info for each source
	 *  - lostPackets	: total lost packkets
	 *  - lostPacketsDelta	: total lost/out of order packets during last second
	 *  - lostPacketsMaxGap	: max total consecutieve packets lossed during last second
	 *  - lostPacketsGapCount : number of packet looses bursts during last second
	 *  - dropPackets       : droppted packets by media server
	 *  - numPackets	: number of rtp packets received
	 *  - numPacketsDelta	: number of rtp packets received during last seconds
	 *  - numRTCPPackets	: number of rtcp packsets received
	 *  - totalBytes	: total rtp received bytes
	 *  - totalRTCPBytes	: total rtp received bytes
	 *  - totalPLIs		: total PLIs sent
	 *  - totalNACKs	: total NACk packets sent
	 *  - bitrate		: average bitrate received during last second in bps
	 *  - skew		: difference between NTP timestamp and RTP timestamps at sender (from RTCP SR)
	 *  - drift		: ratio between RTP timestamps and the NTP timestamp and  at sender (from RTCP SR)
	 *  - clockRate		: RTP clockrate
	 *  - layers		: Information about each spatial/temporal layer (if present)
	 *    * spatialLayerId  : Spatial layer id
	 *    * temporalLayerId : Temporatl layer id
	 *    * totalBytes	: total rtp received bytes for this layer
	 *    * numPackets	: number of rtp packets received for this layer
	 *    * bitrate		: average bitrate received during last second for this layer
	 *  
	 * @returns {Map<String,Object>} Map with stats by encodingId
	 */
	getStats()
	{
		//Check if we have cachedd stats
		if (!this.stats )
			//Create new stats
			this.stats = {};
		
		//For each source ordered by bitrate (reverse)
		for (let encoding of this.encodings.values())
		{
			//Check if we have cachedd stats
			if (!this.stats[encoding.id] || (Date.now() - this.stats[encoding.id].timestamp)>200 )
			{
				//Update stats
				encoding.source.Update();
				//Push new encoding
				this.stats[encoding.id] = {
					rtt	 : encoding.source.rtt,
					waitTime : {
						min     : encoding.source.minWaitedTime,
						max	: encoding.source.maxWaitedTime,
						avg	: encoding.source.avgWaitedTime,
					},
					media	 : getStatsFromIncomingSource(encoding.source.media),
					rtx	 : getStatsFromIncomingSource(encoding.source.rtx),
					fec	 : getStatsFromIncomingSource(encoding.source.fec)
				};
				//Add accumulated bitrate
				this.stats[encoding.id].bitrate		= this.stats[encoding.id].media.bitrate;
				this.stats[encoding.id].total		= this.stats[encoding.id].media.bitrate + this.stats[encoding.id].rtx.bitrate + this.stats[encoding.id].fec.bitrate;
				this.stats[encoding.id].lostPackets	= this.stats[encoding.id].media.lostPackets + this.stats[encoding.id].rtx.lostPackets + this.stats[encoding.id].fec.lostPackets;
				this.stats[encoding.id].lostPacketsDelta= this.stats[encoding.id].media.lostPacketsDelta + this.stats[encoding.id].rtx.lostPacketsDelta + this.stats[encoding.id].fec.lostPacketsDelta;
				this.stats[encoding.id].numFrames	= this.stats[encoding.id].media.numFrames;
				this.stats[encoding.id].numFramesDelta	= this.stats[encoding.id].media.numFramesDelta;
				this.stats[encoding.id].numPackets	= this.stats[encoding.id].media.numPackets + this.stats[encoding.id].rtx.numPackets + this.stats[encoding.id].fec.numPackets;
				this.stats[encoding.id].numPacketsDelta	= this.stats[encoding.id].media.numPacketsDelta + this.stats[encoding.id].rtx.numPacketsDelta + this.stats[encoding.id].fec.numPacketsDelta;
				this.stats[encoding.id].lostPacketsRatio= this.stats[encoding.id].numPackets? this.stats[encoding.id].lostPackets / this.stats[encoding.id].numPackets : 0;
				this.stats[encoding.id].remb		= encoding.remoteBitrateEstimation;
				//Add timestamps
				this.stats[encoding.id].timestamp = Date.now();
				
			}
		}
		
		//Set simulcast index
		let simulcastIdx = 0;
		
		//Order the encodings in reverse order
		for (let stat of Object.values(this.stats).sort((a,b)=>a.bitrate-b.bitrate))
		{
			//Set simulcast index if the encoding is active
			stat.simulcastIdx = stat.bitrate ? simulcastIdx++ : -1;
			//For all layers
			for (const layer of stat.media.layers)
				//Set it also there
				layer.simulcastIdx = stat.simulcastIdx;
		}
		
		//Return a clone of cached stats;
		return cloneDeep(this.stats);
	}
	
	/**
	 * Get active encodings and layers ordered by bitrate
	 * @returns {Object} Active layers object containing an array of active and inactive encodings and an array of all available layer info
	 */
	getActiveLayers()
	{
		const active	= [];
		const inactive  = [];
		const all	= [];
		
		//Get track stats
		const stats = this.getStats();
		
		//For all encodings
		for (const id in stats)
		{
			//If it is inactive
			if (!stats[id].bitrate)
			{
				//Add to inactive encodings
				inactive.push({
					id: id
				});
				//skip
				continue;
			}
			
			//Append to encodings
			const encoding = {
				id		: id,
				simulcastIdx	: stats[id].simulcastIdx,
				bitrate		: stats[id].bitrate,
				layers		: []
			};
			
			//Get layers
			const layers = stats[id].media.layers; 
			
			//For each layer
			for (let i=0;i<layers.length;++i)
			{

				//Append to encoding
				encoding.layers.push({
					simulcastIdx	: layers[i].simulcastIdx,
					spatialLayerId	: layers[i].spatialLayerId,
					temporalLayerId	: layers[i].temporalLayerId,
					bitrate		: layers[i].bitrate
				});
				
				//Append to all layer list
				all.push({
					encodingId	: id,
					simulcastIdx	: layers[i].simulcastIdx,
					spatialLayerId	: layers[i].spatialLayerId,
					temporalLayerId	: layers[i].temporalLayerId,
					bitrate		: layers[i].bitrate
				});
			}
			
			//Check if the encoding had svc layers
			if (encoding.layers.length)
				//Order layer list based on bitrate
				encoding.layers = encoding.layers.sort((a, b) => b.bitrate - a.bitrate);
			else
				//Add encoding as layer
				all.push({
					encodingId	: encoding.id,
					simulcastIdx	: encoding.simulcastIdx,
					spatialLayerId	: LayerInfo.MaxLayerId,
					temporalLayerId	: LayerInfo.MaxLayerId,
					bitrate		: encoding.bitrate
				});
				
			//Add to encoding list
			active.push(encoding);
		}
		
		//Return ordered info
		return {
			active		: active.sort((a, b) => b.bitrate - a.bitrate),
			inactive	: inactive, 
			layers          : all.sort((a, b) => b.bitrate - a.bitrate)
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
	 * Get track info object
	 * @returns {TrackInfo} Track info
	 */
	getTrackInfo()
	{
		return this.trackInfo;
	}
	/**
	 * Return ssrcs associated to this track
	 * @returns {Object}
	 */
	getSSRCs()
	{
		const ssrcs = {};
		
		//For each source
		for (let encoding of this.encodings.values())
			//Push new encoding
			ssrcs[encoding.id] = {
				media : encoding.source.media,
				rtx   : encoding.source.rtx,
				fec   : encoding.source.fec
			};
		//Return the stats array
		return ssrcs;
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
	 * Signal that this track has been attached.
	 * Internal use, you'd beter know what you are doing before calling this method
	 */
	attached() 
	{
		//Increase attach counter
		this.counter++;
		
		//If it is the first
		if (this.counter===1)
			/**
			* IncomingStreamTrack stopped event
			*
			* @name attached
			* @memberof IncomingStreamTrack
			* @kind event
			* @argument {IncomingStreamTrack} incomingStreamTrack
			*/
			this.emitter.emit("attached",this);
	}
	
	/** 
	 * Request an intra refres on all sources
	 */
	refresh()
	{
		//For each source
		for (let encoding of this.encodings.values())
			//Request an iframe on main ssrc
			this.receiver.SendPLI(encoding.source.media.ssrc);
	}
	
	/**
	 * Signal that this track has been detached.
	 * Internal use, you'd beter know what you are doing before calling this method
	 */
	detached()
	{
		//Decrease attach counter
		this.counter--;
		
		//If it is the last
		if (this.counter===0)
			/**
			* IncomingStreamTrack stopped event
			*
			* @name detached
			* @memberof IncomingStreamTrack
			* @kind event
			* @argument {IncomingStreamTrack} incomingStreamTrack
			*/
			this.emitter.emit("detached",this);
	}
	
	/**
	 * Store out of band h264 properties for this track
	 * @param {String} sprop Base64 encoded parameters from SDP
	 */
	setH264ParameterSets(sprop)
	{
		this.h264ParameterSets = sprop;
	}
	
	/**
	 * Check if track has out of band h264 properties
	 * @returns {Boolean} 
	 */
	hasH264ParameterSets()
	{
		return !!this.h264ParameterSets;
	}
	
	/**
	 * Get out of band h264 parameters from this track
	 * @returns {Boolean} 
	 */
	getH264ParameterSets()
	{
		return this.h264ParameterSets;
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
		
		//Get stats for all tracks
		const stats = this.getStats();

		/**
		* IncomingStreamTrack stopped event
		*
		* @name stopped
		* @memberof IncomingStreamTrack
		* @kind event
		* @argument {IncomingStreamTrack} incomingStreamTrack
		*/
		this.emitter.emit("stopped",this);
		
		//remove encpodings
		this.encodings.clear();
		
		//Remove transport reference, so destructor is called on GC
		this.receiver = null;
	}

}

module.exports = IncomingStreamTrack;
