const Native		= require("./Native");
const SharedPointer	= require("./SharedPointer");
const Emitter		= require("medooze-event-emitter");
const LayerInfo		= require("./LayerInfo");
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
	TrackEncodingInfo,
	SourceGroupInfo,
} = require("semantic-sdp");

/**
 * @typedef {Object} LayerStats Information about each spatial/temporal layer (if present)
 * @property {number} simulcastIdx
 * @property {number} spatialLayerId Spatial layer id
 * @property {number} temporalLayerId Temporatl layer id
 * @property {number} [totalBytes] total rtp received bytes for this layer
 * @property {number} [numPackets] number of rtp packets received for this layer
 * @property {number} bitrate average bitrate received during last second for this layer
 */

/**
 * @typedef {Object} MediaStats stats for each media stream
 * @property {number} [lostPackets] total lost packkets
 * @property {number} [lostPacketsDelta] total lost/out of order packets during last second
 * @property {number} [dropPackets] droppted packets by media server
 * @property {number} numFrames number of rtp packets received
 * @property {number} numFramesDelta number of rtp packets received during last seconds
 * @property {number} numPackets number of rtp packets received
 * @property {number} numPacketsDelta number of rtp packets received during last seconds
 * @property {number} [numRTCPPackets] number of rtcp packsets received
 * @property {number} totalBytes total rtp received bytes
 * @property {number} [totalRTCPBytes] total rtp received bytes
 * @property {number} [totalPLIs] total PLIs sent
 * @property {number} [totalNACKs] total NACk packets sent
 * @property {number} bitrate average bitrate received during last second in bps
 * @property {number} [skew] difference between NTP timestamp and RTP timestamps at sender (from RTCP SR)
 * @property {number} [drift] ratio between RTP timestamps and the NTP timestamp and  at sender (from RTCP SR)
 * @property {number} [clockRate] RTP clockrate
 * @property {LayerStats[]} layers Information about each spatial/temporal layer (if present)
 */

/**
 * @typedef PacketWaitTime packet waiting times in rtp buffer before delivering them
 * @property {number} min
 * @property {number} max
 * @property {number} avg
 */

/**
 * @typedef {Object} EncodingStats stats for each encoding (media, rtx sources (if used))
 *
 * @property {number} timestamp When this stats was generated (in order to save workload, stats are cached for 200ms)
 * @property {PacketWaitTime} waitTime 
 * @property {MediaStats} media Stats for the media stream
 * @property {{}} rtx Stats for the rtx retransmission stream
 * 
 * @property {number} [rtt] Round Trip Time in ms
 * @property {number} bitrate Bitrate for media stream only in bps
 * @property {number} total Accumulated bitrate for rtx, media streams in bps
 * @property {number} [remb] Estimated avialable bitrate for receving (only avaailable if not using tranport wide cc)
 * @property {number} simulcastIdx Simulcast layer index based on bitrate received (-1 if it is inactive).
 * @property {number} [lostPackets] Accumulated lost packets for rtx, media strems
 * @property {number} [lostPacketsRatio] Lost packets ratio
 *
 * Info accumulated for `rtx`, `media` streams:
 *
 * @property {number} numFrames
 * @property {number} numFramesDelta
 * @property {number} numPackets
 * @property {number} numPacketsDelta
 */

/** @typedef {{ [encodingId: string]: EncodingStats }} TrackStats providing the info for each source */

/**
 * @typedef {Object} Encoding
 * @property {string} id
 * @property {SharedPointer.Proxy<Native.RTPIncomingSourceGroupShared>} source
 * @property {SharedPointer.Proxy<Native.RTPReceiverShared>} receiver
 * @property {SharedPointer.Proxy<Native.RTPIncomingMediaStreamDepacketizerShared>} depacketizer
 */

/**
 * @typedef {Object} ActiveEncodingInfo
 * @property {string} id
 * @property {number} simulcastIdx
 * @property {number} bitrate
 * @property {LayerStats[]} layers
 */

/**
 * @typedef {Object} ActiveLayersInfo Active layers object containing an array of active and inactive encodings and an array of all available layer info
 * @property {ActiveEncodingInfo[]} active
 * @property {Array<LayerStats & { encodingId: string }>} layers
 * @property {{ id: string }[]} inactive
 */

