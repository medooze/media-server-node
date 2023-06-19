const Native		= require("./Native");
const Emitter		= require("./Emitter");
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
const TrackEncodingInfo = SemanticSDP.TrackEncodingInfo;
const SourceGroupInfo	= SemanticSDP.SourceGroupInfo;

function getActiveLayersFromStats(stats)
{
	const active	= [];
	const inactive  = [];
	const all	= [];
		
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

function updateStatsSimulcastIndex(stats)
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
	}
}

/**
 * Bundle multiple video track as if they were a single simulcast video track
 */
class IncomingStreamTrackSimulcastAdapter extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(id,mediaId,timeService)
	{
		//Init emitter
		super();

		//Store track id
		this.id = id;
		this.media = "video";
		this.mediaId = mediaId;
		//Not muted
		this.muted = false;

		//Attach counters
		this.counter	= 0;

		//Create info
		this.trackInfo = new TrackInfo(this.media, id);
	
		//Create source maps
		this.encodings = new Map();
		this.encodingPerTrack = new Map();

		//Create a simulcast frame listerner
		this.depacketizer = new Native.SimulcastMediaFrameListenerShared(timeService, 1, 0);
		
		//On stopped listener
		this.onstopped = (incomingStreamTrack) => {
			//Remove track
			this.removeTrack(incomingStreamTrack);
		};
	}

	/**
	 * Add video track to the simulcast adapter
	 * @param {String} encodingId				- Id used as base for encodings id
	 * @param {IncomingStreamTrack} incomingStreamTrack	- Incoming video stream track
	 */
	addTrack(encodingId,incomingStreamTrack)
	{
		//Ensure that it is not  already on the 
		if (this.encodingPerTrack.has(incomingStreamTrack))
			//Error
			throw Error("Cannot add track, it is already present");

		const encodings = new Map();

		//Check incoming track mute state
		if (incomingStreamTrack.isMuted() != this.muted)
			//Set same mute state
			incomingStreamTrack.mute(this.muted);

		//For each encoding in the original track
		for (let encoding of incomingStreamTrack.getEncodings())
		{
			//Get mirror encoding
			const mirrored = {
				id		: encoding.id == "" ? String(encodingId) : String(encodingId) + "#" + encoding.id,
				source		: encoding.source,
				receiver	: encoding.receiver,
				depacketizer	: encoding.depacketizer
			};

			//check if we already have it
			if (this.encodings.has(mirrored.id))
				//Error
				throw new Error("Cannot add track, ncoding id already present");

			//Push new encoding
			this.encodings.set(mirrored.id, mirrored);
			//Store ids
			encodings.set(encoding.id, mirrored);
			
			//Attach the simulcast depacketizer to the source media producer
			this.depacketizer.AttachTo(mirrored.depacketizer.toMediaFrameProducer());

			/**
			* IncomingStreamTrack new encoding event
			*
			* @name encoding
			* @memberof IncomingStreamTrack
			* @kind event
			* @argument {IncomingStreamTrack} incomingStreamTrack
		        * @argument {Object} encoding
			*/
			this.emitter.emit("encoding",this,mirrored);
		}

		//Update the number of layers
		this.depacketizer.SetNumLayers(this.encodings.size);

		//If we are already attached
		if (this.isAttached())
			//We have to signal as much times as counter
			for (let i= 0; i<this.counter; ++i)
				//Signal original track is attached
				incomingStreamTrack.attached();

		//Set the stopped listener
		incomingStreamTrack.on("stopped",this.onstopped);

		//Add encodings to map
		this.encodingPerTrack.set(incomingStreamTrack,encodings);

	}

	/**
	 * Remove video track to the simulcast adapter
	 * @param {IncomingStreamTrack} incomingStreamTrack	- Incoming video stream track
	 */
	removeTrack(incomingStreamTrack)
	{
		//Get the encodings
		const encodings = this.encodingPerTrack.get(incomingStreamTrack);

		//Ensure we had that track
		if (!encodings)
			//Error
			throw new Error("Cannot remove track, track not present");

		//Remove all mirrored encoding ids
		for (const [id,encoding] of encodings)
		{
			//Remove track encodings
			this.encodings.delete(encoding.id);
			//Detach the simulcast depacketizer to the source media producer
			this.depacketizer.Detach(encoding.depacketizer.toMediaFrameProducer());
		}
		//Update the number of layers
		this.depacketizer.SetNumLayers(this.encodings.size);
		//Remove from map
		this.encodingPerTrack.delete(incomingStreamTrack);

		//Remove stop listeners
		incomingStreamTrack.off("stopped",this.onstopped);

		//If we are already attached
		if (this.isAttached())
			//We have to signal as much times as counter
			for (let i= 0; i<this.counter; ++i)
				//Signal original track is dettached
				incomingStreamTrack.detached();
	}

	/**
	 * Get stats for all encodings from the original track
	 * 
	 * @returns {Map<String,Object>} Map with stats by encodingId
	 */
	getStats()
	{
		const stats = {};
		
		//For each track
		for (const [track,encodings] of this.encodingPerTrack)
		{
			//Get stats tats
			const trackStats = track.getStats();

			//for all layers
			for (const [id,stat] of Object.entries(trackStats))
			{
				//Get the mirrored encoding for the id
				const encoding = encodings.get(id);
				//Add stat with mirrored id
				stats[encoding.id] = stat;
			}
		}

		//Update silmulcast index for layers
		updateStatsSimulcastIndex(stats);

		return stats;
	}

	/**
	 * Get stats for all encodings from the original track
	 * 
	 * @returns Promise<{Map<String,Object>}> Map with stats by encodingId
	 */
	async getStatsAsync()
	{
		const stats = {};
		
		//For each track
		for (const [track,encodings] of this.encodingPerTrack)
		{
			//Get stats tats
			const trackStats = await track.getStatsAsync();

			//for all layers
			for (const [id,stat] of Object.entries(trackStats))
			{
				//Get the mirrored encoding for the id
				const encoding = encodings.get(id);
				//Add stat with mirrored id
				stats[encoding.id] = stat;
			}
		}

		//Update silmulcast index for layers
		updateStatsSimulcastIndex(stats);

		return stats;
	}
	
	/**
	 * Get active encodings and layers ordered by bitrate of the original track
	 * @returns {Object} Active layers object containing an array of active and inactive encodings and an array of all available layer info
	 */
	getActiveLayers()
	{
		//Get track stats
		const stats = this.getStats();
		
		//Get active layers from stats
		return getActiveLayersFromStats(stats);
	}

	/**
	 * Get active encodings and layers ordered by bitrate of the original track
	 * @returns {Object} Active layers object containing an array of active and inactive encodings and an array of all available layer info
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
	* Get track media id (mid)
	*/
	getMediaId()
	{
		return this.mediaId();
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
		//TODO: fix
		return [];
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
		//For each track
		for (const [track,encodings] of this.encodingPerTrack)
			//Mute it
			track.mute(muting);
		
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
	 * Signal that this track has been attached.
	 * Internal use, you'd beter know what you are doing before calling this method
	 */
	attached() 
	{
		//If we are already stopped
		if (!this.emitter) return;

		//For each track
		for (const [track,encodings] of this.encodingPerTrack)
			//Signal original track is attached
			track.attached();

		//Increase attach counter
		this.counter++;
		
		//If it is the first
		if (this.counter===1)
			/**
			* IncomingStreamTrackMirrored attached event
			*
			* @name attached
			* @memberof IncomingStreamTrackMirrored
			* @kind event
			* @argument {IncomingStreamTrackMirrored} incomingStreamTrack
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
			encodings.receiver.SendPLI(encoding.source.media.ssrc);
	}
	
	/**
	 * Signal that this track has been detached.
	 * Internal use, you'd beter know what you are doing before calling this method
	 */
	detached()
	{
		//If we are already stopped
		if (!this.emitter) return;

		//For each track
		for (const [track,encodings] of this.encodingPerTrack)
			//Signal original track is deattached
			track.detached();

		//Decrease attach counter
		this.counter--;
		
		//If it is the last
		if (this.counter===0)
			/**
			* IncomingStreamTrackMirrored dettached event
			*
			* @name detached
			* @memberof IncomingStreamTrackMirrored
			* @kind event
			* @argument {IncomingStreamTrackMirrored} incomingStreamTrack
			*/
			this.emitter.emit("detached",this);
	}
	
	/**
	 * Removes the track from the incoming stream and also detaches any attached outgoing track or recorder
	 */
	stop()
	{
		//For each track
		for (const [track,encodings] of this.encodingPerTrack)
		{
			//Remove all mirrored encoding ids
			for (const [id,encoding] of encodings)
				//Detach the simulcast depacketizer to the source media producer
				this.depacketizer.Detach(encoding.depacketizer.toMediaFrameProducer());
			//Remove stop listeners
			track.off("stopped",this.onstopped);
			//If we are already attached
			if (this.isAttached())
				//We have to signal as much times as counter
				for (let i= 0; i<this.counter; ++i)
					//Signal original track is dettached
					track.detached();
		}

		//Clear encoding maps
		this.encodingPerTrack.clear();

		//Stop global depacketizer
		if (this.depacketizer) this.depacketizer.Stop();

		/**
		* IncomingStreamTrack stopped event
		*
		* @name stopped
		* @memberof IncomingStreamTrackMirrored
		* @kind event
		* @argument {IncomingStreamTrackMirrored} incomingStreamTrack
		*/
		this.emitter.emit("stopped",this);
		
		//Stop emitter
		super.stop();
		
		//remove encpodings
		this.encodings.clear();
		
		//Remove track reference
		this.emitter = null;
	}

}

module.exports = IncomingStreamTrackSimulcastAdapter;
