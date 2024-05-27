const Native		= require("./Native");
const SharedPointer	= require("./SharedPointer");
const Emitter		= require("medooze-event-emitter");
const LayerInfo		= require("./LayerInfo");
const SemanticSDP	= require("semantic-sdp");
const {
	TrackInfo,
	TrackEncodingInfo,
	SourceGroupInfo,
} = require("semantic-sdp");

/**
 * @typedef {Object} LayerStats Information about each spatial/temporal layer (if present)
 * @property {boolean} [active]
 * @property {number} simulcastIdx
 * @property {number} spatialLayerId Spatial layer id
 * @property {number} temporalLayerId Temporatl layer id
 * @property {number} totalBytes total rtp received bytes for this layer
 * @property {number} numPackets number of rtp packets received for this layer
 * @property {number} bitrate average media bitrate received during last second for this layer
 * @property {number} totalBitrate average total bitrate received during last second for this layer
 * @property {number} [width] video width
 * @property {number} [height] video height 
 * @property {number} [targetBitrate] signaled target bitrate on the VideoLayersAllocation header
 * @property {number} [targetWidth] signaled target width on the VideoLayersAllocation header
 * @property {number} [targetHeight] signaled target height on the VideoLayersAllocation header
 * @property {number} [targetFps] signaled target fps on the VideoLayersAllocation header
 */

/**
 * @typedef {Object} MediaStats stats for each media stream
 * @property {number} lostPackets total lost packets
 * @property {number} lostPacketsDelta total lost/out of order packets during last second
 * @property {number} [lostPacketsMaxGap] max total consecutive packets lost during last second
 * @property {number} [lostPacketsGapCount] number of packet loss bursts during last second
 * @property {number} [dropPackets] droppted packets by media server
 * @property {number} numFrames number of frames received
 * @property {number} numFramesDelta number of frames received during last second
 * @property {number} numPackets number of rtp packets received
 * @property {number} numPacketsDelta number of rtp packets received during last second
 * @property {number} [numRTCPPackets] number of rtcp packsets received
 * @property {number} totalBytes total rtp received bytes
 * @property {number} [totalRTCPBytes] total rtp received bytes
 * @property {number} [totalPLIs] total PLIs sent
 * @property {number} [totalNACKs] total NACk packets sent
 * @property {number} bitrate average media bitrate received during last second for this layer
 * @property {number} totalBitrate average total bitrate received during last second for this layer
 * @property {number} [skew] difference between NTP timestamp and RTP timestamps at sender (from RTCP SR)
 * @property {number} [drift] ratio between RTP timestamps and the NTP timestamp and  at sender (from RTCP SR)
 * @property {number} [clockrate] RTP clockrate
 * @property {number} [frameDelay] Average frame delay during the last second
 * @property {number} [frameDelayMax] Max frame delay during the last second
 * @property {number} [frameCaptureDelay] Average bewtween local reception time and sender capture one (Absolute capture time must be negotiated)
 * @property {number} [frameCaptureDelayMax] Max bewtween local reception time and sender capture one (Absolute capture time must be negotiated)
 * @property {number} [width] video width
 * @property {number} [height] video height
 * @property {number} [targetBitrate] signaled target bitrate on the VideoLayersAllocation header
 * @property {number} [targetWidth] signaled target width on the VideoLayersAllocation header
 * @property {number} [targetHeight] signaled target height on the VideoLayersAllocation header
 * @property {number} [targetFps] signaled target fps on the VideoLayersAllocation header
 * @property {LayerStats[]} layers Information about each spatial/temporal layer (if present).
 * @property {LayerStats[]} [individual] Information about each individual layer
 */

/**
 * @typedef PacketWaitTime packet waiting times in rtp buffer before delivering them
 * @property {number} min
 * @property {number} max
 * @property {number} avg
 */

