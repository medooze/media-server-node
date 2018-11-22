const SDPManager	= require("./SDPManager");

const SemanticSDP	= require("semantic-sdp");

const SDPInfo		= SemanticSDP.SDPInfo;
const Setup		= SemanticSDP.Setup;
const MediaInfo		= SemanticSDP.MediaInfo;
const CandidateInfo	= SemanticSDP.CandidateInfo;
const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;
const SourceGroupInfo	= SemanticSDP.SourceGroupInfo;
const Direction 	=	SemanticSDP.Direction;

class SDPManagerUnified extends SDPManager
{
	constructor(endpoint,capabilities)
	{
		//Init parent
		super();
		
		//Store params
		this.endpoint = endpoint;
		this.capabilities = capabilities;
		//The list of transceivers
		this.transceivers = [];
		//The pending list of local tracks not assigned to transceivers
		this.pending = [];
		//Set of removed local tracks
		this.removed = new Set();
		
		//Renegotiation needed flag
		this.renegotiationNeeded = false;
		
	}
	
	
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
			for (const media of Object.keys(this.capabilities))
			{
				//New mid
				const mid = this.transceivers.length;
				//Add new transceiver
				this.transceivers.push({
					mid	: mid,
					media	: media,
					remote	: {},
					local	: {}
				});
				//Create new media info
				const mediaInfo = MediaInfo.create(media,this.capabilities[media]);
				//Set mid
				mediaInfo.setId(mid);
				//Add to local info
				this.localInfo.addMedia(mediaInfo);
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
		if (this.state in ["initial","stable"])
		{
			//For all pending transceivers
			for (const pending of this.pending)
			{
				//New mid
				const mid = this.transceivers.length;
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
				//TODO: Check if we can reuse any empty 
				//Create new media info
				const mediaInfo = MediaInfo.create(media,this.capabilities[media]);
				//Set mid
				mediaInfo.setId(mid);
				//Add to local info
				this.localInfo.addMedia(mediaInfo);
			}
			//Clear pending
			this.pending = [];
		}
		
		//Clean all stream stuff
		this.localInfo.removeAllStreams();
		
		//Check the transceivers
		for (const transceiver of this.transceivers)
		{
			//If we are sending on this transceiver
			if (transceiver.local.track)
			{
				//Get stream info
				let streamInfo = this.localInfo.getStream(pending.stream.getId());
				//If not present yet
				if (!streamInfo)
				{
					//Create new info
					streamInfo = new StreamInfo(pending.stream.getId());
					//Append to sdp
					this.localInfo.addStream(streamInfo);
				}
				//Get info
				const trackInfo = track.getTrackInfo();
				//Set media id
				trackInfo.setMediaId(mid);
			}
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
		//Return sdp
		return this.localInfo.toString();
	}
	
	processRemoteDescription(sdp)
	{
		//Renegotiate
		const renegotiate = () => {
			//Check if we already need to renegotiate
			if (!this.renegotiationNeeded && ["initial","stable"].includes(this.state))
				//Set flag
				this.renegotiationNeeded = true;
				//On next tick
				setTimeout(()=>{
					//Clean flag
					this.renegotiationNeeded = false;
					//Emit event
					this.emitter.emit("renegotiationneeded",this.transport);
				},0);
		};
		
		//Parse sdp
		this.remoteInfo = SDPInfo.parse(sdp);
		
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
				this.pending.push({
					stream : stream,
					track  : track,
				});

				//Listen for events
				track.once("stopped", ()=>{
					//remove track and stream
					this.removed.add(track);
					//Renegotiate
					renegotiate();
				});

				//Renegotiate
				renegotiate();
			});
			
			/**
			* The transport is ready
			*
			* @event PeerConnectionServert#transport
			* @argument {Transport} transport An initialized transport
			* @type {object}
			*/
			this.emitter.emit("transport",this.transport);
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
			//Get stream info
			const streamInfo = this.remoteInfo.getStreamByMediaId(mid);
			//Get associated track
			const trackInfo = this.remoteInfo.getTrackByMediaId(mid);
			//Get stream
			let stream = streamInfo ? this.transport.getOutgoingStream(streamInfo.getId()) : null;
			//Get track
			let track = stream && trackInfo ? stream.getTrackById(trackInfo.getId()) : null;
			//Get transceiver
			let transceiver = this.transceivers[i];
			//If there is a transceiver
			if (!transceiver)
				//Crete new one
				transceiver = this.transceivers[i] = {
					mid	: mid,
					remote	: {
						info		: mediaInfo,
					},
					local	: {
						info		:  mediaInfo.answer(this.capabilities),
					}
				};
			//Next transceiver
			i++;
			
			//Check new direction for remote stuff
			switch(mediaInfo.getDirection())
			{
				case Direction.SENDRECV:
				case Direction.SENDONLY:
					//If we had one nd they are different
					if (transceiver.remote.track && transceiver.remote.track!=track)
						//Stop it
						transceiver.remote.track.stop();
					//If we don't have stream
					if (!stream) {
						//Create new one
						stream = this.transport.createIncomingStream(streamInfo);
					}
					//If we don't have a track already
					else if (!track && trackInfo) {
						//Create new one on the stream
						stream.createTrack(trackInfo);
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
					if (!transceiver.local.track && this.pending.length)
					{
						//Get first one and remove it
						const first = this.pending.shift();
						//Add it to the localInfo
						transceiver.local.track  = first.track;
						transceiver.local.stream = first.stream;
					}
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
		
		//Return sdp
		return this.remoteInfo.toString();
	}
}

module.exports = SDPManagerUnified;
