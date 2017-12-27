const native = require("../build/Release/medooze-media-server");
const EventEmitter	= require('events').EventEmitter;
const LFSR		= require('lfsr');
const uuidV4		= require('uuid/v4');

const SemanticSDP	= require("semantic-sdp");
const IncomingStream	= require("./IncomingStream");
const OutgoingStream	= require("./OutgoingStream");

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
		let properties = new native.PropertiesFacade();

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
		
		//Create username
		this.username = new native.StringFacade(this.local.ice.ufrag + ":" + this.remote.ice.ufrag);
		
		//Store bundle
		this.bundle = bundle;
		//Create native transport
		this.transport = bundle.AddICETransport(this.username,properties);
		
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
		
		//Create new sequence generator
		this.lfsr = new LFSR();
		
		//Create event emitter
		this.emitter = new EventEmitter();
	}
	
	/**
	 * Dump incoming and outgoint rtp and rtcp packets into a pcap file
	 * @param {String} filename Filename of the pcap file
	 */
	dump(filename) 
	{
		//Start dumping
		if (!this.transport.Dump(filename))
			throw new Error("Could no dump to pcap file");
	}
	
	/**
	 * Set local RTP properties 
	 * @param {Object} rtp		- Object param containing media information for audio and video
	 * @param {MediaInfo} rtp.audio	- Audio media info
	 * @param {MediaInfo} rtp.video	- Video media info
	 */
	setLocalProperties(rtp)
	{
		//Get native properties
		let properties = Utils.convertRTPProperties(rtp);
		//Set it
		this.transport.SetLocalProperties(properties);
	}
	
	/**
	 * Set remote RTP properties 
	 * @param {Object} rtp		- Object param containing media information for audio and video
	 * @param {MediaInfo} rtp.audio	- Audio media info
	 * @param {MediaInfo} rtp.video	- Video media info
	 */
	setRemoteProperties(rtp)
	{
		//Get native properties
		let properties = Utils.convertRTPProperties(rtp);
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
	 * @param {Object} params	
	 * @param {boolen} params.audio	- Add audio track to the new stream
	 * @param {boolen} params.video	- Add video track to the new stream
	 * @returns {OutgoingStream} The new outgoing stream
	 */
	createOutgoingStream(params) 
	{
		//The list of streams
		let info = new StreamInfo(uuidV4());
		
		//If we have audio
		if (params.audio)
		{
			//Crete new track
			let track = new TrackInfo("audio","audio" + (maxId++));
			//Generte new ssrc
			let ssrc =  this.lfsr.seq(31);

			//Add to track
			track.addSSRC(ssrc);
			//Add track to stream
			info.addTrack(track);
		}
		//If we have video
		if (params.video)
		{
			//Crete new track
			let track = new TrackInfo("video","video" + (maxId++));
			//Generte new ssrc
			let ssrc =  this.lfsr.seq(31);
			let rtx  =  this.lfsr.seq(31);
			let fec  =  this.lfsr.seq(31);
			//Add to track
			track.addSSRC(ssrc);
			track.addSSRC(rtx);
			track.addSSRC(fec);
			//Add groups
			track.addSourceGroup (new SourceGroupInfo("FID",[ssrc,rtx]));
			track.addSourceGroup (new SourceGroupInfo("FEC-FR",[ssrc,fec]));
			//Add track to stream
			info.addTrack(track);
		}
		//Create it
		let outgoingStream = new OutgoingStream(this.transport,info);
		
		//Add listener
		outgoingStream.on("stopped",() => {
			//Remove it
			this.outgoingStreams.delete(outgoingStream.getId());
		});
		
		//Add to list
		this.outgoingStreams.set(outgoingStream.getId(),outgoingStream);
			
		//Return it
		return outgoingStream;
	}
	
	/**
	 * Create an incoming stream object from the media stream info objet
	 * @param {StreamInfo} info Contains the ids and ssrcs of the stream to be created
	 * @returns {IncomingStream} The newly created incoming stream object
	 */
	createIncomingStream(info)
	{
		//We have to add the incmoing source for this stream
		let incomingStream = new IncomingStream(this.transport,info);
		
		//Add to list
		this.incomingStreams.set(incomingStream.getId(),incomingStream);
		
		//Add listener
		incomingStream.on("stopped",() => {
			//Remove it
			this.incomingStreams.delete(incomingStream.getId());
		});
			
		//Return it
		return incomingStream;
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
		
		//Remove from bundle
		this.bundle.RemoveICETransport(this.username);
		
		/**
		* Transport stopped event
		*
		* @event Transport#stopped
		* @type {object}
		*/
		this.emitter.emit("stopped");
		
		//Remove transport reference, so destructor is called on GC
		this.username = null;
		this.transport = null;
		this.bundle = null;
	}
}


module.exports = Transport;