/**
 * @typedef {Object} EncodingStats stats for each encoding (media and rtx sources (if used))
 *
 * @property {number} timestamp When this stats was generated (in order to save workload, stats are cached for 200ms)
 * @property {PacketWaitTime} waitTime 
 * @property {MediaStats} media Stats for the media stream
 * @property {MediaStats} rtx Stats for the rtx retransmission stream
 * 
 * @property {number} rtt Round Trip Time in ms
 * @property {number} bitrate Bitrate for media stream only in bps
 * @property {number} remb Estimated available bitrate for receiving (only available if not using transport wide cc)
 * @property {number} simulcastIdx Simulcast layer index based on bitrate received (-1 if it is inactive).
 * @property {number} [lostPacketsRatio] Lost packets ratio
 * @property {number} [width] video width
 * @property {number} [height] video height
 * @property {number} [targetBitrate] signaled target bitrate on the VideoLayersAllocation header
 * @property {number} [targetWidth] signaled target width on the VideoLayersAllocation header
 * @property {number} [targetHeight] signaled target height on the VideoLayersAllocation header
 * @property {number} [targetFps] signaled target fps on the VideoLayersAllocation header
 * @property {string} codec Name of the codec last in use
 *
 * Info accumulated for `media` and `rtx` streams:
 *
 * @property {number} numFrames
 * @property {number} numFramesDelta
 * @property {number} numPackets
 * @property {number} numPacketsDelta
 * @property {number} lostPackets
 * @property {number} lostPacketsDelta
 * 
 * @property {number} total Accumulated bitrate for media and rtx streams in bps (Deprecated)
 * @property {number} totalBitrate average total bitrate received during last second for this layer
 * @property {number} totalBytes total rtp received bytes for this layer
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
 * @property {number} totalBitrate average bitrate (media + overhead) received during last second in bps  
 * @property {number} totalBytes total rtp received bytes for this layer
 * @property {number} numPackets number of rtp packets received for this layer
 * @property {LayerStats[]} layers
 * @property {number} [width]
 * @property {number} [height]
 * @property {number} [targetBitrate] signaled target bitrate on the VideoLayersAllocation header
 * @property {number} [targetWidth] signaled target width on the VideoLayersAllocation header
 * @property {number} [targetHeight] signaled target height on the VideoLayersAllocation header
 * @property {number} [targetFps] signaled target fps on the VideoLayersAllocation header
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
		media		: mediaStats,
		rtx		: rtxStats,
		bitrate		: mediaStats.bitrate,
		total		: mediaStats.totalBitrate + rtxStats.totalBitrate, // DEPRECATED
		totalBitrate	: mediaStats.totalBitrate + rtxStats.totalBitrate,
		totalBytes	: mediaStats.totalBytes + rtxStats.totalBytes,
		lostPackets	: mediaStats.lostPackets + rtxStats.lostPackets,
		lostPacketsDelta: mediaStats.lostPacketsDelta + rtxStats.lostPacketsDelta,
		numFrames	: mediaStats.numFrames,
		numFramesDelta	: mediaStats.numFramesDelta,
		numPackets	: mediaStats.numPackets + rtxStats.numPackets,
		numPacketsDelta	: mediaStats.numPacketsDelta + rtxStats.numPacketsDelta,
		remb		: encoding.source.remoteBitrateEstimation,
		// timestamps
		timestamp: Date.now(),
		// provisional (set by updateStatsSimulcastIndex)
		simulcastIdx: -1,
		codec: encoding.source.codec,
	};
	encodingStats.lostPacketsRatio = encodingStats.numPackets? encodingStats.lostPackets / encodingStats.numPackets : 0;
	//If we have dimenstions
	if (mediaStats.width && mediaStats.height)
	{
		//set it on encoding
		encodingStats.width  = mediaStats.width;
		encodingStats.height = mediaStats.height;
	}
	//Add optional attributes
	if (mediaStats.targetBitrate)
		encodingStats.targetBitrate	= mediaStats.targetBitrate;
	if (mediaStats.targetWidth)
		encodingStats.targetWidth	= mediaStats.targetWidth;
	if (mediaStats.targetHeight)
		encodingStats.targetHeight	= mediaStats.targetHeight;
	if (mediaStats.targetFps)
		encodingStats.targetFps		= mediaStats.targetFps;

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
		totalBitrate		: source.totalBitrate, // Acumulator window is 1000ms so Instant==InstantAvg
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

	//Add optional attributes
	if (source.targetBitrate>0)
		stats.targetBitrate	=  source.targetBitrate;
	if (source.targetWidth>0)
		stats.targetWidth	=  source.targetWidth;
	if (source.targetHeight>0)
		stats.targetHeight	=  source.targetHeight;
	if (source.targetFps>0)
		stats.targetFps	= source.targetFps;
	
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
			totalBitrate	: layer.totalBitrate,
			active		: layer.active, 
			// provisional (set by updateStatsSimulcastIndex)
			simulcastIdx: -1,
		}
		//Add optional attributes
		if (layer.targetBitrate>0)
			curated.targetBitrate	=  layer.targetBitrate;
		if (layer.targetWidth>0)
			curated.targetWidth	=  layer.targetWidth;
		if (layer.targetHeight>0)
			curated.targetHeight	=  layer.targetHeight;
		if (layer.targetFps>0)
			curated.targetFps	= layer.targetFps;
		//TODO: add width/height to svc layers in c++
		// if (layer.width>0)
		// 	curated.width		= layer.width;
		// if (layer.height>0)
		// 	curated.height		= layer.height;

		//Push layyer stats
		individual.push(curated);
	}

	//We need to aggregate layers
	for (const layer of individual)
	{
		//If the layers are not aggreagated
		if (!source.aggregatedLayers)
		{
			//Create empty stat
			/** @type {LayerStats} */
			const aggregated = {
				spatialLayerId	: layer.spatialLayerId,
				temporalLayerId	: layer.temporalLayerId,
				totalBytes	: 0,
				numPackets	: 0,
				bitrate		: 0,
				totalBitrate	: 0,
				// provisional (set by updateStatsSimulcastIndex)
				simulcastIdx	: -1,
			};

			//Add optional attributes
			if (layer.hasOwnProperty("targetBitrate"))
				aggregated.targetBitrate	=  layer.targetBitrate;
			if (layer.hasOwnProperty("targetWidth"))
				aggregated.targetWidth		=  layer.targetWidth;
			if (layer.hasOwnProperty("targetHeight"))
				aggregated.targetHeight		=  layer.targetHeight;
			if (layer.hasOwnProperty("targetFps"))
				aggregated.targetFps		= layer.targetFps;
			if (layer.hasOwnProperty("width"))
				aggregated.width		= layer.width;
			if (layer.hasOwnProperty("height"))
				aggregated.height		= layer.height;

			//Search all individual
			for (const other of individual)
			{
				//If it is from a lower layer than this
				if (other.spatialLayerId <= aggregated.spatialLayerId && other.temporalLayerId <= aggregated.temporalLayerId)
				{
					//accumulate stats
					aggregated.totalBytes += other.totalBytes;
					aggregated.numPackets += other.numPackets;
					aggregated.bitrate += other.bitrate;
					aggregated.totalBitrate += other.totalBitrate;
				}
			}
			//Add it to layer stats
			stats.layers.push(aggregated);
		} else {
			//Use the individual stats
			//TODO: maybe calculate individual layers inside the media server?
			stats.layers.push(layer);
		}

	}

	//Return complete stats
	return stats;
}