/** @returns {EncodingStats} */
function getEncodingStats(/** @type {Encoding} */ encoding)
{
	//Get stats from sources
	const mediaStats = getStatsFromIncomingSource(encoding.source.media);
	const rtxStats = getStatsFromIncomingSource(encoding.source.rtx);
	/** @type {EncodingStats} */
	const encodingStats = {
		rtt	 : encoding.source.rtt,
		waitTime : {
			min     : encoding.source.minWaitedTime,
			max	: encoding.source.maxWaitedTime,
			avg	: encoding.source.avgWaitedTime,
		},
		media	: mediaStats,
		rtx	: rtxStats,
		// accumulated bitrate
		bitrate		: mediaStats.bitrate,
		total		: mediaStats.bitrate + rtxStats.bitrate,
		lostPackets	: mediaStats.lostPackets + rtxStats.lostPackets,
		lostPacketsDelta: mediaStats.lostPacketsDelta + rtxStats.lostPacketsDelta,
		numFrames	: mediaStats.numFrames,
		numFramesDelta	: mediaStats.numFramesDelta,
		numPackets	: mediaStats.numPackets + rtxStats.numPackets,
		numPacketsDelta	: mediaStats.numPacketsDelta + rtxStats.numPacketsDelta,
		remb		: encoding.remoteBitrateEstimation,
		// timestamps
		timestamp: Date.now(),
		// provisional (set by updateStatsSimulcastIndex)
		simulcastIdx: -1,
	};
	encodingStats.lostPacketsRatio = encodingStats.numPackets? encodingStats.lostPackets / encodingStats.numPackets : 0;
	//If we have dimenstions
	if (mediaStats.width && mediaStats.height)
	{
		//set it on encoding
		encodingStats.width  = mediaStats.width;
		encodingStats.height = mediaStats.height;
	}

	//Done
	return encodingStats;
}

/** @returns {MediaStats} */
function getStatsFromIncomingSource(/** @type {Native.RTPIncomingSource} */ source) 
{
	/** @type {MediaStats} */
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
		frameDelay		: source.frameDelay,
		frameDelayMax		: source.frameDelayMax,
		frameCaptureDelay	: source.frameCaptureDelay,
		frameCaptureDelayMax	: source.frameCaptureDelayMax,
		layers			: [],
	};

	//Check if we have width and height
	if (source.width && source.height)
	{
		stats.width = source.width;
		stats.height = source.height;
	}
	
	//Get layers
	const layers = source.layers();

	//Not aggregated stats
	const individual = stats.individual = /** @type {LayerStats[]} */ ([]);

	//Check if it has layer stats
	for (let i=0; i<layers.size(); ++i)
	{
		//Get layer
		const layer = layers.get(i);
		
		/** @type {LayerStats} */
		const curated = {
			spatialLayerId  : layer.spatialLayerId,
			temporalLayerId : layer.temporalLayerId,
			totalBytes	: layer.totalBytes,
			numPackets	: layer.numPackets,
			bitrate		: layer.bitrate,
			active		: layer.active, 
			// provisional (set by updateStatsSimulcastIndex)
			simulcastIdx: -1,
		}
		//Add optional attributes
		if (layer.targetBitrate>=0)
			curated.targetBitrate	=  layer.targetBitrate;
		if (layer.targetWidth>=0)
			curated.targetWidth	=  layer.targetWidth;
		if (layer.targetHeight>=0)
			curated.targetHeight	=  layer.targetHeight;
		if (layer.targetFps>=0)
			curated.targetFps	= layer.targetFps;

		//Push layyer stats
		individual.push(curated);
	}

	//We need to aggregate layers
	for (let i = 0; i < individual.length; ++i)
	{
		//If the layers are not aggreagated
		if (!source.aggregatedLayers)
		{
			//Create empty stat
			/** @type {LayerStats} */
			const aggregated = {
				spatialLayerId: individual[i].spatialLayerId,
				temporalLayerId: individual[i].temporalLayerId,
				totalBytes: 0,
				numPackets: 0,
				bitrate: 0,
				// provisional (set by updateStatsSimulcastIndex)
				simulcastIdx: -1,
			};

			//Add optional attributes
			if (individual[i].hasOwnProperty("targetBitrate"))
				aggregated.targetBitrate	=  individual[i].targetBitrate;
			if (individual[i].hasOwnProperty("targetWidth"))
				aggregated.targetWidth		=  individual[i].targetWidth;
			if (individual[i].hasOwnProperty("targetHeight"))
				aggregated.targetHeight		=  individual[i].targetHeight;
			if (individual[i].hasOwnProperty("targetFps"))
				aggregated.targetFps		= individual[i].targetFps;

			//Search all individual
			for (let j = 0; j < individual.length; ++j)
			{
				//If it is from a lower layer than this
				if (individual[j].spatialLayerId <= aggregated.spatialLayerId && individual[j].temporalLayerId <= aggregated.temporalLayerId)
				{
					//accumulate stats
					aggregated.totalBytes += individual[j].totalBytes;
					aggregated.numPackets += individual[j].numPackets;
					aggregated.bitrate += individual[j].bitrate;
				}
			}
			//Add it to layer stats
			stats.layers.push(aggregated);
		} else {
			//Use the individual stats
			//TODO: maybe calculate individual layers inside the media server?
			stats.layers.push(individual[i]);
		}

	}

	//Return complete stats
	return stats;
}

