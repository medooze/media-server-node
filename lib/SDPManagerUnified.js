const SDPManager	= require("./SDPManager");

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
	SourceGroupInfo,
	Direction,
} = require("semantic-sdp");

/** @typedef {import("./Endpoint")} Endpoint */
/** @typedef {import("./Transport")} Transport */

/**
 * @typedef {Object} Transceiver
 * @property {String} mid
 * @property {SemanticSDP.MediaType} media
 * @property {TransceiverLocal} local
 * @property {TransceiverRemote} remote
 */

/**
 * @typedef {Object} TransceiverLocal
 * @property {String} [streamId]
 * @property {import("./OutgoingStream")} [stream]
 * @property {import("./OutgoingStreamTrack")} [track]
 * @property {MediaInfo} [info]
 */

/**
 * @typedef {Object} TransceiverRemote
 * @property {String} [streamId]
 * @property {import("./IncomingStream")} [stream]
 * @property {import("./IncomingStreamTrack")} [track]
 * @property {MediaInfo} [info]
 */

class SDPManagerUnified extends SDPManager
{
	constructor(
		/** @type {Endpoint} */ endpoint,
		/** @type {SemanticSDP.Capabilities} */ capabilities)
	{
		//Init parent
		super();
		
		//Store params
		this.endpoint = endpoint;
		this.capabilities = capabilities;
		//The list of transceivers
		this.transceivers = /** @type {Transceiver[]} */ ([]);
		//The pending list of local tracks not assigned to transceivers
		this.pending = /** @type {Set<{ stream: import("./OutgoingStream"), track: import("./OutgoingStreamTrack") }>} */ (new Set());
		//Set of removed local tracks
		this.removed = /** @type {Set<import("./OutgoingStreamTrack")>} */ (new Set());
		
		//Renegotiation needed flag
		this.renegotiationNeeded = false;
		
	}
	
	
	/** @override */
	createLocalDescription()
	{
		//If there is no local info
		if (!this.localInfo)
		{
			//Create initial with 
			this.localInfo = SDPInfo.create({
				dtls		: new DTLSInfo(Setup.ACTPASS,"sha-256",this.endpoint.getDTLSFingerprint()),
				ice		: ICEInfo.generate(true),
				candidates	: this.endpoint.getLocalCandidates()
			});
			//For each media capability
			for (const media of /** @type {SemanticSDP.MediaType[]} */ (Object.keys(this.capabilities)))
			{
				//New mid
				const mid = String(this.transceivers.length);
				//Create new transceiver
				/** @type {Transceiver} */
				const transceiver = {
					mid	: mid,
					media	: media,
					remote	: {},
					local	: {}
				};
				//Create new local media info
				const mediaInfo = transceiver.local.info = MediaInfo.create(media,this.capabilities[media]);
				//Set mid
				mediaInfo.setId(mid);
				//Add to local info
				this.localInfo.addMedia(mediaInfo);
				//Add new transceiver
				this.transceivers.push(transceiver);
			}
		}
		
		//First process all removed tracks
		for (const track of this.removed)
			//Check the transceivers
			for (const transceiver of this.transceivers)
				//Was it removed?
				if (transceiver.local.track == track)
				{
					//Clean transceiver
					delete(transceiver.local.track);
					delete(transceiver.local.stream);
					//Clean from removed
					this.removed.delete(track);
				}
		
		//Check if we can add new transceicers
		if (this.state === 'initial' || this.state === 'stable')
		{
			//For all pending transceivers
			for (const pending of this.pending)
			{
				//TODO: Check if we can reuse any empty 
				/*
				 let found = false;
				 
				for (const transceiver of this.transceivers)
				{
					 //Check new direction for local stuff
					switch(mediaInfo.getDirection())
					{
						case Direction.INACTIVE:
						case Direction.SENDONLY:
							//If we had one track on this
							if (transceiver.local.track)
								//Stop it
								transceiver.local.track.stop();
							//Delete it from transceiver
							delete (transceiver.local.track);
							break;
						case Direction.SENDRECV:
						case Direction.RECVONLY:
							//if we don't have a track and we had pending for adding
							if (!transceiver.local.track && this.pending.size)
							{
								//Get first one and remove it
								const first = this.pending.values().next();
								//Add it to the localInfo
								transceiver.local.track  = first.track;
								transceiver.local.stream = first.stream;
								//Remove from set
								this.pending.delete(first);
							}
							break;
					}
				}
				if (!found).. the following
				*/
				
				//New mid
				const mid = String(this.transceivers.length);
				//Get media type
				const media = pending.track.getMedia();
				//Add new transceiver
				this.transceivers.push({
					mid	: mid,
					media	: media,
					remote	: {},
					local	: {
						track	: pending.track,
						stream	: pending.stream
					}
				});
				
			}
			//Clear pending
			this.pending.clear();
		}
		
		//Clean all stream stuff
		this.localInfo.removeAllStreams();
		
		//Check the transceivers
		for (const transceiver of this.transceivers)
		{
			//Get associated media info
			let mediaInfo = this.localInfo.getMediaById(transceiver.mid);
			//If we are sending on this transceiver
			if (transceiver.local.track)
			{
				//If there was none
				if (!mediaInfo)
				{
					//Clone first media of type
					mediaInfo = this.localInfo.getMedia(transceiver.media).clone();
					//Set mid
					mediaInfo.setId(transceiver.mid);
					//Add to local info
					this.localInfo.addMedia(mediaInfo);
				} 
				//Check if we have a remote track for this
				if (transceiver.remote.track)
					//Send and receive
					mediaInfo.setDirection(Direction.SENDRECV);
				else
					//Receive only
					mediaInfo.setDirection(Direction.SENDONLY);
				//Get stream info
				const id = transceiver.local.stream.getId();
				let streamInfo = this.localInfo.getStream(id);
				//If not present yet
				if (!streamInfo)
					//Create new info
					streamInfo = new StreamInfo(id);
				//Add stream to media
				this.localInfo.addStream(streamInfo);
				//Get info
				const trackInfo = transceiver.local.track.getTrackInfo();
				//Set media id
				trackInfo.setMediaId(transceiver.mid);
				//Add to stream
				streamInfo.addTrack(trackInfo);
			} else {
				//Check if we have a remote track for this
				if (transceiver.remote.track)
					//Receving
					mediaInfo.setDirection(Direction.RECVONLY);
				else
					//Inactive
					mediaInfo.setDirection(Direction.INACTIVE);
			}
			//Set lotal info
			transceiver.local.info = mediaInfo;
		}
		
		//Modify status
		switch (this.state)
		{
			case "initial":
			case "stable":
				//This is an offer
				this.state = "local-offer";
				break;
			case "remote-offer":
				this.state = "stable";
				break;
		}
		
		//If there re still pending
		if (this.pending.size || this.removed.size)
			//Renegotiate again
			this.renegotiate();
		
		//Return sdp
		return this.localInfo.toString();
	}
	
