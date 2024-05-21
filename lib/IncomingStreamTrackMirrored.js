const Native		= require("./Native");
const SharedPointer	= require("./SharedPointer");
const Emitter		= require("medooze-event-emitter");
const LayerInfo		= require("./LayerInfo");
const IncomingStreamTrack = require("./IncomingStreamTrack");
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
 * @typedef {Object} Encoding
 * this type is like {@link IncomingStreamTrack.Encoding} except that `source` is renamed to a new `mirror`
 * property, and then the `source` property is instead backed by a `RTPIncomingMediaStreamMultiplexer`.
 *
 * @property {string} id
 * @property {SharedPointer.Proxy<Native.RTPIncomingSourceGroupShared>} mirror
 * @property {SharedPointer.Proxy<Native.RTPIncomingMediaStreamMultiplexerShared>} source
 * @property {SharedPointer.Proxy<Native.RTPReceiverShared>} receiver
 * @property {SharedPointer.Proxy<Native.RTPIncomingMediaStreamDepacketizerShared>} depacketizer
 */

/**
 * Mirror incoming stream from another endpoint. Used to avoid inter-thread synchronization when attaching multiple output streams.
 * @extends {Emitter<IncomingStreamTrack.IncomingStreamTrackEvents<IncomingStreamTrackMirrored, Encoding>>}
 */
class IncomingStreamTrackMirrored extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(
		/** @type {IncomingStreamTrack} */ incomingStreamTrack,
		/** @type {Native.TimeService} */ timeService)
	{
		//Init emitter
		super();

		//Store original track and receiver
		this.track	= incomingStreamTrack;
		this.receiver	= incomingStreamTrack.receiver;
		//Not muted
		this.muted = false;
		//Attach counter
		this.counter	= 0;
	
		//Create source map
		this.encodings = /** @type {Map<string, Encoding>} */ (new Map());

		//Internal function for adding a new mirrored encoding to the track
		const addEncoding = (/** @type {IncomingStreamTrack.Encoding} */ encoding) => {
			//Check if we had already an encoding for it (i.e. in case of SimulcastAdapter adding and removing a trac)
			const old = this.encodings.get(encoding.id);

			//If we had it
			if (old)
			{
				//Stop multiplexer source
				old.source.Stop();
				//Stop the depacketizer
				old.depacketizer.Stop();
			}

			//Create mirrored source
			const source = SharedPointer(new Native.RTPIncomingMediaStreamMultiplexerShared(encoding.source.toRTPIncomingMediaStream(), timeService));

			//Get mirror encoding
			const mirrored = {
				id		: encoding.id,
				source		: source,
				mirror		: encoding.source,
				receiver	: encoding.receiver,
				depacketizer	: SharedPointer(new Native.RTPIncomingMediaStreamDepacketizerShared(source.toRTPIncomingMediaStream()))
			};

			//Push new encoding
			this.encodings.set(mirrored.id, mirrored);

			this.emit("encoding",this,mirrored);
		}

		//For each encoding in the original track
		for (let encoding of incomingStreamTrack.encodings.values())
			//Add new encoding
			addEncoding(encoding);
		
		//LIsten for new encodings
		incomingStreamTrack.on("encoding",(incomingStreamTrack,encoding) => {
			//Add new encoding
			addEncoding(encoding);
		});
		incomingStreamTrack.on("encodingremoved",(incomingStreamTrack,encoding) => {
			//Get mirrored encoder
			const mirrored = this.encodings.get(encoding.id);
			//If found
			if (mirrored)
			{
				//Stop multiplexer source
				mirrored.source.Stop();
				//Stop the depacketizer
				mirrored.depacketizer.Stop();				

				//Remove from encodings
				this.encodings.delete(encoding.id);
				//Fire event
				this.emit("encodingremoved", this, mirrored);
			}
		});

		//Listen for track stop event
		incomingStreamTrack.once("stopped",()=>{
			//Stop when the mirror is stopped too
			this.stop();
		});
	}
	
	/**
	 * Get stats for all encodings from the original track
	 */
	getStats()
	{
		return this.track.getStats();
	}
	
	/**
	 * Get stats for all encodings from the original track
	 */
	async getStatsAsync()
	{
		return this.track.getStatsAsync();
	}

	/**
	 * Get active encodings and layers ordered by bitrate of the original track
	 */
	getActiveLayers()
	{
		return this.track.getActiveLayers();
	}

	/**
	 * Get active encodings and layers ordered by bitrate of the original track
	 */
	async getActiveLayersAsync()
	{
		return this.track.getActiveLayersAsync();
	}

	/**
	* Get track id as signaled on the SDP
	*/
	getId()
	{
		return this.track.getId();
	}
	

	/**
	* Get track media id (mid)
	*/
	getMediaId()
	{
		return this.track.getMediaId();
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
	 */
	getSSRCs()
	{
		return this.track.getSSRCs();
	}
	
	/**
	* Get track media type
	* @returns {"audio"|"video"}
	*/
	getMedia()
	{
		return this.track.getMedia();
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
		if (!this.track) return;

		//Signal original track is attached
		this.track.attached();

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
			encoding.receiver.SendPLI(encoding.mirror.media.ssrc);
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
			this.emit("detached",this);
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
				encoding.receiver.SendPLI(encoding.mirror.media.ssrc);
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
	 * Removes the track from the incoming stream and also detaches any attached outgoing track or recorder
	 */
	stop()
	{
		//Don't call it twice
		if (this.stopped) return;

		//Stopped
		this.stopped = true;
		
		//for each mirrored encoding
		for (let encoding of this.encodings.values())
		{
			//Stop multiplexer source
			encoding.source.Stop();
			//Stop the depacketizer
			encoding.depacketizer.Stop();
		}

		this.emit("stopped",this);
		
		//remove encpodings
		this.encodings.clear();

		//Stop emitter
		super.stop();
		
		//Remove track reference
		//@ts-expect-error
		this.track = null;
		//@ts-expect-error
		this.receiver = null;
	}
}

module.exports = IncomingStreamTrackMirrored;
