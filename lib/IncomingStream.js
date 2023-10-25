const Native		= require("./Native");
const SharedPointer	= require("./SharedPointer");
const Emitter	= require("medooze-event-emitter");
const SemanticSDP	= require("semantic-sdp");
const IncomingStreamTrack	= require("./IncomingStreamTrack");

const {
	SDPInfo,
	Setup,
	MediaInfo,
	CandidateInfo,
	DTLSInfo,
	ICEInfo,
	StreamInfo,
	TrackInfo,
} = require("semantic-sdp");

/**
 * The incoming streams represent the recived media stream from a remote peer.
 */
class IncomingStream extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(transport,receiver,info)
	{
		//Init emitter
		super();

		//Store stream info
		const streamInfo = info.constructor.name === "StreamInfo" ? info.clone() : StreamInfo.expand(info);
		
		//Store id
		this.id = streamInfo.getId();
		
		//Store native transport and receiver
		this.receiver = receiver;
		this.transport = transport;
		//Not muted
		this.muted = false;
		//Attached counter
		this.counter = 0;
		
		//Store sources
		this.tracks = new Map();
		
		try {
			//For each tracks
			for (let trackInfo of streamInfo.getTracks().values())
				//Create new track from info
				this.createTrack(trackInfo);
		} catch (e) {
			//Stop all previous tracks
			for (let track of this.tracks.values())
				//Stop track
				track.stop();
			//Rethrow
			throw e;
		}
	}
	
	/**
	 * The media stream id as announced on the SDP
	 * @returns {String}
	 */
	getId() 
	{
		return this.id;
	}
	
	/**
	 * Get the stream info object for signaling the ssrcs and stream info on the SDP from the remote peer
	 * @returns {StreamInfo} The stream info object
	 */
	getStreamInfo()
	{
		//Create new stream info
		const info = new StreamInfo(this.id);
		//For each track
		for (const [trackId,track] of this.tracks)
			//Append
			info.addTrack(track.getTrackInfo().clone());
		//Return it
		return info;
	}

	/**
	 * Get statistics for all tracks in the stream
	 * 
	 * See IncomingStreamTrack.getStats for information about the stats returned by each track.
	 * 
	 * @returns {Map<String>,Object} Map with stats by trackId
	 */
	getStats() 
	{
		const stats = {};
		
		//for each track
		for (let track of this.tracks.values())
			//Append stats
			stats[track.getId()] = track.getStats();
		
		return stats;
	}

	/**
	 * Get statistics for all tracks in the stream
	 * 
	 * See IncomingStreamTrack.getStats for information about the stats returned by each track.
	 * 
	 * @returns Promise<{Map<String>,Object}> Map with stats by trackId
	 */
	async getStatsAsync() 
	{
		// construct a list of promises for each [track ID, track stats] entry
		const promises = this.getTracks().map(async track => /** @type {const} */ (
			[ track.getId(), await track.getStatsAsync() ]));

		// wait for all entries to arrive, then assemble the object from the entries
		return Object.fromEntries(await Promise.all(promises));
	}

	/**
	 * Check if the stream is muted or not
	 * @returns {boolean} muted
	 */
	isMuted()
	{
		return this.muted;
	}
	
	/*
	 * Mute/Unmute this stream and all the tracks in it
	 * @param {boolean} muting - if we want to mute or unmute
	 */
	mute(muting) 
	{
		//For each track
		for (let track of this.tracks.values())
			//Mute track
			track.mute(muting);
		
		//If we are different
		if (this.muted!==muting)
		{
			//Store it
			this.muted = muting;
			/**
			* IncomingStream stopped event
			*
			* @name muted
			* @memberof IncomingStream
			* @kind event
			* @argument {boolean} muted
			*/
			this.emit("muted",this.muted);
		}
	}
	
	/**
	 * Get track by id
	 * @param {String} trackId	- The track id
	 * @returns {IncomingStreamTrack}	- requested track or null
	 */
	getTrack(trackId) 
	{
		//get it
		return this.tracks.get(trackId);
	}
	
	/**
	 * Get all the tracks
	 * @param {String} type	- The media type (Optional)
	 * @returns {Array<IncomingStreamTrack>}	- Array of tracks
	 */
	getTracks(type) 
	{
		//Create array from tracks
		const tracks = Array.from(this.tracks.values());
		//Return a track array
		return type ? tracks.filter(track => track.getMedia().toLowerCase()===type) : tracks;
	}
	
	/**
	 * Get an array of the media stream audio tracks
	 * @returns {Array<IncomingStreamTrack>}	- Array of tracks
	 */
	getAudioTracks() 
	{
		var audio = [];
		
		//For each track
		for (let track of this.tracks.values())
			//If it is an video track
			if(track.getMedia().toLowerCase()==="audio")
				//Append to tracks
				audio.push(track);
		//Return all tracks
		return audio;
	}
	
	/**
	 * Get an array of the media stream video tracks
	 * @returns {Array<IncomingStreamTrack>}	- Array of tracks
	 */
	getVideoTracks() 
	{
		var video = [];
		
		//For each track
		for (let track of this.tracks.values())
			//If it is an video track
			if(track.getMedia().toLowerCase()==="video")
				//Append to tracks
				video.push(track);
		//Return all tracks
		return video;
	}
	
	
	/*
	 * Adds an incoming stream track created using the Transponder.createIncomingStreamTrack to this stream
	 *  
	 * @param {IncomingStreamTrack} track
	 */
	addTrack(incomingStreamTrack)
	{
		//Ensure we don't have that id alread
		if (this.tracks.has(incomingStreamTrack.getId()))
			//Error
			throw new Error("Track id already present in stream");

		//If the track is already attached
		if (incomingStreamTrack.isAttached())
		{
			//Increase attach counter
			this.counter++;

			//If it is the first
			if (this.counter===1)
				/**
				* IncomingStream attached event
				*
				* @name attached
				* @memberof IncomingStream
				* @kind event
				* @argument {IncomingStream} incomingStream
				*/
				this.emit("attached",this);
		}

		//Add attach/detach events
		incomingStreamTrack
			.on("attached",()=>{
				//Increase attach counter
				this.counter++;

				//If it is the first
				if (this.counter===1)
					/**
					* IncomingStream attached event
					*
					* @name attached
					* @memberof IncomingStream
					* @kind event
					* @argument {IncomingStream} incomingStream
					*/
					this.emit("attached",this);
			})
			.on("detached",()=>{
				//Decrease attach counter
				this.counter--;

				//If it is the last
				if (this.counter===0)
					/**
					* IncomingStream detached event
					*
					* @name detached
					* @memberof IncomingStream
					* @kind event
					* @argument {IncomingStream} incomingStream
					*/
					this.emit("detached",this);
			});

		//Add listener
		incomingStreamTrack.once("stopped",()=>{
			//REmove from map
			this.tracks.delete(incomingStreamTrack.getId());
		});
		//Add it to map
		this.tracks.set(incomingStreamTrack.getId(),incomingStreamTrack);

		/**
		* IncomingStreamTrack added to stream
		*
		* @name track
		* @memberof IncomingStream
		* @kind event
	        * @argument {IncomingStream} incomingStream
		* @argument {IncomingStreamTrack} incomingStreamTrack
		*/
		!this.stopped && this.emit("track",this,incomingStreamTrack);
	}
	
	/**
	 * Create new track from a TrackInfo object and add it to this stream
	 * 
	 * @param {TrackInfo} trackInfo  Track info object
	 * @returns {IncomingStreamTrack}
	 */
	createTrack(trackInfo)
	{
		//Check it is associated to a track
		if (!this.transport)
			//Launch exception
			throw new Error("Transport is not set");
		//Check we are not duplicating tracks
		if (this.tracks.has(trackInfo.getId()))
			//Launch exception
			throw new Error("Duplicated track id");
		
		//Is it audio or video
		const type	 = trackInfo.getMedia()==="audio" ? 0 : 1;

		//The map of incoming sources
		const sources	 = {};

		//Get encodings
		const encodings	 = trackInfo.getEncodings();

		try 
		{
			//If it is a simulcast encoding
			if (encodings.length)
			{
				//For each encoding
				for (let i=0; i<encodings.length; ++i)
				{
					//For each alternative
					for (let j=0; j<encodings[i].length; ++j)
					{
						//Create single incoming source
						const source = SharedPointer(new Native.RTPIncomingSourceGroupShared(type,this.transport.GetTimeService()));

						//Set mid
						const mid = trackInfo.getMediaId();

						//Get rid
						const rid = encodings[i][j].getId();

						//Set rtp stream id and media id
						source.rid = String(rid);
						if (mid)
							source.mid = String(mid || "");

						//Get RID params
						const params = encodings[i][j].getParams();

						//If it has ssrc
						if (params && params.has("ssrc"))
						{
							//Get it
							source.media.ssrc = parseInt(params.get("ssrc"));

							//Check ssrc groups
							const groups  = trackInfo.getSourceGroups();

							//Check groups
							for (let k=0; k<groups.length; ++k)
							{
								//Check if it is from us
								if (groups[k].getSSRCs && groups[k].getSSRCs()[0]===source.media.ssrc)
								{
									//Check if it is one of the ones we care
									switch(groups[k].getSemantics())
									{
										case "FID":
											//Set rtx ssrc
											source.rtx.ssrc = groups[k].getSSRCs()[1];
											break;
									}
								}
							}
						}
						//Add it to transport
						if (!this.transport.AddIncomingSourceGroup(source))
							//Launch exception
							throw new Error("Could not add incoming source group to native transport");
						//Append to sources
						sources[rid] = source;
					}
				}
			//Check if it is a chrome-like sumulcast
			} else if (trackInfo.hasSourceGroup("SIM")) {
				//Get MID group
				const SIM = trackInfo.getSourceGroup("SIM");
				//Get ssrcs
				const ssrcs = SIM.getSSRCs();

				//Check the other groups
				const groups  = trackInfo.getSourceGroups();

				//For each ssrc in MID
				for (let i=0; i<ssrcs.length; ++i)
				{
					//Create single incoming source
					const source = SharedPointer(new Native.RTPIncomingSourceGroupShared(type,this.transport.GetTimeService()));

					//Set source data
					source.media.ssrc = ssrcs[i];

					//Check groups
					for (let j=0; j<groups.length; ++j)
					{
						//Check if it is from us
						if (groups[j].getSSRCs()[0]===ssrcs[i])
						{
							//Check if it is one of the ones we care
							switch(groups[j].getSemantics())
							{
								case "FID":
									//Set rtx ssrc
									source.rtx.ssrc = groups[j].getSSRCs()[1];
									break;
							}
						}
					}

					//Add it to transport
					if (!this.transport.AddIncomingSourceGroup(source))
						//Launch exception
						throw new Error("Could not add incoming source group to native transport");
					//Append to sources with MID index value
					sources[i] = source;
				}
			} else {
				//Create single incoming source
				const source = SharedPointer(new Native.RTPIncomingSourceGroupShared(type,this.transport.GetTimeService()));

				//If we had ssrc info
				if (trackInfo.getSSRCs().length)
				{
					//Set source data
					source.media.ssrc = trackInfo.getSSRCs()[0];

					//Check groups
					const FID = trackInfo.getSourceGroup("FID");

					//Set rtx ssrc
					source.rtx.ssrc = FID ? FID.getSSRCs()[1] : 0;
				}
				//Add it to transport
				if (!this.transport.AddIncomingSourceGroup(source))
					//Launch exception
					throw new Error("Could not add incoming source group to native transport");
				//Append to sources with empty rid
				sources[''] = source;
			}
		} catch (e) {
			//For each source
			for (let id of Object.keys(sources))
				//Remove source group
				this.transport.RemoveIncomingSourceGroup(sources[id]);
			//Rethrow
			throw e;
		}

		//Create new track
		const incomingStreamTrack = new IncomingStreamTrack(trackInfo.getMedia(),trackInfo.getId(),trackInfo.getMediaId(),this.transport.GetTimeService(),this.receiver,sources);

		//Add listener
		incomingStreamTrack.once("stopped",()=>{
			//For each source
			for (let id of Object.keys(sources))
				//Remove source group
				this.transport.RemoveIncomingSourceGroup(sources[id]);
		});
		
		//Add track 
		this.addTrack(incomingStreamTrack);

		//Done
		return incomingStreamTrack;
	}

	/**
	 * Reset ssrc state of all tracks
	 */
	reset()
	{
		//For all tracks
		for (let track of this.tracks.values())
			//Reset the track
			track.reset();
	}


	/**
	 * Return if the stream is attached or not
	 */
	isAttached()
	{
		//For all tracks
		for (let track of this.tracks.values())
			//If it is attached
			if (track.isAttached())
				//The stream is attached
				return true;
		//Not attached
		return false;
	}

	/**
	 * Removes the media strem from the transport and also detaches from any attached incoming stream
	 */
	stop()
	{
		//Don't call it twice
		if (this.stopped) return;

		//Stopped
		this.stopped = true;
		
		//Stop all streams
		for (let track of this.tracks.values())
			//Stop track
			track.stop();

		//Get last stats for all tracks
		const stats = this.getStats();
		
		//Clear tracks jic
		this.tracks.clear();
		
		/**
		* IncomingStream stopped event
		*
		* @name stopped
		* @memberof IncomingStream
		* @kind event
		* @argument {IncomingStream} incomingStream
		* @argument {Objects} last stats before closing
		*/
		this.emit("stopped",this,stats);
		
		//Stop emitter
		super.stop();
		
		//Remove transport reference, so destructor is called on GC
		this.transport = null;
	}
}


module.exports = IncomingStream;