	renegotiate() 
	{
		//Check if we already need to renegotiate
		if (!this.renegotiationNeeded && (this.state === 'initial' || this.state === 'stable'))
		{
			//Set flag
			this.renegotiationNeeded = true;
			//On next tick
			setTimeout(()=>{
				//Clean flag
				this.renegotiationNeeded = false;
				//Emit event
				this.emit("renegotiationneeded",this.transport);
			},0);
		}
	}
	
	/** @override */
	processRemoteDescription(/** @type {string} */ sdp)
	{
		//Parse sdp
		this.remoteInfo = SDPInfo.parse(sdp);
		
		//Processing remote sdp
		this.processing = true;
		
		//If no transport
		if (!this.transport)
		{
			//Ceate new one
			this.transport = this.endpoint.createTransport(this.remoteInfo,this.localInfo);
			//If it was an offer
			if (!this.localInfo)
				//Answer it
				this.localInfo = this.remoteInfo.answer({
					dtls		: this.transport.getLocalDTLSInfo(),
					ice		: this.transport.getLocalICEInfo(),
					candidates	: this.endpoint.getLocalCandidates(),
					capabilities	: this.capabilities
				});
			//Set RTP local properties
			this.transport.setLocalProperties(this.localInfo);
			//Set RTP remote properties
			this.transport.setRemoteProperties(this.remoteInfo);
			
			//Set event listeners
			this.transport.on("outgoingtrack",(track,stream)=>{
				//Add to pending
				this.pending.add({
					stream : stream,
					track  : track,
				});

				//Listen for events
				track.once("stopped", ()=>{
					//remove track and stream
					this.removed.add(track);
					//If not processing remote SDP
					if (!this.processing)
						//Renegotiate
						this.renegotiate();
				});
				//If not processing remote SDP
				if (!this.processing)
					//Renegotiate
					this.renegotiate();
			});
			
			// Emit event
			this.emit("transport",this.transport);
		}
		
		//If we need to anwser
		if (this.state!="local-offer")
			//Answer it
			this.localInfo = this.remoteInfo.answer({
				dtls		: this.transport.getLocalDTLSInfo(),
				ice		: this.transport.getLocalICEInfo(),
				candidates	: this.endpoint.getLocalCandidates(),
				capabilities	: this.capabilities
			});
		
		//Get all medias
		const medias = this.remoteInfo.getMedias();
		//Transceiver iterator
		let i = 0;
		//For each media
		for (const mediaInfo of this.remoteInfo.getMedias())
		{
			//Get mid
			const mid = mediaInfo.getId();
			//Get media type
			const media = mediaInfo.getType();
			//Get stream info
			const streamInfo = this.remoteInfo.getStreamByMediaId(mid);
			//Get associated track
			const trackInfo = this.remoteInfo.getTrackByMediaId(mid);
			//Get stream
			let stream = streamInfo ? this.transport.getIncomingStream(streamInfo.getId()) : undefined;
			//Get track
			let track = stream && trackInfo ? stream.getTrack(trackInfo.getId()) : undefined;
			//Get transceiver
			let transceiver = this.transceivers[i];
			//If there is a transceiver
			if (!transceiver)
				//Crete new one
				transceiver = this.transceivers[i] = {
					mid	: mid,
					media	: media,
					remote	: {
						info		: mediaInfo,
					},
					local	: {
						info		:  mediaInfo.answer(this.capabilities[media]),
					}
				};
			else
				//Update media info
				transceiver.remote.info = mediaInfo;
			//Next transceiver
			i++;
			//If we had a remote track they are different
			if (transceiver.remote.track && transceiver.remote.track!=track)
			{
				//Stop it
				transceiver.remote.track.stop();
				//Delete it from transceiver
				delete (transceiver.remote.track);
			}
			//Check new direction for remote stuff
			switch(mediaInfo.getDirection())
			{
				case Direction.SENDRECV:
				case Direction.SENDONLY:
					//If we don't have stream
					if (!stream)
					{
						//Create new one
						stream = this.transport.createIncomingStream(streamInfo);
						//Get the track
						track = stream.getTrack(trackInfo.getId());
					//If we don't have a track already
					} else if (!track && trackInfo) {
						//Create new trck on the stream
						track = stream.createTrack(trackInfo);
					}
					//Store track and stream info
					transceiver.remote.streamId	= stream.getId();
					transceiver.remote.track	= track;
					break;
				case Direction.RECVONLY:
				case Direction.INACTIVE:
					//if we had track
					if (track)
						//Stop it
						track.stop();
					//Delete it from transceiver
					delete (transceiver.remote.track);
					break;
			}
			
			//Update remote info
			transceiver.remote.info = mediaInfo;
		}
		
		//Modify status
		switch (this.state)
		{
			case "initial":
			case "stable":
				//This is an offer
				this.state = "remote-offer";
				break;
			case "local-offer":
				this.state = "stable";
				break;
		}
		
		//Not processint SDP anymore
		this.processing = false;
		
		//If there re still pending
		if (this.pending.size || this.removed.size)
			//Renegotiate again
			this.renegotiate();
		
		//Return sdp
		return this.remoteInfo.toString();
	}
	
	/** @override */
	stop()
	{
		//Stop transport
		if (this.transport)
			this.transport.stop();

		//Stop SDPManager
		super.stop();
		
		//Free it
		this.transport = null;
		//@ts-expect-error
		this.endpoint = null;
	}
}

module.exports = SDPManagerUnified;