function sortByBitrate(/** @type {EncodingStats|LayerStats|ActiveEncodingInfo} */ a, /** @type {EncodingStats|LayerStats|ActiveEncodingInfo} */ b)
{
	return a.targetBitrate && b.targetBitrate 
		? a.targetBitrate - b.targetBitrate 
		: a.bitrate - b.bitrate;
}

function sortByBitrateReverse(/** @type {EncodingStats|LayerStats|ActiveEncodingInfo} */ a, /** @type {EncodingStats|LayerStats|ActiveEncodingInfo} */ b)
{
	return a.targetBitrate && b.targetBitrate 
		? b.targetBitrate - a.targetBitrate 
		: b.bitrate - a.bitrate;
}

function updateStatsSimulcastIndex(/** @type {TrackStats} */ stats)
{
	//Set simulcast index
	let simulcastIdx = 0;
		
	//Order the encodings in reverse order
	for (let stat of Object.values(stats).sort(sortByBitrate))
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
			totalBytes	: stats[id].totalBytes,
			numPackets	: stats[id].numPackets,
			bitrate		: stats[id].bitrate,
			totalBitrate	: stats[id].totalBitrate,
			layers		: []
		};

		//Add optional attributes
		if (stats[id].media.targetBitrate)
			encoding.targetBitrate	=  stats[id].media.targetBitrate;
		if (stats[id].media.targetWidth)
			encoding.targetWidth	=  stats[id].media.targetWidth;
		if (stats[id].media.targetHeight)
			encoding.targetHeight	=  stats[id].media.targetHeight;
		if (stats[id].media.targetFps)
			encoding.targetFps	= stats[id].media.targetFps;

		//Check if we have width and height
		if (stats[id].media.width && stats[id].media.height)
		{
			//Set them
			encoding.width = stats[id].media.width;
			encoding.height = stats[id].media.height;
		}
			
		//Get layers
		const layers = stats[id].media.layers; 
			
		//For each layer
		for (const layer of layers)
		{

			/** @type {LayerStats} */
			const layerStats = {
				simulcastIdx	: layer.simulcastIdx,
				spatialLayerId	: layer.spatialLayerId,
				temporalLayerId	: layer.temporalLayerId,
				totalBytes	: layer.totalBytes,
				numPackets	: layer.numPackets,
				bitrate		: layer.bitrate,
				totalBitrate	: layer.totalBitrate,
				targetBitrate	: layer.targetBitrate,
				targetWidth	: layer.targetWidth,
				targetHeight	: layer.targetHeight,
				targetFps	: layer.targetFps,
				width		: layer.width,
				height		: layer.height,
			};

			//Append to encoding
			encoding.layers.push(layerStats);
			//Append to all layer list
			all.push({ encodingId: id, ...layerStats });
		}
			
		//Check if the encoding had svc layers
		if (encoding.layers.length)
			//Order layer list based on bitrate
			encoding.layers = encoding.layers.sort(sortByBitrateReverse);
		else
			//Add encoding as layer
			all.push({
				encodingId	: encoding.id,
				simulcastIdx	: encoding.simulcastIdx,
				spatialLayerId	: LayerInfo.MaxLayerId,
				temporalLayerId	: LayerInfo.MaxLayerId,
				totalBytes	: encoding.totalBytes,
				numPackets	: encoding.numPackets,
				bitrate		: encoding.bitrate,
				totalBitrate	: encoding.totalBitrate,
				targetBitrate	: encoding.targetBitrate,
				targetWidth	: encoding.targetWidth,
				targetHeight	: encoding.targetHeight,
				targetFps	: encoding.targetFps,
				width		: encoding.width,
				height		: encoding.height,
			});
				
		//Add to encoding list
		active.push(encoding);
	}
			
	//Return ordered info
	return {
		active		: active.sort(sortByBitrateReverse),
		inactive	: inactive, 
		layers          : all.sort(sortByBitrateReverse)
	};
}

