const Native		= require("./Native");
const EventEmitter	= require("events").EventEmitter;
const LayerInfo		= require("./LayerInfo");
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
	const stats = {
		lostPackets	: source.lostPackets,
		dropPackets	: source.dropPackets,
		numPackets	: source.numPackets,
		numRTCPPackets	: source.numRTCPPackets,
		totalBytes	: source.totalBytes,
		totalRTCPBytes	: source.totalRTCPBytes,
		totalPLIs	: source.totalPLIs,
		totalNACKs	: source.totalNACKs,
		bitrate		: source.bitrate.GetInstant()*8, // Acumulator window is 1000ms so Instant==InstantAvg
		layers		: [],
	};
	
	//Get layers
	const layers = source.layers();
	
	//Not aggregated stats
	const individual = [];

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
			bitrate		: layer.bitrate.GetInstant()*8,
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
	constructor(media,id,receiver,sources)
	{
		//Store track info
		this.id		= id;
		this.media	= media;
		this.receiver	= receiver;
		//Attach counter
		this.counter	= 0;
	
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
	 *  - media    : Stats for the media stream
	 *  - rtx      : Stats for the rtx retransmission stream
	 *  - fec      : Stats for the fec stream
	 *  - rtt      : Round Trip Time in ms
	 *  - waitTime : "min","max" and "avg" packet waiting times in rtp buffer before delivering them
	 *  - bitrate  : Accumulated bitrate for rtx, media and fec streams in bps
	 * 
	 * The stats objects will provide the follwing info for each source
	 *  - lostPackets	: total lost packkets
	 *  - dropPackets       : droppted packets by media server
	 *  - numPackets	: number of rtp packets received
	 *  - numRTCPPackets	: number of rtcp packsets received
	 *  - totalBytes	: total rtp received bytes
	 *  - totalRTCPBytes	: total rtp received bytes
	 *  - totalPLIs		: total PLIs sent
	 *  - totalNACKs	: total NACk packets setn
	 *  - bitrate		: average bitrate received during last second in bps
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
		const stats = {};
		
		//For each source
		for (let encoding of this.encodings.values())
		{
			//Update stats
			encoding.source.Update();
			//Push new encoding
			stats[encoding.id] = {
				rtt	 : encoding.source.rtt,
				waitTime : {
					min     : encoding.source.GetMinWaitedTime(),
					max	: encoding.source.GetMaxWaitedTime(),
					avg	: encoding.source.GetAvgWaitedTime(),
				},
				media	 : getStatsFromIncomingSource(encoding.source.media),
				rtx	 : getStatsFromIncomingSource(encoding.source.rtx),
				fec	 : getStatsFromIncomingSource(encoding.source.fec)
			};
			//Add accumulated bitrate
			stats[encoding.id].bitrate = stats[encoding.id].media.bitrate + stats[encoding.id].rtx.bitrate + stats[encoding.id].fec.bitrate;
		}
		//Return the stats array
		return stats;
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
				id	: id,
				bitrate	: stats[id].bitrate,
				layers	: []
			};
			
			//Get layers
			const layers = stats[id].media.layers; 
			
			//Try to do layer selection instead
			for (let i=0;i<layers.length;++i)
			{

				//Append to encoding
				encoding.layers.push({
					spatialLayerId	: layers[i].spatialLayerId,
					temporalLayerId	: layers[i].temporalLayerId,
					bitrate		: layers[i].bitrate
				});
				
				//Append to all layer list
				all.push({
					encodingId	: id,
					spatialLayerId	: layers[i].spatialLayerId,
					temporalLayerId	: layers[i].temporalLayerId,
					bitrate		: layers[i].bitrate
				});
			}
			
			//Check if the encoding had svc layers
			if (encoding.layers.length)
				//Order layer list based on bitrate
				encoding.layers = encoding.layers.sort((a, b) => a.bitrate<b.bitrate);
			else
				//Add encoding as layer
				all.push({
					encodingId	: encoding.id,
					spatialLayerId	: LayerInfo.MaxLayerId,
					temporalLayerId	: LayerInfo.MaxLayerId,
					bitrate		: encoding.bitrate
				});
				
			//Add to encoding list
			active.push(encoding);
		}
		
		//Return ordered info
		return {
			active		: active.sort((a, b) => a.bitrate<b.bitrate),
			inactive	: inactive, 
			layers		: all.sort((a, b) => a.bitrate<b.bitrate)
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
			* @event IncomingStreamTrack#stopped
			* @type {object}
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
			* @event IncomingStreamTrack#stopped
			* @type {object}
			*/
			this.emitter.emit("detached",this);
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
		this.emitter.emit("stopped",this);
		
		//remove encpodings
		this.encodings.clear();
		
		//Remove transport reference, so destructor is called on GC
		this.receiver = null;
	}

}

module.exports = IncomingStreamTrack;