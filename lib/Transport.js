const Native		= require("./Native");
const EventEmitter	= require('events').EventEmitter;
const LFSR		= require('lfsr');
const uuidV4		= require('uuid/v4');

const SemanticSDP	= require("semantic-sdp");
const IncomingStream	= require("./IncomingStream");
const OutgoingStream	= require("./OutgoingStream");

const IncomingStreamTrack = require("./IncomingStreamTrack");
const OutgoingStreamTrack = require("./OutgoingStreamTrack");

const SDPInfo		= SemanticSDP.SDPInfo;
const Setup		= SemanticSDP.Setup;
const MediaInfo		= SemanticSDP.MediaInfo;
const CandidateInfo	= SemanticSDP.CandidateInfo;
const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;
const SourceGroupInfo	= SemanticSDP.SourceGroupInfo;

const Utils		= require("./Utils");

let maxId = 0;

/**
 * A transport represent a connection between a local ICE candidate and a remote set of ICE candidates over a single DTLS session.
 * The transport object will internally allocate the ICE and DTLS information of the local side in order to singal it to the remote side and establish the connection.
 * Each transport has a set of incoming and outgoing streams that allow to send or receive RTP streams to the remote peer. 
 * You must create the incoming streams as signaled on the remote SDP as any incoming RTP with an unknown ssrc will be ignored. 
 * When you create an outgoing stream, the transport will allocate internally the ssrcs for the different RTP streams in order to avoid collision. You will be able to retrieve that information from the streams object in order to be able to announce them on the SDP sent to the remote side.
 * In order to decide how to route your streams you must attach the outgoing streams from one transport to the incoming streams of other (or same) transport.
 */