function updateStatsSimulcastIndex(/** @type {TrackStats} */ stats)
{
	//Set simulcast index
	let simulcastIdx = 0;
		
	//Order the encodings in reverse order
	for (let stat of Object.values(stats).sort((a,b)=>a.bitrate-b.bitrate))
	{
		//Set simulcast index if the encoding is active
		stat.simulcastIdx = stat.bitrate ? simulcastIdx++ : -1;
		//For all layers
		for (const layer of stat.media.layers)
			//Set it also there
			layer.simulcastIdx = stat.simulcastIdx;
		for (const layer of stat.media.individual || [])
			//Set it also there
			layer.simulcastIdx = stat.simulcastIdx;
	}
}


/** @returns {ActiveLayersInfo} */
function getActiveLayersFromStats(/** @type {TrackStats} */ stats)
{
	const active	= /** @type {ActiveLayersInfo['active']} */ ([]);
	const inactive  = /** @type {ActiveLayersInfo['inactive']} */ ([]);
	const all	= /** @type {ActiveLayersInfo['layers']} */ ([]);

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
		/** @type {ActiveEncodingInfo} */
		const encoding = {
			id		: id,
			simulcastIdx	: stats[id].simulcastIdx,
			bitrate		: stats[id].bitrate,
			layers		: []
		};

		//Check if we have width and height
		if (stats[id].media.width && stats[id].media.height)
		{
			//Set them
			encoding.width = stats[id].width;
			encoding.height = stats[id].height;
		}
			
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
				bitrate		: layers[i].bitrate,
				targetBitrate	: layers[i].targetBitrate,
				targetWidth	: layers[i].targetWidth,
				targetHeight	: layers[i].targetHeight,
				targetFps	: layers[i].targetFps
			});
				
			//Append to all layer list
			all.push({
				encodingId	: id,
				simulcastIdx	: layers[i].simulcastIdx,
				spatialLayerId	: layers[i].spatialLayerId,
				temporalLayerId	: layers[i].temporalLayerId,
				bitrate		: layers[i].bitrate,
				targetBitrate	: layers[i].targetBitrate,
				targetWidth	: layers[i].targetWidth,
				targetHeight	: layers[i].targetHeight,
				targetFps	: layers[i].targetFps
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
 * @typedef {Object} IncomingStreamTrackEvents
 * @property {(self: IncomingStreamTrack) => void} attached
 * @property {(self: IncomingStreamTrack) => void} detached
 * @property {(self: IncomingStreamTrack) => void} stopped
 */

/**
 * Audio or Video track of a remote media stream
 * @extends {Emitter<IncomingStreamTrackEvents>}
 */
class IncomingStreamTrack extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(
		/** @type {"audio" | "video"} */ media,
		/** @type {string} */ id,
		/** @type {string} */ mediaId,
		/** @type {Native.TimeService} */ timeService,
		/** @type {SharedPointer.Proxy<Native.RTPReceiverShared>} */ receiver,
		/** @type {{ [id: string]: SharedPointer.Proxy<Native.RTPIncomingSourceGroupShared> }} */ sources)
	{
		//Init emitter
		super();

		//Store track info
		this.id		= id;
		this.mediaId	= mediaId;
		this.media	= media;
		this.receiver	= receiver;
		//Not muted
		this.muted = false;
		//Attach counter
		this.counter	= 0;

		//Cached stats
		this.stats = /** @type {TrackStats} */ ({});
	
		//Create info
		this.trackInfo = new TrackInfo(media, id);
		
		//Create source map
		this.encodings = /** @type {Map<string, Encoding>} */ (new Map());

		//Get number of encodings
		const num = Object.keys(sources).length;

		//If multiple sources and got time service
		if (num > 1 && timeService)
			//Create a simulcast frame listerner
			this.depacketizer = SharedPointer(new Native.SimulcastMediaFrameListenerShared(timeService, 1, num));
		
		//For each source
		for (let id of Object.keys(sources))
		{
			//Get source
			const source = sources[id];

			//The encoding
			const encoding = {
				id		: id,
				source		: source,
				receiver	: receiver,
				depacketizer	: SharedPointer(new Native.RTPIncomingMediaStreamDepacketizerShared(source.toRTPIncomingMediaStream()))
			};
			
			//Push new encoding
			this.encodings.set(id, encoding);
			
			//If multiple encodings
			if (this.depacketizer)
				//Add the source depacketizer producer
				this.depacketizer.AttachTo(encoding.depacketizer.toMediaFrameProducer());
			
			//Add ssrcs to track info
			source.media && source.media.ssrc && this.trackInfo.addSSRC(source.media.ssrc);
			source.rtx && source.rtx.ssrc && this.trackInfo.addSSRC(source.rtx.ssrc);
			
			//Add RTX groups
			source.rtx && source.rtx.ssrc && this.trackInfo.addSourceGroup(new SourceGroupInfo("FID",[source.media.ssrc,source.rtx.ssrc]));
			
			//If doing simulcast
			if (id)
			{
				//Create simulcast info
				const encodingInfo = new TrackEncodingInfo(id, false);
				//If we have ssrc info also
				if (source.media && source.media.ssrc)
					//Add main ssrc
					encodingInfo.addParam("ssrc",String(source.media.ssrc));
				//Add it
				this.trackInfo.addEncoding(encodingInfo);
			}

			//Init stats
			this.stats[encoding.id] = getEncodingStats(encoding);
		}

		//If there is no depacketizer
		if (!this.depacketizer)
			//This is the single depaquetizer, so reause it
			this.depacketizer = this.getDefaultEncoding().depacketizer;
	}
	
	/**
	 * Get stats for all encodings 
	 * @returns {Promise<TrackStats>}
	 */
	async getStatsAsync()
	{
		//Get current timestamp
		const ts = Date.now();
		//For each encoding
		for (let encoding of this.encodings.values())
		{
			//Check if we have cachedd stats
			if (encoding.source && (!this.stats[encoding.id] || (ts - this.stats[encoding.id].timestamp)>100))
			{
				//If it was updated to long ago
				if ((ts - encoding.source.lastUpdated)>100)
					//Update stats async
					await new Promise(resolve=>encoding.source.UpdateAsync({resolve}));
				//If not stopped while waiting
				if (encoding.source)
					//Push new encoding
					this.stats[encoding.id] = getEncodingStats(encoding);
			}
		}
		
		//Update silmulcast index for layers
		updateStatsSimulcastIndex(this.stats);

		//Return a clone of cached stats;
		return this.stats;
	}

	/**
	 * Get stats for all encodings 
	 * @returns {TrackStats}
	 */
	getStats()
	{
		//Get current timestamp
		const ts = Date.now();
		//For each encoding
		for (let encoding of this.encodings.values())
		{
			//Check if we have cachedd stats
			if (encoding.source && (!this.stats[encoding.id] || (ts - this.stats[encoding.id].timestamp)>100))
			{
				//If it was updated to long ago
				if ((ts - encoding.source.lastUpdated)>100)
					//Update stats
					encoding.source.Update();
				//Push new encoding
				this.stats[encoding.id] = getEncodingStats(encoding);
			}
		}
		
		//Update silmulcast index for layers
		updateStatsSimulcastIndex(this.stats);
		
		//Return stats
		return this.stats;
	}
	
	/**
	 * Get active encodings and layers ordered by bitrate
	 * @returns {ActiveLayersInfo} Active layers object containing an array of active and inactive encodings and an array of all available layer info
	 */
	getActiveLayers()
	{
		//Get track stats
		const stats = this.getStats();
		
		//Get active layers from stats
		return getActiveLayersFromStats(stats);
	}

	/**
	 * Get active encodings and layers ordered by bitrate
	 * @returns {Promise<ActiveLayersInfo>} Active layers object containing an array of active and inactive encodings and an array of all available layer info
	 */
	async getActiveLayersAsync()
	{
		//Get track stats
		const stats = await this.getStatsAsync();
		
		//Get active layers from stats
		return getActiveLayersFromStats(stats);
	}

	/**
	* Get track id as signaled on the SDP
	*/
	getId()
	{
		return this.id;
	}
	
	/**
	* Get track media id
	*/
	getMediaId()
	{
		return this.mediaId;
	}
	
	/**
	 * Get track info object
	 */
	getTrackInfo()
	{
		return this.trackInfo;
	}
	/**
	 * Return ssrcs associated to this track
	 */
	getSSRCs()
	{
		const ssrcs = /** @type {{ [encodingId: string]: { media: number, rtx: number } }} */ ({});
		
		//For each source
		for (let encoding of this.encodings.values())
			//Push new encoding
			ssrcs[encoding.id] = {
				media : encoding.source.media.ssrc,
				rtx   : encoding.source.rtx.ssrc
			};
		//Return the stats array
		return ssrcs;
	}
	
	/**
	* Get track media type
	* @returns {"audio"|"video"}
	*/
	getMedia()
	{
		return this.media;
	}

	/**
	 * Get all track encodings
	 * Internal use, you'd beter know what you are doing before calling this method
	 * @returns {Array<Encoding>} - encodings 
	 **/
	getEncodings()
	{
		return Array.from(this.encodings.values());
	}

	/**
	 * Get encoding by id
	 * Internal use, you'd beter know what you are doing before calling this method
	 * @param {String} encodingId	- encoding Id,
	 * @returns {Encoding | undefined}
	 **/
	getEncoding(encodingId)
	{
		return this.encodings.get(encodingId);
	}
	
	/**
	 * Get default encoding
	 * Internal use, you'd beter know what you are doing before calling this method
	 * @returns {Encoding}
	 **/
	getDefaultEncoding()
	{
		return [...this.encodings.values()][0];
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
			this.emit("attached",this);
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
	 * Reset state of incoming sources
	 */
	reset()
	{
		//For each source
		for (let encoding of this.encodings.values())
			//Reset state
			this.receiver.Reset(encoding.source.media.ssrc);
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
	 * @param {boolean} muting - if we want to mute or unmute
	 */
	mute(muting) 
	{
		//For each source
		for (let encoding of this.encodings.values())
		{
			//Mute encoding
			encoding.source.Mute(muting);
			//If unmuting
			if (!muting)
				//Request an iframe on main ssrc
				this.receiver.SendPLI(encoding.source.media.ssrc);
		}
		
		//If we are different
		if (this.muted!==muting)
		{
			//Store it
			this.muted = muting;
			this.emit("muted",this.muted);
		}
	}

	/**
	 * Return if the track is attached or not
	 */
	isAttached()
	{
		return this.counter>0;
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
			this.emit("detached",this);
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
	 * @returns {String | undefined} 
	 */
	getH264ParameterSets()
	{
		return this.h264ParameterSets;
	}

	/**
	 * Override the maximum period of time to wait for an out of order or rtx packet
	 * @param {Number} maxWaitTime max wait time in ms (default: 0 if rtx is not supported or rtt based)
	 */
	setMaxWaitTime(maxWaitTime)
	{
		//For each source
		for (let encoding of this.encodings.values())
			encoding.source.SetMaxWaitTime(maxWaitTime);
	}

	/**
	 * Remove override for the maximum period of time to wait for an out of order or rtx packet
	 */
	resetMaxWaitTime()
	{
		//For each source
		for (let encoding of this.encodings.values())
			encoding.source.ResetMaxWaitTime();
	}
	
	/**
	 * Removes the track from the incoming stream and also detaches any attached outgoing track or recorder
	 */
	stop()
	{
		//Don't call it twice
		if (this.stopped) return;

		//Stopped
		this.stopped = true;
		
		//for each encoding
		for (let encoding of this.encodings.values())
		{	
			//If multiple encodings
			if (this.depacketizer != encoding.depacketizer)
				//Remove frame listener
				encoding.depacketizer.RemoveMediaListener(this.depacketizer.toMediaFrameListener());
			//Stop the depacketizer
			encoding.depacketizer.Stop();
			//Stop source
			encoding.source.Stop();
			//Get last stats
			this.stats[encoding.id] = getEncodingStats(encoding);
		}

		//Stop global depacketizer
		if (this.depacketizer) this.depacketizer.Stop();
		
		this.emit("stopped",this,this.stats);
		
		//Stop emitter
		super.stop();
		
		//remove encodings
		this.encodings.clear();
		//@ts-expect-error
		this.depacketizer = null;
		
		//Remove transport reference, so destructor is called on GC
		//@ts-expect-error
		this.receiver = null;
	}
}

module.exports = IncomingStreamTrack;