/**
 * @template Self
 * @template Encoding
 * @typedef {Object} IncomingStreamTrackEvents
 * @property {(self: Self, encoding: Encoding) => void} encoding New encoding (right now, this is only used by {@link IncomingStreamTrackMirrored} and {@link IncomingStreamTrackSimulcastAdapter})
 * @property {(self: Self, encoding: Encoding) => void} encodingremoved The encoding has been removed
 * @property {(self: Self) => void} attached
 * @property {(self: Self) => void} detached
 * @property {(muted: boolean) => void} muted
 * @property {(self: Self, stats?: TrackStats) => void} stopped
 */

/** @typedef {{ [id: string]: SharedPointer.Proxy<Native.RTPIncomingSourceGroupShared> }} NativeSourceMap */

/**
 * Audio or Video track of a remote media stream
 * @extends {Emitter<IncomingStreamTrackEvents<IncomingStreamTrack, Encoding>>}
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
		/** @type {NativeSourceMap} */ sources)
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
		for (let [id, source] of Object.entries(sources))
		{
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
				(/** @type {SharedPointer.Proxy<Native.SimulcastMediaFrameListenerShared>} */ (this.depacketizer))
					.AttachTo(encoding.depacketizer.toMediaFrameProducer());
			
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
			/** @type {SharedPointer.Proxy<Native.SimulcastMediaFrameListenerShared | Native.RTPIncomingMediaStreamDepacketizerShared>} */
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
	 * @returns {{ [encodingId: string]: import("./Transport").SSRCs }}
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
				(/** @type {SharedPointer.Proxy<Native.SimulcastMediaFrameListenerShared>} */ (this.depacketizer))
					.Detach(encoding.depacketizer.toMediaFrameProducer());
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

IncomingStreamTrack.getActiveLayersFromStats = getActiveLayersFromStats;
IncomingStreamTrack.updateStatsSimulcastIndex = updateStatsSimulcastIndex;

module.exports = IncomingStreamTrack;