class Transport
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(bundle, remote, local, options)
	{
		//Ensure we have ice and dtls on remote
		if (!remote || !remote.ice || !remote.dtls)
			//Throw errror
			throw new Error("You must provide remote ice and dtls info");
		
		//Store remote properties
		this.remote = remote;
		
		//Create local info
		this.local = local;
		
		//Create new native properties object
		let properties = new Native.PropertiesFacade();

		//Put ice properties
		properties.SetProperty("ice.localUsername"	, this.local.ice.getUfrag());
		properties.SetProperty("ice.localPassword"	, this.local.ice.getPwd());
		properties.SetProperty("ice.remoteUsername"	, this.remote.ice.getUfrag());
		properties.SetProperty("ice.remotePassword"	, this.remote.ice.getPwd());

		//Put remote dtls properties
		properties.SetProperty("dtls.setup"		, Setup.toString(remote.dtls.getSetup()));
		properties.SetProperty("dtls.hash"		, remote.dtls.getHash());
		properties.SetProperty("dtls.fingerprint"	, remote.dtls.getFingerprint());
		
		//Put other options
		properties.SetProperty("disableSTUNKeepAlive"	, options.disableSTUNKeepAlive);
		properties.SetProperty("srtpProtectionProfiles"	, options.srtpProtectionProfiles);
		
		//Create username
		this.username = new Native.StringFacade(this.local.ice.ufrag + ":" + this.remote.ice.ufrag);
		
		//Store bundle
		this.bundle = bundle;
		//Create native transport
		this.transport = bundle.AddICETransport(this.username,properties);
		
		//Event listener for sender side estimator
		this.ontargetbitrate = (bitrate)  => {
			/**
			* Transport sender side estimation bitrate target udpate
			*
			* @name targetbitrate
			* @memberof Transport
			* @kind event
			* @argument {Integer} bitrate
			* @argument {Transport} transport
			*/
			this.emitter.emit("targetbitrate",bitrate, this);
		};
		//Create native listener
		this.senderSideListener = new Native.SenderSideEstimatorListener(this);
		//Attach to transport
		this.transport.SetSenderSideEstimatorListener(this.senderSideListener);
		//If no transport
		if (!this.transport)
			//error
			throw new Error("Could not create native transport");
		
		//For each remote candidate
		for (let i=0;this.remote.candidates && i<this.remote.candidates.length;++i)
		{
			let ip,port;
			//Get candidate
			const candidate = this.remote.candidates[i];
			
			//If it is a relay candidate
			if ("relay"===candidate.getType())
			{
				//Get relay ip and port
				ip   = candidate.getRelAddr();
				port = candidate.getRelPort();
			} else {
				//Get ip and port
				ip   = candidate.getAddress();
				port = candidate.getPort();
			}
			//Create new candidate on bundle for this transport
			this.bundle.AddRemoteCandidate(this.username, ip, port);
		}
		
		//List of streams
		this.incomingStreams = new Map();
		this.outgoingStreams = new Map();
		//LIst of tracks
		this.incomingStreamTracks = new Map();
		this.outgoingStreamTracks = new Map();
		
		//Create new sequence generator
		this.lfsr = new LFSR();
		
		//Create event emitter
		this.emitter = new EventEmitter();
	}
	
	/**
	 * Dump incoming and outgoint rtp and rtcp packets into a pcap file
	 * @param {String} filename - Filename of the pcap file
	 * @param {Object} options  - Dump parameters (optional)
	 * @param {Boolean} options.incomoning   - Dump incomoning RTP data
	 * @param {Boolean} options.outbound  - Dump outgoing RTP data
	 * @param {Boolean} options.rtcp      - Dump rtcp RTP data
	 */
	dump(filename,options) 
	{
		//Get what do we want to dump
		const incoming = options ? Boolean(options.incoming) : true;
		const outgoing	 = options ? Boolean(options.outgoing) : true;
		const rtcp	 = options ? Boolean(options.rtcp) : true;
		
		//Start dumping
		if (!this.transport.Dump(filename, incoming, outgoing, rtcp))
			throw new Error("Could no dump to pcap file");
	}
	
	/**
	 * Enable bitrate probing.
	 * This will send padding only RTX packets to allow bandwidth estimation algortithm to probe bitrate beyonf current sent values.
	 * The ammoung of probing bitrate would be limited by the sender bitrate estimation and the limit set on the setMaxProbing Bitrate.
	 * Note that this will only work on browsers that supports RTX and transport wide cc.
	 * @param {Boolen} probe
	 */
	setBandwidthProbing(probe)
	{
		//Set it
		this.transport.SetBandwidthProbing(Boolean(probe));
	}
	
	/**
	 * Set the maximum bitrate to be used if probing is enabled.
	 * @param {Number} bitrate
	 */
	setMaxProbingBitrate(bitrate)
	{
		//Set value
		this.transport.SetMaxProbingBitrate(bitrate);
	}
	
	/**
	 * Set local RTP properties 
	 * @param {Object|SDPInfo} rtp - Object param containing media information for audio and video
	 * @param {MediaInfo} rtp.audio	- Audio media info
	 * @param {MediaInfo} rtp.video	- Video media info
	 */
	setLocalProperties(rtp)
	{
		//Get native properties
		let properties = Utils.convertRTPProperties(rtp.constructor.name ==="SDPInfo" ? {
				"audio" : rtp.getMedia("audio"),
				"video" : rtp.getMedia("video")
			} : rtp);
		//Set it
		this.transport.SetLocalProperties(properties);
	}
	
	/**
	 * Set remote RTP properties 
	 * @param {Object|SDPInfo} rtp - Object param containing media information for audio and video
	 * @param {MediaInfo} rtp.audio	- Audio media info
	 * @param {MediaInfo} rtp.video	- Video media info
	 */
	setRemoteProperties(rtp)
	{
		//Get native properties
		let properties = Utils.convertRTPProperties(rtp.constructor.name ==="SDPInfo" ? {
				"audio" : rtp.getMedia("audio"),
				"video" : rtp.getMedia("video")
			} : rtp);
		//Set it
		this.transport.SetRemoteProperties(properties);
	}
	
	/**
	 * Add event listener
	 * @param {String} event	- Event name 
	 * @param {function} listeener	- Event listener
	 * @returns {Transport} 
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
	 * @returns {Transport} 
	 */
	off() 
	{
		//Delegate event listeners to event emitter
		this.emitter.removeListener.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Get transport local DTLS info
	 * @returns {DTLSInfo} DTLS info object
	 */
	getLocalDTLSInfo()
	{
		return this.local.dtls;
	}
	
	/**
	 * Get transport local ICE info
	 * @returns {ICEInfo} ICE info object
	 */
	getLocalICEInfo()
	{
		return this.local.ice;
	}
	
	/**
	 * Get local ICE candidates for this transport
	 * @returns {Array.CandidateInfo}
	 */
	getLocalCandidates() 
	{
		//Return local host candiadate as array
		return this.local.candidates;
	}
	
	/**
	 * Get remote ICE candidates for this transport
	 * @returns {Array.CandidateInfo}
	 */
	getRemoteCandidates() 
	{
		//Return local host candiadate as array
		return this.remote.candidates;
	}

	/**
	 * Register a remote candidate info. Only needed for ice-lite to ice-lite endpoints
	 * @param {CandidateInfo} candidate
	 * @returns {boolean} Wheter the remote ice candidate was alrady presnet or not
	 */
	addRemoteCandidate(candidate) 
	{
		let ip,port;
		
		//If it is a relay candidate
		if ("relay"===candidate.getType())
		{
			//Get relay ip and port
			ip   = candidate.getRelAddr();
			port = candidate.getRelPort();
		} else {
			//Get ip and port
			ip   = candidate.getAddress();
			port = candidate.getPort();
		}
		//Create new candidate on bundle for this transport
		if (!this.bundle.AddRemoteCandidate(this.username, ip, port))
			//Already present
			return false;
		
		//Add candidate to remote ones
		this.remote.candidates.push(candidate.clone());
		//Ok
		return true;
		
	}
	
	/**
	 * Register an array remote candidate info. Only needed for ice-lite to ice-lite endpoints
	 * @param {Array.CandidateInfo} candidates
	 */
	addRemoteCandidates(candidates)
	{
		//For each
		for (let i=0;i<candidates.length;++i)
			//Add candidate
			this.addRemoteCandidate(candidates[i]);
	}
	
	/**
	 * Create new outgoing stream in this transport
	 * @param {Object|StreamInfo|String} params Params plain object, StreamInfo object or stream id
	 * @param {Array<Object>|Object|boolean} params.audio	- Add audio track to the new stream
	 * @param {Object?} params.id	- Stream id, an UUID will be generated if not provided
	 * @param {Object?} params.audio.id	- Stream track id (default: "audio")
	 * @param {Number?} params.audio.ssrcs	- Override the generated ssrcs for this track
	 * @param {Number?} params.audio.ssrcs.media - ssrc for the audio track
	 * @param {Array<Object>|Object|boolean} params.video	- Add video track to the new stream
	 * @param {Object?} params.video.id	- Stream track id (default: "video")
	 * @param {Object?} params.video.ssrcs	- Override the generated ssrcs for this track
	 * @param {Number?} params.video.ssrcs.media	- ssrc for the video track
	 * @param {Number?} params.video.ssrcs.rtx 	- ssrc for the rtx video track
	 * @param {Number?} params.video.ssrcs.fec	- ssrc for the fec video track
	 * @returns {OutgoingStream} The new outgoing stream
	 */
	createOutgoingStream(params) 
	{
		let info;
		//Generate the stream info from paramss
		if (params.constructor.name === "StreamInfo")
		{
			//Clone it
			info = params.clone();
		} else if (typeof params === 'string') {
			//Param is the media id
			info = new StreamInfo(params);
		} else if (params && params.id )  {
			//Use providede one
			info = new StreamInfo(params.id);
		} else {
			//Generate ramdon
			info = new StreamInfo(uuidV4());
		}
		
		//If we have audio
		if (params.audio)
		{
			//Check if it is an array
			const audios = Array.isArray(params.audio) ? params.audio : [params.audio];
			
			//For each audio
			for (let i=0; i<audios.length; ++i)
			{
				//Get audio info
				const audio = audios[i];
				//Crete new track
				let track = new TrackInfo("audio", audio.id || ("audio" + (maxId++)));
				//Generte new ssrc
				let ssrc = audio.ssrcs ? audio.ssrcs.media : this.lfsr.seq(31);
				//Add to track
				track.addSSRC(ssrc);
				//Add track to stream
				info.addTrack(track);
			}
		}
		//If we have video
		if (params.video)
		{
			//Check if it is an array
			const videos = Array.isArray(params.video) ? params.video : [params.video];
			
			//For each audio
			for (let i=0; i<videos.length; ++i)
			{
				//Get video info
				const video = videos[i];
				//Crete new track
				let track = new TrackInfo("video", video.id || ("video" + (maxId++)));
				//Generte new ssrc
				let ssrc = video.ssrcs ? video.ssrcs.media : this.lfsr.seq(31);
				let rtx  = video.ssrcs ? video.ssrcs.rtx   : this.lfsr.seq(31);
				let fec  = video.ssrcs ? video.ssrcs.fec   : this.lfsr.seq(31);

				//Add main ssrc to track
				track.addSSRC(ssrc);
				//Handle rtx
				if (rtx)
				{
					//Add ssrc and group
					track.addSSRC(rtx);
					track.addSourceGroup (new SourceGroupInfo("FID",[ssrc,rtx]));
				}
				//Handle fec
				if (fec) 
				{
					//Add ssrc and group
					track.addSSRC(fec);
					track.addSourceGroup (new SourceGroupInfo("FEC-FR",[ssrc,fec]));
				}
				//Add track to stream
				info.addTrack(track);
			}
		}
		
		//Create it
		const outgoingStream = new OutgoingStream(this.transport,this.lfsr,info);
		
		//Add listener
		outgoingStream.once("stopped",() => {
			//Remove it
			this.outgoingStreams.delete(outgoingStream.getId());
		});
		
		//Add to list
		this.outgoingStreams.set(outgoingStream.getId(),outgoingStream);
		
		//Add new track listener
		outgoingStream.on("track",(track) => {
			//Emit event
			this.emitter.emit("outgoingtrack",track,outgoingStream);
		});
		
		//For each track
		for (const track of outgoingStream.getTracks())
			//Emit evenet
			this.emitter.emit("outgoingtrack",track,outgoingStream);
			
		//Return it
		return outgoingStream;
	}
	
	/**
	 * Create new outgoing stream in this transport
	 * @param {String}  media		- Track media type "audio" or "video"
	 * @param {Object?} params		- Track parameters
	 * @param {Object?} params.id		- Stream track id
	 * @param {Number?} params.ssrcs	- Override the generated ssrcs for this track
	 * @param {Number?} params.ssrcs.media	- ssrc for the media track
	 * @param {Number?} params.ssrcs.rtx 	- ssrc for the rtx track
	 * @param {Number?} params.ssrcs.fec	- ssrc for the fec track
	 * @returns {OutgoingStreamTrack} The new outgoing stream track
	 */
	createOutgoingStreamTrack(media, params)
	{
		const opts = params || {};
	
		//Get media type and id
		const type = (media==="audio") ? 0 : 1;
		const id   = opts.id || (media + (maxId++));
		
		//Create incoming track
		const source = new Native.RTPOutgoingSourceGroup(type);

		//Set source ssrcs
		source.media.ssrc	= opts.ssrcs ? opts.ssrcs.media : this.lfsr.seq(31);
		source.rtx.ssrc		= opts.ssrcs ? opts.ssrcs.rtx   : this.lfsr.seq(31);
		source.fec.ssrc		= opts.ssrcs ? opts.ssrcs.fec   : this.lfsr.seq(31);

		//Add it to transport
		if (!this.transport.AddOutgoingSourceGroup(source))
			//Launch exception
			throw new Error("Could not add incoming source group to native transport");
			
		//Create new track
		const outgoingStreamTrack = new OutgoingStreamTrack(media,id,Native.TransportToSender(this.transport),source);

		//Add listener
		outgoingStreamTrack.once("stopped",()=>{
			//Remove from transport
			this.transport.RemoveOutgoingSourceGroup(source);
			//Remove from tracks
			this.outgoingStreamTracks.delete(outgoingStreamTrack.getId());
		});
		
		//Add to the track list
		this.outgoingStreamTracks.set(outgoingStreamTrack.getId(),outgoingStreamTrack);
		
		/**
		* New outgoing stream track added to transport
		*
		* @name outgoingtrack
		* @memberof Transport
		* @kind event
		* @argument {OutgoingStreamTrack} track
		* @argument {OutgoingStream?} stream
		*/
		this.emitter.emit("outgoingtrack",outgoingStreamTrack,null);
			
		//Return it
		return outgoingStreamTrack;
	}
	
	/**
	 * Create an incoming stream object from the media stream info objet
	 * @param {StreamInfo|Object} info Contains the ids and ssrcs of the stream to be created
	 * @returns {IncomingStream} The newly created incoming stream object
	 */
	createIncomingStream(info)
	{
		//We have to add the incmoing source for this stream
		let incomingStream = new IncomingStream(this.transport,Native.TransportToReceiver(this.transport),info);
		
		//Add to list
		this.incomingStreams.set(incomingStream.getId(),incomingStream);
		
		//Add new track listener
		incomingStream.on("track",(track) => {
			//Emit evetn
			this.emitter.emit("incomingtrack",track,incomingStream);
		});
		
		//Add stream stoplistener
		incomingStream.once("stopped",() => {
			//Remove it
			this.incomingStreams.delete(incomingStream.getId());
		});
		
		//For each track
		for (const track of incomingStream.getTracks())
			//Emit event
			this.emitter.emit("incomingtrack",track,incomingStream);
			
		//Return it
		return incomingStream;
	}
	
	
	/**
	 * Get all the incoming streams in the transport
	 * @returns {Array<IncomingStreams>}
	 */
	getIncomingStreams()
	{
		return Array.from(this.incomingStreams.values());
	}
	
	/**
	 * Get incoming stream
	 * @param {String} streamId the stream ID
	 * @returns {IncomingStream}
	 */
	getIncomingStream(streamId)
	{
		//Return it
		return this.incomingStreams.get(streamId);
	}
	
	/**
	 * Get all the outgoing streams in the transport
	 * @returns {Array<OutgoingStreams>}
	 */
	getOutgoingStreams()
	{
		return Array.from(this.outgoingStreams.values());
	}
	
	/**
	 * Get incoming stream
	 * @param {String} streamId the stream ID
	 * @returns {IncomingStream}
	 */
	getOutgoingStream(streamId)
	{
		//Return it
		return this.outgoingStreams.get(streamId);
	}
	
	/**
	 * Create new incoming stream in this transport. TODO: Simulcast is still not supported
	 * @param {String}  media		- Track media type "audio" or "video"
	 * @param {Object?} params		- Track parameters
	 * @param {Object?} params.id		- Stream track id
	 * @param {Number?} params.ssrcs	- Override the generated ssrcs for this track
	 * @param {Number?} params.ssrcs.media	- ssrc for the media track
	 * @param {Number?} params.ssrcs.rtx 	- ssrc for the rtx track
	 * @param {Number?} params.ssrcs.fec	- ssrc for the fec track
	 * @returns {IncomingStreamTrack} The new incoming stream track
	 */
	createIncomingStreamTrack(media, params)
	{
		const opts = params || {};
	
		//Get media type and id
		const type = (media==="audio") ? 0 : 1;
		const id   = opts.id || (media + (maxId++));
		
		//Create incoming track
		const source = new Native.RTPIncomingSourceGroup(type,this.transport.GetTimeService());

		//Set source ssrcs
		source.media.ssrc	= opts.ssrcs ? opts.ssrcs.media : this.lfsr.seq(31);
		source.rtx.ssrc		= opts.ssrcs ? opts.ssrcs.rtx   : this.lfsr.seq(31);
		source.fec.ssrc		= opts.ssrcs ? opts.ssrcs.fec   : this.lfsr.seq(31);

		//Add it to transport
		if (!this.transport.AddIncomingSourceGroup(source))
			//Launch exception
			throw new Error("Could not add incoming source group to native transport");
		
		//Create source arrayu
		const sources = [source];

		//Create new track
		const incomingStreamTrack = new IncomingStreamTrack(media,id,Native.TransportToReceiver(this.transport),sources);

		//Add listener
		incomingStreamTrack.once("stopped",()=>{
			//For each source
			for (let id of Object.keys(sources))
				//Remove source group
				this.RemoveIncomingSourceGroup(sources[id]);
			//Remove from tracks
			this.incomingStreamTracks.delete(incomingStreamTrack.getId());
		});
		
		//Add to the track list
		this.incomingStreamTracks.set(incomingStreamTrack.getId(),incomingStreamTrack);
		
		/**
		* New incoming stream track added to transport
		*
		* @name incomingtrack
		* @memberof Transport
		* @kind event
		* @argument {IncomingStreamTrack} track
		* @argument {IncomingStream} stream 
		*/
		this.emitter.emit("incomingtrack",incomingStreamTrack,null);
			
		//Return it
		return incomingStreamTrack;
	}
	
	/**
	 * Create new outgoing stream and attach to the incoming stream
	 * @param {IncomingStream} incomingStream the incoming stream to be published in this transport
	 * @returns {OutgoingStream} The new outgoing stream
	 */
	publish(incomingStream) 
	{
		//Create new incoming stream
		let outgoingStream = this.createOutgoingStream ({
			audio: incomingStream.getAudioTracks().length,
			video: incomingStream.getVideoTracks().length
		});
		
		//Attach the streams
		outgoingStream.attachTo(incomingStream);
		
		//return the new created stream
		return outgoingStream;
	}
	
	/**
	 * Stop transport and all the associated incoming and outgoing streams
	 */
	stop()
	{
		//Don't call it twice
		if (!this.bundle) return;
		
		//Stop all streams
		for (let stream of this.incomingStreams.values())
			//stop
			stream.stop();
		//Stop all streams
		for (let stream of this.outgoingStreams.values())
			//stop
			stream.stop();
		//Clear maps jic
		this.incomingStreams.clear();
		this.outgoingStreams.clear();
		
		//Stop all tracks
		for (let track of this.incomingStreamTracks.values())
			//stopincomingStreamsTracks
			track.stop();
		//Stop all tracks
		for (let track of this.outgoingStreamTracks.values())
			//stop
			track.stop();
		//Clear maps jic
		this.incomingStreamTracks.clear();
		this.outgoingStreamTracks.clear();
		
		//Remove from bundle
		this.bundle.RemoveICETransport(this.username);
		
		//Stop listening for events, as they might have been queued
		this.ontargetbitrate = ()=>{};
		
		/**
		* Transport stopped event
		*
		* @name stopped
		* @memberof Transport
		* @kind event
		* @argument {Transport}  transport
		*/
		this.emitter.emit("stopped",this);
		
		//Remove transport reference, so destructor is called on GC
		this.username = null;
		this.transport = null;
		this.senderSideListener = null;
		this.bundle = null;
	}
}


module.exports = Transport;
