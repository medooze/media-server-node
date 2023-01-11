const Native		= require("./Native");
const SharedPointer	= require("./SharedPointer");
const Emitter		= require("./Emitter");
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
		frameDelay		: source.frameDelay,
		frameDelayMax		: source.frameDelayMax,
		frameCaptureDelay	: source.frameCaptureDelay,
		frameCaptureDelayMax	: source.frameCaptureDelayMax,
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
	for (let i = 0; i < individual.length; ++i)
	{
		//If the layers are not aggreagated
		if (!source.aggregatedLayers)
		{
			//Create empty stat
			const aggregated = {
				spatialLayerId: individual[i].spatialLayerId,
				temporalLayerId: individual[i].temporalLayerId,
				totalBytes: 0,
				numPackets: 0,
				bitrate: 0
			};

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

/**
 * Audio or Video track of a remote media stream
 */
class IncomingStreamTrack extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(media,id,mediaId,timeService,receiver,sources)
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
	
		//Create info
		this.trackInfo = new TrackInfo(media, id);
		
		//Create source map
		this.encodings = new Map();

		//Get number of encodings
		const num = Object.keys(sources).length;

		//If multiple sources and got time service
		if (num > 1 && timeService)
			//Create a simulcast frame listerner
			this.depacketizer = new Native.SimulcastMediaFrameListenerShared(timeService, 1, num);
		
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
				depacketizer	: new Native.RTPIncomingMediaStreamDepacketizer(source.toRTPIncomingMediaStream())
			};
			
			//Push new encoding
			this.encodings.set(id, encoding);

			//If multiple encodings
			if (this.depacketizer)
				//Make the simulcast depacketizer listen for this
				encoding.depacketizer.AddMediaListener(this.depacketizer.toMediaFrameListener());
			
			//Add ssrcs to track info
			source.media && source.media.ssrc && this.trackInfo.addSSRC(source.media.ssrc);
			source.rtx && source.rtx.ssrc && this.trackInfo.addSSRC(source.rtx.ssrc);
			
			//Add RTX groups
			source.rtx && source.rtx.ssrc && this.trackInfo.addSourceGroup(new SourceGroupInfo("FID",[source.media.ssrc,source.rtx.ssrc]));
			
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

		//If there is no depacketizer
		if (!this.depacketizer)
			//This is the single depaquetizer, so reause it
			this.depacketizer = this.encodings.values().next().value.depacketizer;
	}
	
	/**
	 * Get stats for all encodings 
	 * 
	 * For each encoding you will get stats for media and rtx sources (if used):
	 *  - media    : Stats for the media stream
	 *  - rtx      : Stats for the rtx retransmission stream
	 *  - rtt      : Round Trip Time in ms
	 *  - waitTime : "min","max" and "avg" packet waiting times in rtp buffer before delivering them
	 *  - bitrate  : Bitrate for media stream only in bps
	 *  - total    : Accumulated bitrate for media and rtx streams in bps
	 *  - remb     : Estimated avialable bitrate for receving (only avaailable if not using tranport wide cc)
	 *  - timestamp: When this stats was generated, in order to save workload, stats are cached for 200ms
	 *  - simulcastIdx	: Simulcast layer index based on bitrate received (-1 if it is inactive).
	 *  - lostPackets	: Accumulated lost packets for media and rtx strems
	 *  - numPackets	: Accumulated packets for media and rtx strems
	 *  - lostPacketsRatio	: Lost packets ratio
	 * 
	 * The stats objects will provide the following info for each source
	 *  - numFrames		: total recevied frames
	 *  - numFramesDelta	: recevied frames during last second
	 *  - lostPackets	: total lost packkets
	 *  - lostPacketsDelta	: Lost/out of order packets during last second
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
	 *  - frameDelay	: Average frame delay during the last second
	 *  - frameDelayMax	: Max frame delay during the last second
	 *  - frameCaptureDelay		: Average bewtween local reception time and sender capture one (Absolute capture time must be negotiated)
	 *  - frameCaptureDelayMax	: Max bewtween local reception time and sender capture one (Absolute capture time must be negotiated)
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
		//Get current timestamp
		const ts = Date.now();
		//For each source ordered by bitrate (reverse)
		for (let encoding of this.encodings.values())
		{
			//Check if we have cachedd stats
			if (!this.stats[encoding.id] || (ts - this.stats[encoding.id].timestamp)>100 )
			{
				//If it was updated to long ago
				if ((ts - encoding.source.lastUpdated)>100)
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
				};
				//Add accumulated bitrate
				this.stats[encoding.id].bitrate		= this.stats[encoding.id].media.bitrate;
				this.stats[encoding.id].total		= this.stats[encoding.id].media.bitrate + this.stats[encoding.id].rtx.bitrate;
				this.stats[encoding.id].lostPackets	= this.stats[encoding.id].media.lostPackets + this.stats[encoding.id].rtx.lostPackets;
				this.stats[encoding.id].lostPacketsDelta= this.stats[encoding.id].media.lostPacketsDelta + this.stats[encoding.id].rtx.lostPacketsDelta;
				this.stats[encoding.id].numFrames	= this.stats[encoding.id].media.numFrames;
				this.stats[encoding.id].numFramesDelta	= this.stats[encoding.id].media.numFramesDelta;
				this.stats[encoding.id].numPackets	= this.stats[encoding.id].media.numPackets + this.stats[encoding.id].rtx.numPackets;
				this.stats[encoding.id].numPacketsDelta	= this.stats[encoding.id].media.numPacketsDelta + this.stats[encoding.id].rtx.numPacketsDelta;
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
	* Get track media id
	*/
	getMediaId()
	{
		return this.mediaId;
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
				rtx   : encoding.source.rtx
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
	 * Get all track encodings
	 * Internal use, you'd beter know what you are doing before calling this method
	 * @returns {Array<Object>} - encodings 
	 **/
	getEncodings()
	{
		return Array.from(this.encodings.values());
	}

	/**
	 * Get encoding by id
	 * Internal use, you'd beter know what you are doing before calling this method
	 * @param {String} encodingId	- encoding Id,
	 * @returns {Object}		- encoding 
	 **/
	getEncoding(encodingId)
	{
		return this.encodings.get(encodingId);
	}
	
	/**
	 * Get default encoding
	 * Internal use, you'd beter know what you are doing before calling this method
	 * @returns {Object}		- encoding 
	 **/
	getDefaultEncoding()
	{
		return this.encodings.values().next().value;
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
			* IncomingStreamTrack attached event
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

	/*
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
			/**
			* IncomingStreamTrack stopped event
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
			/**
			* IncomingStreamTrack detached event
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
		}

		//Stop global depacketizer
		if (this.depacketizer) this.depacketizer.Stop();
		
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
		
		//Stop emitter
		super.stop();
		
		//remove encodings
		this.encodings.clear();
		this.depacketizer = null;
		
		//Remove transport reference, so destructor is called on GC
		this.receiver = null;
	}

}

module.exports = IncomingStreamTrack;
