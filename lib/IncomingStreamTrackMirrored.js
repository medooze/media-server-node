
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
const TrackEncodingInfo = SemanticSDP.TrackEncodingInfo;
const SourceGroupInfo	= SemanticSDP.SourceGroupInfo;

/**
 * Mirror incoming stream from another endpoint. Used to avoid inter-thread synchronization when attaching multiple output streams.
 */
class IncomingStreamTrackMirrored
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(incomingStreamTrack,timeService)
	{
		//Store original track and receiver
		this.track	= incomingStreamTrack;
		this.receiver	= incomingStreamTrack.receiver;
		
		//Attach counter
		this.counter	= 0;
	
		//Create source map
		this.encodings = new Map();

		//Get number of encodings
		const num = Object.keys(incomingStreamTrack.encodings).length;

		//If multiple sources
		if (num > 1)
			//Create a simulcast frame listerner
			this.depacketizer = new Native.SimulcastMediaFrameListener(1, num);
		
		//For each encoding in the original track
		for (let encoding of incomingStreamTrack.encodings.values())
		{
			//Create mirrored source
			const source = new Native.RTPIncomingMediaStreamMultiplexer(encoding.source.media.ssrc, timeService);

			//Get mirror encoding
			const mirrored = {
				id		: encoding.id,
				source		: source,
				depacketizer	: new Native.RTPIncomingMediaStreamDepacketizer(source)
			};

			//Add listener
			encoding.source.AddListener(source);

			//Push new encoding
			this.encodings.set(mirrored.id, mirrored);

			//If multiple encodings
			if (this.depacketizer)
				//Make the simulcast depacketizer listen for this
				mirrored.depacketizer.AddMediaListener(this.depacketizer);
		}

		//If there is no depacketizer
		if (!this.depacketizer)
			//This is the single depaquetizer, so reause it
			this.depacketizer = this.encodings.values().next().value.depacketizer;
		
		//Create event emitter
		this.emitter = new EventEmitter();
	}
	
	/**
	 * Get stats for all encodings from the original track
	 * 
	 * @returns {Map<String,Object>} Map with stats by encodingId
	 */
	getStats()
	{
		return this.track.getStats();
	}
	
	/**
	 * Get active encodings and layers ordered by bitrate of the original track
	 * @returns {Object} Active layers object containing an array of active and inactive encodings and an array of all available layer info
	 */
	getActiveLayers()
	{
		return this.track.getActiveLayers();
	}
	/**
	* Get track id as signaled on the SDP
	*/
	getId()
	{
		return this.track.getId();
	}
	
	/**
	 * Get track info object
	 * @returns {TrackInfo} Track info
	 */
	getTrackInfo()
	{
		return this.track.getTrackInfo();
	}
	/**
	 * Return ssrcs associated to this track
	 * @returns {Object}
	 */
	getSSRCs()
	{
		return this.track.getSSRCs();
	}
	
	/**
	* Get track media type
	* @returns {String} "audio"|"video" 
	*/
	getMedia()
	{
		return this.track.getMedia();
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
		//If we are already stopped
		if (!this.track) return;

		//Signal original track is attached
		this.track.attached();

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
			this.receiver.SendPLI(encoding.source.media.ssrc);
	}
	
	/**
	 * Signal that this track has been detached.
	 * Internal use, you'd beter know what you are doing before calling this method
	 */
	detached()
	{
		//If we are already stopped
		if (!this.track) return;

		//Signal original track is deattached
		this.track.detached();

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
		//Don't call it twice
		if (!this.track) return;
		
		//For each encoding in the original track
		for (let trackEncoding of this.track.encodings.values())
		{
			//Get stream multiplexer sourcce
			const source = this.encodings.get(trackEncoding.id).source;
			//Remove listener
			trackEncoding.source.RemoveListener(source);
		}
		
		//for each mirrored encoding
		for (let encoding of this.encodings.values())
		{
			//Stop multiplexer source
			encoding.source.Stop();
			//Stop the depacketizer
			encoding.depacketizer.Stop();
		}

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
		
		//remove encpodings
		this.encodings.clear();
		
		//Remove track reference
		this.track = null;
		this.receiver = null;
	}

}

module.exports = IncomingStreamTrackMirrored;
